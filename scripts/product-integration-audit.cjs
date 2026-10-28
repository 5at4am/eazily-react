// Read-only inventory. Outputs counts/configuration, never customer records or keys.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.join(__dirname, '..');
function cli(args) {
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', args], {
    cwd: root, encoding: 'utf8', windowsHide: true, timeout: 60000,
  });
  if (result.status !== 0) throw new Error('Read-only Supabase inventory request failed.');
  return JSON.parse(result.stdout.slice(result.stdout.indexOf(result.stdout.trim().startsWith('[') ? '[' : '{')));
}
const sql = `select jsonb_build_object(
  'authUsers',(select count(*) from auth.users),
  'confirmedEmailUsers',(select count(*) from auth.users where email_confirmed_at is not null),
  'confirmedPhoneUsers',(select count(*) from auth.users where phone_confirmed_at is not null),
  'tables',(select jsonb_agg(jsonb_build_object('table',tablename,'rls',rowsecurity,'rows',
    ((xpath('/row/count/text()',query_to_xml(format('select count(*) as count from public.%I',tablename),false,true,'')))[1]::text)::bigint) order by tablename)
    from pg_tables where schemaname='public'),
  'buckets',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'public',public,'sizeLimit',file_size_limit)),'[]'::jsonb) from storage.buckets),
  'storedFiles',(select count(*) from storage.objects)
) as inventory;`;
fs.mkdirSync(path.join(root, '.tmp'), { recursive: true });
fs.writeFileSync(path.join(root, '.tmp/product-inventory.sql'), sql);
const projects = cli('supabase projects list --output json');
const inventory = [];
for (const project of projects) {
  if (!/^[a-z]{20}$/.test(project.id)) throw new Error('Unexpected project reference.');
  try {
    const result = cli(`supabase db query --linked --project-ref ${project.id} --file .tmp/product-inventory.sql`);
    inventory.push({ ref: project.id, name: project.name, linked: project.linked, createdAt: project.created_at, ...result.rows[0].inventory });
    const item = inventory.at(-1);
    console.log(JSON.stringify({ ref: item.ref, name: item.name, linked: item.linked, authUsers: item.authUsers,
      confirmedEmailUsers: item.confirmedEmailUsers, confirmedPhoneUsers: item.confirmedPhoneUsers,
      publicTables: item.tables?.length, tablesWithRows: item.tables?.filter(t => t.rows > 0),
      storedFiles: item.storedFiles, buckets: item.buckets }));
  } catch (error) { inventory.push({ ref: project.id, name: project.name, error: error.message }); console.log(`${project.id}: ${error.message}`); }
}
function refsIn(dir) {
  const refs = new Set();
  if (!fs.existsSync(dir)) return [];
  function walk(folder) {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (/\.(js|json|html)$/.test(entry.name)) {
        for (const match of fs.readFileSync(file, 'utf8').matchAll(/https:\/\/([a-z]{20})\.supabase\.co/g)) refs.add(match[1]);
      }
    }
  }
  walk(dir); return [...refs];
}
const bundles = { web: refsIn(path.join(root, 'dist')), android: refsIn(path.join(root, 'android/app/src/main/assets/public')) };
console.log(JSON.stringify({ bundleBackendReferences: bundles }));
fs.writeFileSync(path.join(root, '.tmp/product-integration-inventory.json'), JSON.stringify({ testedAt: new Date().toISOString(), projects: inventory, bundles }, null, 2));
if (inventory.some(p => p.error)) process.exitCode = 1;
