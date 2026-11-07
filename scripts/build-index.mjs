// Generates sites/index.html: a list of every site, newest first.
// A site's date is the commit that first added its index.html (renames are followed).
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

const ROOT = 'sites';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const sites = readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(`${ROOT}/${d.name}/index.html`))
  .map((d) => {
    const file = `${ROOT}/${d.name}/index.html`;
    const dates = execFileSync('git', ['log', '--follow', '--diff-filter=A', '--format=%aI', '--', file], { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(Boolean);
    const added = dates.at(-1);
    if (!added) throw new Error(`No git history for ${file}. Commit it first, and check out with fetch-depth: 0.`);
    const title = readFileSync(file, 'utf8').match(/<title>([^<]*)<\/title>/i)?.[1].trim() || d.name;
    return { name: d.name, title, added: new Date(added) };
  })
  .sort((a, b) => b.added - a.added || a.name.localeCompare(b.name));

const rows = sites
  .map((s) => `    <li><a href="./${esc(s.name)}/"><span class="title">${esc(s.title)}</span><time datetime="${s.added.toISOString()}">${s.added.toISOString().slice(0, 10)}</time></a></li>`)
  .join('\n');

writeFileSync(`${ROOT}/index.html`, `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pocket Sites</title>
<style>
  body { margin: 0; min-height: 100vh; background: #0f1117; color: #e8e8ef; font-family: ui-sans-serif, system-ui, sans-serif; display: grid; place-items: start center; }
  main { width: min(640px, 100% - 40px); padding: 64px 0; }
  h1 { margin: 0 0 6px; font-size: 32px; }
  p { margin: 0 0 32px; color: #8a8fa3; }
  ul { list-style: none; padding: 0; margin: 0; }
  a { display: flex; justify-content: space-between; gap: 16px; padding: 16px 18px; margin-bottom: 10px; border-radius: 12px; background: #181b24; color: inherit; text-decoration: none; border: 1px solid #242836; }
  a:hover { border-color: #5b8cff; }
  .title { font-weight: 600; }
  time { color: #8a8fa3; font-variant-numeric: tabular-nums; }
</style>
</head>
<body>
<main>
  <h1>Pocket Sites</h1>
  <p>Small web toys, one file each.</p>
  <ul>
${rows}
  </ul>
</main>
</body>
</html>
`);
console.log(`wrote ${ROOT}/index.html with ${sites.length} sites`);
