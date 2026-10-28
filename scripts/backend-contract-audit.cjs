// Read-only comparison of literal frontend RPC/table calls with hosted metadata.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.join(__dirname, '..');
const ref = fs.readFileSync(path.join(root, 'supabase/.temp/project-ref'), 'utf8').trim();
if (ref !== 'rujrweqttrqdmkkbamjt') throw new Error('Unexpected linked project.');
const calls = { functions: new Map(), tables: new Map() };
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(js|jsx)$/.test(entry.name)) {
      const source = fs.readFileSync(file, 'utf8');
      for (const match of source.matchAll(/\brpc\(\s*['"]([a-z0-9_]+)['"]/g)) calls.functions.set(match[1], path.relative(root, file));
      for (const match of source.matchAll(/(?:\.from|\breadRows)\(\s*['"]([a-z0-9_]+)['"]/g)) calls.tables.set(match[1], path.relative(root, file));
    }
  }
}
walk(path.join(root, 'src'));
const sql = "select jsonb_build_object('functions',(select jsonb_agg(distinct p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'),'tables',(select jsonb_agg(table_name) from information_schema.tables where table_schema='public'),'buckets',(select jsonb_agg(id) from storage.buckets)) as contract;";
const response = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `supabase db query --linked '${sql.replaceAll("'", "''")}'`], { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 30000 });
if (response.status !== 0) { console.error('Hosted metadata unavailable.'); process.exitCode = 1; }
else {
  const raw = response.stdout.slice(response.stdout.indexOf('{'));
  const contract = JSON.parse(raw).rows[0].contract;
  const missing = [];
  for (const [kind, references] of Object.entries(calls)) {
    const existing = new Set(kind === 'tables' ? [...contract.tables, ...contract.buckets] : contract.functions);
    for (const [name, file] of references) if (!existing.has(name)) missing.push({ kind, name, file });
  }
  console.log(JSON.stringify({ literalRpcsChecked: calls.functions.size, literalTablesOrBucketsChecked: calls.tables.size, missing }, null, 2));
  fs.mkdirSync(path.join(root, '.tmp'), { recursive: true });
  fs.writeFileSync(path.join(root, '.tmp/backend-contract-result.json'), JSON.stringify({ missing, testedAt: new Date().toISOString() }, null, 2));
  if (missing.length) process.exitCode = 1;
}
