# Pinpoint: plan and decisions

What the game is, what has been decided and why, what is built, and what is still open. The README says how to run it; [content.md](content.md) is the file format; [contributing.md](contributing.md) is how to add a quest.

## The game

You are in a real city and receive a **quest**: a list of **pins**. Each pin gives you limited clues about a place. When you are close enough you check in and collect a stamp, and you can take a photo, answer a question about the place, and earn small extra marks. At the end of a quest your photos become a collage.

Not competitive. Reading the answers in the repository or faking your GPS is accepted, because the point is enjoyment.

## Platform

A web app that installs as a PWA and works offline.

- **Location:** the browser Geolocation API is enough for "am I within X metres of the pin". It needs HTTPS and works while the app is open, which is how the game is played. A player who allowed it once is not asked again.
- **Accuracy:** GPS is poor between tall buildings. Each pin has its own radius, and a fix only counts as arrived when its reported accuracy is 60 m or better. A vaguer fix near the pin says "almost there".
- **Direction pointer:** works on Android. iOS asks for a one-time compass permission, and readings are noisy. The arrow is an extra clue; distance is always the fallback.
- **Camera and album:** a camera input, downscaled, stored in IndexedDB on the device. No backend.
- **Offline:** a service worker caches what starts the app and the quest files, refreshes quests in the background, and caches map tiles as they are seen. The map and the editor are cached the first time they are opened.

## Content model

Content lives in this repository as JSON. [gitvfs](https://github.com/meesvandongen/gitvfs) is for authoring: `gitvfs-cms` gives the editor at `/admin` (forms from zod schemas, map fields, a commit per save, branches and pull requests). The game itself reads the files that were built into it.

- **location**: a name and a polygon. No parent: Tilburg, Noord-Brabant and the Netherlands are three independent entries, and nesting is computed from the geometry. The app lists every location whose polygon contains the player, smallest first.
- **quest**: title, description, `order` (`linear` or `free`), an optional `area` polygon, and pins. A quest shows under every location whose outline overlaps its area; without an `area`, a box around the pins stands in. Quests name no location.
- **pin**: a point and a radius, clues, the pages after arrival (facts, questions, and where the photo page goes), an optional stamp style.
- **The file name is the id.** The editor would otherwise show two fields, the slug and an id, that have to match.
- **Coordinates are `{ lat, lng }`**, like the editor's map fields: nobody mixes up the order.
- **Languages:** any text is a plain string or a map of language to text. A map has to include the quest's default language; the game falls back to it.
- **Limits:** every kind of text has a length limit, because it has to fit on a screen that does not scroll. CI checks them in every language.
- **Safety:** the contributor guide asks for public places only.

### Why the content is built into the app

Reading content from GitHub at runtime would need an index of the files (GitHub cannot list a folder without its API and its rate limits), and a committed index conflicts between pull requests. Instead the build lists the folders itself and copies `content/` into the output. A quest merged into `main` is live when the build is, a preview deployment shows a branch's own quests, and the service worker makes it all available offline. `VITE_CONTENT_URL` still points the app at any host that serves the same files.

### Why gitvfs is vendored

`gitvfs-cms`, `gitvfs-github-msw` and `gitvfs-github-auth` are not on npm yet, and only `gitvfs` is. `vendor/` holds tarballs built from the gitvfs repository by `scripts/vendor-gitvfs.mjs`, so a clean checkout installs everywhere, including Workers Builds. When the packages are published, the `file:` dependencies become version ranges and `vendor/` goes away.

## Clues

A pin has a list of clues and any clue can be missing, so a pin can have only a riddle, for players who know the city.

| Built | Idea, not built |
| --- | --- |
| text or riddle, distance, compass, map (exact or a rough area), photo, sound, word shape | shrinking circle, old map, detail crop, a chain where one pin's quiz answer is the next clue |

Each clue has an optional reveal rule: from the start, or on request, as a hint the player asks for. There is no timer: nobody could name a case where waiting is better than asking. **Local expert** hides distance, direction and map everywhere; it only makes a quest harder. Clue types are an open set: a client skips types it does not know, and the schema keeps them.

## Stamps

The stamp is the reward for arriving. It records what happened and does not grade the player; the one count, help used, never gates anything.

- Every stamp is a full stamp. There are no tiers and no total score. The one thing counted is slips: every pin starts with three small star stamps beside it, and asking for a hint or answering a question wrong can cost one. A pin's chances are its hints and its questions; it keeps all three stars while at least three chances are untouched, so a pin with many hints forgives the first few, and when everything goes wrong no star is left. A pin with fewer than three chances counts as having three. Clues shown from the start are free. Stars never unlock or block anything.
- Small clue marks show which clue types were used. Two players get two different stamps and neither is better.
- Five shapes (round seal, postage stamp, hexagon, ticket, oval postmark) plus a starburst for finishing a quest. A pin can choose its shape, icon and ink; otherwise they follow from its category and id, so a pin always looks the same.
- Five extra marks, for things anyone can choose to do: a question answered (right or wrong), photo taken, found after dark, found at sunrise, found in rain. Dark and sunrise come from the sun's position at the player's place and time, so nothing is sent anywhere. Rain asks Open-Meteo, and only when the player switched weather marks on.
- A skipped pin can be stamped later. The book is never failed, only incomplete.
- The quest has one page, a grid with a place for every pin, so nothing moves when a stamp is collected. A pin you can look for opens its clues. A pin that has to wait (the later pins of a quest played in order) is shown dimmed and cannot be tapped. A pin you found is a printed page (number, icon, name) with its stamp and stars pressed on it, and your photo taped over it as a polaroid. Tap the photo to lift it and see the stamps, tap the page to open the pin.
- Photos feed the collage. Photo matching is not part of the game.
- All stamp drawing is escaped SVG built from strings, so a quest's text cannot inject markup, and the same drawing serves the screen and the collage.

## Icons

A pin has a `category` from a controlled list of 45, each with a parent to fall back to (`chimney` → `industrial` → `building` → `other`). The icon table is typed on the list, so a category without an icon does not compile. `osm.ts` maps OpenStreetMap tags to categories and a test checks the mapping against the most used values of twelve keys from taginfo (`pnpm run taginfo` refreshes them). Every value is either mapped, or listed as something that is not a destination (a bench, a parking space). When the test fails after a refresh, its message names the values to look at.

## Interface rules

- The play screens never scroll and nothing on them is cut off. A list shows as many items as fit and pages the rest; page buttons are always there, and the page-turn animation is a plain fade with reduced motion. A browser test measures every screen at 320×568, 360×640, 390×780 and 430×932.
- The settings page is the one exception: it is a list of controls, not a game screen.
- Style: the passport. A navy cover, cream pages, ink stamps and gold. Fonts are bundled, not loaded from a font service.
- Text size: at very large system text the layout may still fall back to scrolling rather than hide content. Not yet tested.

## Preview deployments and test tools

Every branch builds to a preview deployment with **test tools** on: a TanStack Devtools shell whose panels move the player (anywhere, near a pin, with a vague fix, walking), move the clock to after dark or sunrise, skip clue timers, make it rain, stamp pins, and inspect the mocks. [MSW](https://mswjs.io) answers the weather and the GitHub API, the latter backed by a copy of `content/` in the browser, so the editor works in a preview without an account and its edits can be played at once. Production builds contain none of it (see the README for how it is switched).

This is the main review tool for quest pull requests: a reviewer opens the preview and stands at each pin.

## Status

Built, and covered by tests:

- Core: schemas, geo, play rules, sun position, categories and their OSM mapping, collage layout, quest checks. 79 tests.
- App: the whole game, English and Dutch, offline, the test tools. 38 tests, plus a browser suite that plays the game.
- Editor: all content types, with checks that its schema and the game's agree. 22 tests.
- CI: lint, content check, typecheck, unit tests, build and the browser suite.

Open:

- **Licence.** None chosen for the code, or for quests and photos people contribute. Decide before taking outside contributions.
- **Production URL and editor sign-in.** The Worker for "Sign in with GitHub" exists but needs a GitHub App and its secret; until then the editor takes a token. Contributors without write access send files in a pull request.
- **Real quests.** `content/` is empty. The made-up quests the tests play are in `fixtures/content/`. [writing-pins.md](writing-pins.md) is the guide for writing real ones.
- **Clue marks on stamps:** always visible, or behind a tap? The first reads as honest, but some players may read them as a judgement.
- **Contributed media.** There is no process yet for checking that photos and sounds in a pull request may be shared.
- **Very large system text** is not tested.
- **Stamps for pins with no fixed place** ("photograph something red in this neighbourhood") would need a clue and arrival rule with no coordinates.
