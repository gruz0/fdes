# Contributing to Just One More Feature

Thanks for helping improve Just One More Feature. Contributions should keep what makes it work: a three-minute run that loads instantly, needs no account, and runs entirely in the browser.

## Prerequisites

- [Bun](https://bun.sh/) 1.4.2
- Google Chrome, for the smoke test and for regenerating showcase images

## Local setup

```bash
bun install
bun run dev
```

Open <http://127.0.0.1:4173/>. Opening `index.html` straight from disk also works.

## Project layout

| Path | Purpose |
| --- | --- |
| `index.html` | The whole game: a single-file production build with React, three.js, styles and sounds inlined |
| `scripts/serve.ts` | Local static server used by `dev`, the smoke test and the showcase capture |
| `scripts/smoke-test.ts` | Plays one run in headless Chrome |
| `scripts/build.ts` | Assembles the GitHub Pages site in `dist` |
| `scripts/capture-showcase.ts` | Regenerates the README screenshots and the social previews |
| `showcase` | README screenshots, the GitHub social preview and the Open Graph image |

`index.html` is a minified build, not hand-written source. The social meta tags and the Umami loader sit near the top of its `<head>`, one per line, so they are easy to change. Keep every edit to the file small and run the smoke test afterwards.

## Project scripts

| Command | Purpose |
| --- | --- |
| `bun run dev` | Serve the game locally on port 4173 (override with `PORT`) |
| `bun run test` | Play one run in headless Chrome and fail on errors |
| `bun run build` | Copy the game and its Open Graph image into `dist` |
| `bun run capture:showcase` | Recreate the README screenshots and the GitHub and Open Graph previews |

## The smoke test

`bun run test` loads the game in headless Chrome, using software WebGL so it also runs on CI machines without a GPU. It checks that:

- the page loads with no JavaScript or console errors
- the game makes no requests to other origins
- the WebGL scene renders and the How to play dialog opens
- the timer starts and counts down
- a full run ends with a founder report

The test drives the page clock instead of waiting three real minutes. The game advances at most 5 seconds per frame, so the clock moves forward in 5-second steps.

## Regenerating showcase images

With Google Chrome installed, run:

```bash
bun run capture:showcase
```

The script pins the date to 2026-11-17. The daily run is seeded by date, so customers, prices and positions come out the same every time. It plays a short scripted run (opens the desk, builds PDF export, sells it, lets the clock run out), replaces the images in `showcase`, and composes the GitHub (`1280×640`) and Open Graph (`1200×630`) previews from the start screen.

Upload `showcase/social-preview.png` under **Settings → General → Social preview** on GitHub after it changes.

## Privacy conventions

- Keep the game in the browser. A change should not need a server or secrets.
- Local storage is fine for the visitor's own data, such as the best score per daily run (`jomf-best-<date>`).
- Umami loads only on `gruz0.github.io` and counts page views. Do not send run details or scores to it.

## Deployment

Pull requests against `master` run `.github/workflows/ci.yml`, which runs the smoke test and builds the site.

Merges to `master` update the Release Please pull request in `.github/workflows/release.yml`. Merging that pull request creates a version tag and a GitHub release, then builds and deploys that exact release to GitHub Pages. A manual run of the release workflow can rebuild and redeploy an existing `vMAJOR.MINOR.PATCH` tag.

Release Please uses Conventional Commit prefixes to choose the next version: `fix:` makes a patch release, `feat:` a minor release, and `!` or a `BREAKING CHANGE:` footer a major release. Set a `RELEASE_PLEASE_TOKEN` repository secret so release pull requests trigger CI. Without it the workflow falls back to `GITHUB_TOKEN`, and pull requests it opens do not start other workflows.
