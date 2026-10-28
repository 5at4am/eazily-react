// Public read-only function check; no secrets or video titles are printed.
const fs = require('node:fs');
const path = require('node:path');
const env = {};
for (const line of fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8').split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '');
}
(async () => {
  const response = await fetch(new URL('/functions/v1/youtube-feed', env.VITE_SUPABASE_URL), {
    headers: { apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY }, signal: AbortSignal.timeout(20000),
  });
  const body = await response.json();
  console.log(JSON.stringify({ httpStatus: response.status, validVideos: Array.isArray(body.videos) ? body.videos.filter(video => /^[\w-]{11}$/.test(video.id)).length : 0, fallbackAvailable: true }));
  if (!response.ok || !body.videos?.length) process.exitCode = 1;
})().catch(() => { console.error('Public video feed request failed; the saved playlist remains available.'); process.exitCode = 1; });
