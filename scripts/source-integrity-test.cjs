// Compile the real app and every JSX test fixture without launching a browser.
const fs = require('node:fs');
const path = require('node:path');
const { build } = require('esbuild');
const root = path.join(__dirname, '..');
const fixtures = fs.readdirSync(__dirname).filter(file => file.endsWith('.jsx')).map(file => `scripts/${file}`);
(async () => {
  const result = await build({ absWorkingDir: root, entryPoints: ['src/main.jsx', ...fixtures],
    bundle: true, write: false, outdir: '.tmp/source-integrity', format: 'esm', jsx: 'automatic',
    loader: { '.css': 'empty', '.png': 'file', '.svg': 'file', '.jpg': 'file', '.webp': 'file' },
    define: { 'import.meta.env': '{}' }, metafile: true, logLevel: 'silent' });
  console.log(`PASS: application and ${fixtures.length} JSX fixtures resolve and compile (${Object.keys(result.metafile.inputs).length} inputs).`);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
