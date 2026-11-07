// Captures sites/<name>/preview.jpg for every site, using headless Chromium.
// Sites are served over a local HTTP server so they load exactly as on Pages.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
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

const names = readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(`${ROOT}/${d.name}/index.html`))
  .map((d) => d.name);

// SwiftShader gives headless Chromium software WebGL, needed by the 3D sites.
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
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
