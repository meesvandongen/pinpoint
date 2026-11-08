# Pinpoint

A game for real cities. You get a **quest**: a list of **pins** (places). Each pin gives you limited clues, such as a distance, a direction, a map or a riddle. When you are close enough you check in, collect a **stamp**, and can answer a quiz question and take a photo for your album.

Web app, installable as a PWA. Content lives in this repository, as plain files anyone can add with a pull request.

See [docs/plan.md](docs/plan.md) for the plan, decisions and open questions.

## Layout

| Path | Contents |
| --- | --- |
| `content/` | Locations and quests as JSON. `content/index.json` is generated. |
| `packages/core` | Zod schemas, geo maths, play rules and the content loader. Tested. |
| `packages/app` | The player: React, Vite+, deployed as a Cloudflare Worker with static assets. |
| `scripts/content.mjs` | Validates content and writes `content/index.json`. |

## Develop

```sh
pnpm install
pnpm --filter pinpoint-app dev      # http://localhost:3000
pnpm test
pnpm run content                    # validate content, regenerate content/index.json
```

Try the game at a desk with a simulated position and a debug bar:
`http://localhost:3000/?debug&sim=51.5629,5.0768,10` (latitude, longitude, accuracy in metres).

## Adding content

A **location** is a name and a polygon. A **quest** is a title and pins; each pin has a position, a radius and clues. Add files under `content/locations/` or `content/quests/<id>/quest.json`, run `pnpm run content`, and open a pull request. CI validates the files. Coordinates are `[longitude, latitude]` in polygons and `{ lat, lng }` for pins.

Quests show under every location whose polygon overlaps the quest area, so no location is listed in the quest itself.

## Deploy

The app is a Cloudflare Worker named `pinpoint` (see `packages/app/wrangler.jsonc`), deployed by [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/). GitHub CI never runs Wrangler.

- **Root directory:** `packages/app`
- **Build command:** `pnpm run build`
- **Deploy command:** `npx wrangler deploy` (production branch)
- **Preview command:** `npx wrangler preview` (every other branch)

The build copies `content/` into the output, so the game loads its content from `/content`. Set `VITE_CONTENT_URL` at build time to read from `raw.githubusercontent.com` instead.
