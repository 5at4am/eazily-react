import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'supabase/migrations';
const files = readdirSync(dir).filter(f => f.endsWith('.sql'));
let changed = 0;

// Only strip a bare `begin;`/`commit;` that occupies its own line outside any
// dollar-quoted body, so plpgsql `begin ... end` blocks stay intact.
const strip = (sql) => {
  let out = '';
  let depth = 0;           // dollar-quote nesting
  let tag = null;
  let touched = false;
  const lines = sql.split(/\r?\n/);
  for (const line of lines) {
    for (const m of line.matchAll(/\$[a-zA-Z_]*\$/g)) {
      if (tag === null) { tag = m[0]; depth++; }
      else if (m[0] === tag) { depth--; if (depth === 0) tag = null; }
    }
    const standalone = /^\s*(begin|commit)\s*;\s*$/i.test(line);
    if (standalone && tag === null) { touched = true; continue; }
    out += line + '\n';
  }
  return { sql: out, touched };
};

for (const f of files) {
  const p = join(dir, f);
  const original = readFileSync(p, 'utf8');
  const { sql, touched } = strip(original);
  if (touched && sql !== original) {
    writeFileSync(p, sql);
    console.log(`normalised ${f}`);
    changed++;
  }
}
console.log(`\n${changed} of ${files.length} migration files normalised`);
