/* Local PGlite regression only; applies the canonical manifest without network access. */
const { PGlite } = require('@electric-sql/pglite');
const { pgcrypto } = require('@electric-sql/pglite/contrib/pgcrypto');
const { readFileSync } = require('node:fs');
const { randomUUID } = require('node:crypto');
const assert = require('node:assert/strict');
const manifest = require('../supabase/migration-manifest.json');

(async () => {
  const db = new PGlite({ extensions: { pgcrypto } });
  const asUser = async id => {
    await db.exec('reset role');
    await db.query("select set_config('test.uid',$1,false)", [id]);
    await db.exec('set role authenticated');
  };
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create schema storage;
      create table auth.users(id uuid primary key, phone text, phone_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
      create function auth.role() returns text language sql stable as $$select current_user::text$$;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner_id text,metadata jsonb,created_at timestamptz default now());
      create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
      alter table storage.objects enable row level security;
      grant usage on schema auth,public,storage to anon,authenticated,service_role;
      grant all on storage.buckets,storage.objects to authenticated,service_role;
      alter default privileges in schema public grant all on tables to authenticated,anon;
      alter default privileges in schema public grant all on sequences to authenticated,anon;`);
    await db.exec(readFileSync('scripts/fixtures/supabase-rls-auto-enable.sql', 'utf8'));
    for (const entry of manifest.migrations.filter(item => item.file !== 'admin_capability_retirement.sql')) {
      await db.exec(readFileSync(`supabase/${entry.file}`, 'utf8').replace(/\r\n/g, '\n'));
    }

    const owner = randomUUID(), outsider = randomUUID(), admin = randomUUID();
    await db.query('insert into auth.users(id) values ($1),($2),($3)', [owner, outsider, admin]);
    await db.query("update profiles set role='admin' where id=$1", [admin]);
    const applicationId = randomUUID();
    await db.query(
      "insert into partner_applications(id,customer_id,role,status,details) values($1,$2,'influencer','submitted',$3)",
      [applicationId, owner, { creatorName: 'Test partner', platforms: [{ name: 'Instagram', count: 5000 }] }],
    );

    await asUser(owner);
    await assert.rejects(
      db.query("select admin_review_partner($1,'changes_required','Private review note')", [applicationId]),
      /Admin access required/,
      'Partner cannot perform an Admin review',
    );
    assert.equal(Number((await db.query('select count(*)::int as count from seller_notifications')).rows[0].count), 0);

    await asUser(admin);
    await db.query("select admin_review_partner($1,'changes_required','Private review note')", [applicationId]);
    await asUser(owner);
    let alerts = (await db.query('select * from seller_notifications where partner_application_id=$1', [applicationId])).rows;
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].account_id, owner);
    assert.equal(alerts[0].role, 'influencer');
    assert.equal(alerts[0].destination_type, 'application');
    assert.equal(alerts[0].order_id, null);
    assert.equal(alerts[0].title, 'Changes requested for your application');
    assert.ok(!alerts[0].title.includes('Private review note'), 'Notification does not duplicate the review note');

    await asUser(admin);
    await db.query("select admin_review_partner($1,'changes_required','Updated private note')", [applicationId]);
    await asUser(owner);
    assert.equal(Number((await db.query('select count(*)::int as count from seller_notifications where partner_application_id=$1', [applicationId])).rows[0].count), 1, 'Same-status edits do not duplicate alerts');

    await asUser(outsider);
    assert.equal(Number((await db.query('select count(*)::int as count from seller_notifications where partner_application_id=$1', [applicationId])).rows[0].count), 0, 'Unrelated account cannot read the alert');

    await asUser(owner);
    await db.query('select mark_seller_notifications_read($1)', [alerts[0].id]);
    assert.ok((await db.query('select read_at from seller_notifications where id=$1', [alerts[0].id])).rows[0].read_at, 'Owner can mark the alert read');
    assert.equal((await db.query('select review_notes from partner_applications where id=$1', [applicationId])).rows[0].review_notes, 'Updated private note', 'Full note remains on the application');

    await asUser(admin);
    await db.query("select admin_review_partner($1,'approved','Final note')", [applicationId]);
    await asUser(owner);
    alerts = (await db.query('select * from seller_notifications where partner_application_id=$1 order by created_at', [applicationId])).rows;
    assert.equal(alerts.length, 2, 'A real status transition creates a new alert');
    assert.equal(alerts[1].title, 'Partner application approved');

    await db.exec('reset role');
    await db.exec(readFileSync('supabase/admin_capability_retirement.sql', 'utf8'));
    await asUser(admin);
    const retiredAccess = (await db.query("select is_admin() as admin, has_staff_permission('partner.approve') as staff")).rows[0];
    assert.equal(retiredAccess.admin, false, 'Admin identity no longer grants Admin capability');
    assert.equal(retiredAccess.staff, false, 'Staff permission grants are disabled');
    await assert.rejects(
      db.query("select admin_review_partner($1,'approved','')", [applicationId]),
      /Admin access required/,
      'Admin review RPC remains inaccessible after capability retirement',
    );

    console.log('PASS review notifications and Admin/staff capability retirement authorization');
  } finally {
    await db.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
