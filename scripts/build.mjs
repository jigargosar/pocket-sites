// One build, run both locally (pnpm preview) and in CI (pnpm build):
// 1. Captures sites/<name>/preview.jpg for every site, using the system Edge.
// 2. Writes sites/index.html: a card per site, newest first.
// Each site needs a <title> and a <meta name="description">.
// A site's date is the commit that first added its index.html (renames are followed).
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const ROOT = 'sites';
const SETTLE_MS = 5000;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

function readSite(name) {
  const file = `${ROOT}/${name}/index.html`;
  const html = readFileSync(file, 'utf8');
  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1].trim();
  const description = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1].trim();
  if (!title) throw new Error(`${file} has no <title>.`);
  if (!description) throw new Error(`${file} has no <meta name="description" content="...">.`);

  const dates = execFileSync('git', ['log', '--follow', '--diff-filter=A', '--format=%aI', '--', file], { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean);
  const added = dates.at(-1);
  if (!added) throw new Error(`No git history for ${file}. Commit it first, and check out with fetch-depth: 0.`);

  return { name, title: unesc(title), description: unesc(description), added: new Date(added) };
}

async function captureScreenshots(names) {
  const server = createServer(async (req, res) => {
    let path = normalize(decodeURIComponent(new URL(req.url, 'http://local').pathname));
    if (path.endsWith('/') || path.endsWith('\\')) path = join(path, 'index.html');
    const file = join(ROOT, path);
    if (!existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(await readFile(file));
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  // SwiftShader gives headless Edge software WebGL, needed by the 3D sites.
  const browser = await chromium.launch({ channel: 'msedge', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const name of names) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`http://localhost:${port}/${name}/`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(SETTLE_MS);
    await page.screenshot({ path: `${ROOT}/${name}/preview.jpg`, type: 'jpeg', quality: 80 });
    await page.close();
    console.log(`captured ${name}`);
  }
  await browser.close();
  server.close();
}

function writeIndex(sites) {
  const fmt = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const cards = sites
    .map((s) => `    <a class="card" href="./${esc(s.name)}/">
      <img src="./${esc(s.name)}/preview.jpg" alt="Screenshot of ${esc(s.title)}" loading="lazy" width="1280" height="800">
      <div class="body">
        <h2>${esc(s.title)}</h2>
        <p>${esc(s.description)}</p>
        <time datetime="${s.added.toISOString()}">${fmt(s.added)}</time>
      </div>
    </a>`)
    .join('\n');

  writeFileSync(`${ROOT}/index.html`, `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Small web toys, one file each.">
<title>Pocket Sites</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; background: #0e1016; color: #e9e9f0; font-family: ui-sans-serif, system-ui, sans-serif; }
  main { width: min(1180px, 100% - 48px); margin: 0 auto; padding: 72px 0 96px; }
  header { margin-bottom: 40px; }
  h1 { margin: 0 0 8px; font-size: clamp(32px, 5vw, 48px); letter-spacing: -0.02em; }
  header p { margin: 0; color: #8b90a5; font-size: 18px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
  .card { display: flex; flex-direction: column; border-radius: 16px; overflow: hidden; background: #161923; border: 1px solid #232736; color: inherit; text-decoration: none; transition: transform .15s ease, border-color .15s ease, box-shadow .15s ease; }
  .card:hover { transform: translateY(-3px); border-color: #4c6fff; box-shadow: 0 18px 40px rgba(0, 0, 0, .45); }
  .card img { display: block; width: 100%; height: auto; aspect-ratio: 16 / 10; object-fit: cover; background: #0b0d12; border-bottom: 1px solid #232736; }
  .body { padding: 18px 20px 20px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
  h2 { margin: 0; font-size: 19px; }
  .body p { margin: 0; color: #a3a8bb; line-height: 1.5; font-size: 14.5px; flex: 1; }
  time { color: #6c7187; font-size: 12.5px; font-variant-numeric: tabular-nums; }
</style>
</head>
<body>
<main>
  <header>
    <h1>Pocket Sites</h1>
    <p>Small web toys, one file each.</p>
  </header>
  <div class="grid">
${cards}
  </div>
</main>
</body>
</html>
`);
  console.log(`wrote ${ROOT}/index.html with ${sites.length} sites`);
}

const sites = readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(`${ROOT}/${d.name}/index.html`))
  .map((d) => readSite(d.name))
  .sort((a, b) => b.added - a.added || a.name.localeCompare(b.name));

await captureScreenshots(sites.map((s) => s.name));
writeIndex(sites);
