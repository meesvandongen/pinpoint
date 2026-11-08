# Pinpoint

A game for real cities. You get a **quest**: a list of **pins** (places). Each pin gives you limited clues, such as a distance, a direction, a map or a riddle. When you are close enough you check in and collect a **stamp**. You can also take a photo, answer a question about the place, and earn small extra marks (found after dark, in the rain, together). At the end of a quest your photos become a collage you can save.

It is a web app that installs like an app and keeps working offline. Quests are plain JSON files in this repository, so anyone can add one with a pull request. There is no score: a stamp records how you found a place, never how well.

- **Play it:** open the site on your phone and tap *Use my location*.
- **Add a quest:** read [docs/contributing.md](docs/contributing.md). The file format is in [docs/content.md](docs/content.md).
- **How it is put together and why:** [docs/plan.md](docs/plan.md).

## What is in the repository

| Path | Contents |
| --- | --- |
| `content/` | Locations and quests as JSON, and the photos and sounds clues point at. |
| `packages/core` | The content schemas, geo maths, play rules, sun position, categories and their OpenStreetMap mapping, collage layout. No UI. Tested. |
| `packages/app` | The game: React, TanStack Router and Query, MapLibre, Vite+. Deployed as a Cloudflare Worker with static assets. |
| `packages/admin` | The quest editor at `/admin`: [gitvfs-cms](https://github.com/meesvandongen/gitvfs) with Pinpoint's content model. Loaded only when opened. |
| `packages/e2e` | Plays the game in a real browser: the whole journey, the preview test tools, the editor and offline play. |
| `scripts/` | `content.mjs` checks the content; `taginfo.mjs` refreshes the OpenStreetMap fixture; `vendor-gitvfs.mjs` rebuilds `vendor/`. |
| `vendor/` | The gitvfs packages, as tarballs, until they are on npm. See `vendor/README.md`. |

## Develop

```sh
pnpm install
pnpm --filter pinpoint-app dev        # the game at http://localhost:3000, with the test tools on
pnpm run content                      # check everything under content/
pnpm test                             # unit tests of every package
pnpm run typecheck
pnpm run lint
pnpm run e2e                          # the browser tests (needs `pnpm --filter pinpoint-e2e exec playwright install chromium` once)
```

Node 22.18 or newer. The unit tests need no browser.

### Test tools

The dev server and every **preview deployment** have test tools on, so a game that depends on where you stand can be tested from a desk. Tap the round icon at the right edge to open the TanStack Devtools shell:

| Panel | What it does |
| --- | --- |
| **Location** | Stand anywhere: jump to a place, to the current pin, 25 m, 80 m, 240 m or 1 km away, with a vague GPS fix, or tap the map. Walk to the pin at walking, running or cycling speed. Turn the compass. |
| **Time and weather** | Move the clock to a moment after dark or at sunrise for the player's position, skip clue timers, and make it rain, so the extra marks can be earned. |
| **Progress** | Stamp the current pin or the whole quest, and change the settings. |
| **Mocks** | The copy of the content that the editor works on, and the requests the mocks answered. |
| **Query**, **Router** | The TanStack Query and Router panels. |

A link such as `/?sim=51.5607,5.0768` opens the game with the player standing there (`lat,lng[,accuracy]`).

[MSW](https://mswjs.io) answers the requests that depend on the outside world: the weather (Open-Meteo) and the GitHub API, backed by a copy of `content/` in the browser. That is what lets the editor at `/admin` work in a preview without an account: edit a quest, save, and play the change in the other tab at once.

Production builds contain none of this. The tools are switched on by a build flag that is a constant after bundling (`__TEST_TOOLS__` in `packages/app/vite.config.ts`): true for the dev server and for Cloudflare Workers Builds of any branch other than `main`, or when `VITE_TEST_TOOLS=true`. Set `PINPOINT_PRODUCTION_BRANCH` if the production branch is not called `main`.

## Deploy

The app is a Cloudflare Worker named `pinpoint` ([`packages/app/wrangler.jsonc`](packages/app/wrangler.jsonc)), built and deployed by [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/). GitHub CI never runs Wrangler.

| Setting | Value |
| --- | --- |
| Root directory | `packages/app` |
| Build command | `pnpm run build` |
| Deploy command (production branch) | `npx wrangler deploy` |
| Preview command (other branches) | `npx wrangler preview` |

Every other branch and pull request gets a preview deployment (`preview_urls` is on, and `previews` is empty, so previews inherit the Worker's configuration). A preview has the test tools on and a copy of the branch's content, so a reviewer can stand at every pin of a new quest without leaving their desk.

The game's content is copied into the build, so a quest merged into `main` is live as soon as the build is, and works offline after the next visit.

**Signing in to the editor with GitHub** is optional. The Worker in `packages/app/worker/` handles the token exchange for `/admin`. To turn it on, create a GitHub App whose callback URL is `https://<your domain>/admin`, set `GITHUB_CLIENT_ID` and `GITHUB_ALLOWED_ORIGINS` in `wrangler.jsonc`, and run `wrangler secret put GITHUB_CLIENT_SECRET`. Until then the editor asks for a personal access token with Contents and Pull requests write access. Either way, the editor needs write access to this repository; everyone else adds quests as files in a pull request.

## Privacy

Your position, photos, stamps and settings stay in your browser. The game sends your position nowhere. The map loads tiles from [OpenFreeMap](https://openfreemap.org), which sees roughly which area you look at. If you switch on **weather marks** in the settings, the game asks [Open-Meteo](https://open-meteo.com) about the weather where you arrive, with your position rounded to about a kilometre; it is off by default. Fonts are bundled, not loaded from a font service.

## Credits

Map data is © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) (ODbL), served by OpenFreeMap as OpenMapTiles. The sample quests in `content/` are examples and their coordinates are approximate. No licence has been chosen for the code or for contributed quests and photos yet; see the open questions in [docs/plan.md](docs/plan.md).
