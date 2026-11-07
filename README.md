# pocket-sites

Single-file websites. Each site is one `index.html` that loads its libraries from a CDN. There is no build step.

## Live sites

Every folder in `sites/` is published at:

```
https://jigargosar.github.io/pocket-sites/<folder-name>/
```

| Site | Folder | Libraries |
|------|--------|-----------|
| Orbit Clock | `sites/orbit-clock/` | three.js, GSAP |
| Beat Grid | `sites/beat-grid/` | Tone.js, Alpine.js |
| Poster Forge | `sites/poster-forge/` | p5.js, Tweakpane |
| Globe Pulse | `sites/globe-pulse/` | globe.gl, D3 |
| Focus Breath | `sites/focus-breath/` | anime.js, Howler.js |

## Deploy

1. Every push to `main` runs `.github/workflows/deploy.yml`.
2. The workflow uploads the `sites/` folder as-is to GitHub Pages.
3. No token, secret or deploy script is needed.
4. The workflow can also be run by hand from the Actions tab.

## Add a site

1. Create `sites/<new-name>/index.html`.
2. Commit and push.
3. It is live at `https://jigargosar.github.io/pocket-sites/<new-name>/`.

No list needs updating. The order of folders does not matter.

## Edit in the browser

1. Open the repo on github.com.
2. Press `.` to open github.dev.
3. Edit, then commit from the Source Control panel. The commit deploys.

## View locally

```sh
node scripts/build-index.mjs
pnpx serve sites
```

Then open `http://localhost:3000/` for the index, or `http://localhost:3000/<folder-name>/` for one site.
