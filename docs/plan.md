# Pinpoint: plan and decisions

Status: first playable slice built. This file records what has been decided, what is still open, and why.

## The game

You are in a real city and receive a **quest**. A quest is a list of **pins**. Each pin gives you limited clues about a place: only a distance from where you are, or a distance plus a direction pointer, or a map. When you are close enough you check in, take a photo for your **album**, and can optionally answer a quiz question about the place or about something else.

Not competitive. Cheating (reading the answers in the repo, spoofing GPS) is accepted, because the point is enjoyment.

## Platform

A web app, installable as a PWA.

- **Location:** the browser Geolocation API is enough for "am I within X metres of the pin". It needs HTTPS and works while the app is open, which is how the game is played.
- **Accuracy:** GPS is poor between tall buildings. Each pin has its own radius, and a fix only counts when the reported accuracy is good enough.
- **Direction pointer:** works on Android. iOS asks for a one-time motion/compass permission, and compass readings are noisy. The arrow is an extra clue; distance is always the fallback.
- **Camera and album:** `<input capture>` or `getUserMedia`, photos stored on the device (IndexedDB). No backend.
- **Install:** PWA (home screen, offline cache, fullscreen).

## Content model

Content lives in this repository and is authored with [gitvfs](https://github.com/meesvandongen/gitvfs). `gitvfs-cms` provides zod-schema-driven editing with every save as a commit, branches and PRs, plus map fields (point, point with radius, polygon) and references between entries.

Entities:

- **location**: a name and a polygon. No parent reference. Tilburg, Noord-Brabant and the Netherlands are three independent entries. Nesting is computed from the geometry.
- **quest**: title and description, `order: linear | free`, an optional `area` polygon, and a list of pins.
- **pin**: a point and a radius, which clues are shown (distance, direction, map), an optional photo prompt, and an optional quiz question.

Rules:

- **Suggesting a location:** the app lists every location whose polygon contains the player, smallest area first.
- **Quest to location:** a quest shows under a location when its area overlaps that location's polygon. If a quest has no `area`, one is derived from its pins (hull plus margin). Quests need no location field.
- **Order:** linear (pin 1, then 2, then 3) or free, set per quest.
- **Languages:** any text field is either a plain string or a map such as `{ nl, en }`, with a fallback to the quest's default language. Multilingual is optional.
- **Photos:** local only. Sharing or leaderboards would need a backend and are out of scope.
- **Contributing:** a quest is a folder. A contributor adds one with a PR or through the editor. A schema validator in CI keeps PRs safe to merge.
- **Safety:** the app shows a disclaimer (traffic, private property, night play). Contributor rule: pins must be publicly accessible.

Possible later: pins without fixed coordinates inside a quest area ("photograph something red in this neighbourhood"), and an optional tag to force a quest under a location.

## Clues

A pin has a list of clues and any clue can be missing, so a pin can have only a riddle (for players who know the city). Types:

- **Spatial:** distance, direction (arrow or cardinal), map (full or rough area), named area, shrinking circle, old map.
- **Visual:** photo, detail crop, old photo of the same place.
- **Verbal:** hint or riddle, word shape.
- **Knowledge:** a question whose answer is the location, or a chain where one pin's quiz answer is the next clue.
- **Sensory:** audio.

Each clue has an optional reveal rule: visible from the start, unlocked after some seconds, or unlocked on request. Players can switch on a "local expert" mode that hides distance, direction and map; it only ever makes a quest harder. Clue types are an open set: a client skips types it does not know.

## Stamps

The stamp is the reward for arriving. It records what happened and never grades the player.

- Every stamp is a full stamp. No tiers, no numeric score.
- Small clue marks show which clue types were used. Two players get two different stamps and neither is better.
- Extra marks reward choices anyone can make: quiz answered, photo taken, found after dark, in rain, at sunrise, with friends.
- A skipped pin can be stamped later by returning to it. The book is never failed, only incomplete.
- Photos feed a collage at the end of a quest. Photo matching is optional and never part of the stamp.
- Contributors choose a shape, an icon and an ink colour per pin, or the app generates a stamp from templates. Shapes explored: round seal, postage stamp, hexagon, ticket, oval postmark, and a starburst for finishing a quest.

## Icons

A pin has a `category` from a controlled list (about 16 now, meant to grow to 40-60). Each category has a parent to fall back to for its icon (chimney, industrial, building, other), and `other` always has an icon. The app's icon table is typed on the category list, so adding a category without an icon does not compile.

Planned coverage test: map OpenStreetMap tag values (tourism, historic, amenity, building, man_made, natural, leisure) to our categories and report how many of the most used values on taginfo end up in `other`. Open icon sets worth drawing from: Maki and Temaki (check licences).

## Interface rules

- The play screens (current pin, clues, arrival, stamp) never scroll at the default text size. Content that does not fit is split into pages, never clipped. Lists are paged with dots and turn buttons.
- There is always a button for turning a page; swiping is an extra. Page-turn animations become a fade with reduced motion.
- Contributors get length limits (for example a hint under about 140 characters) so text fits; CI should check them per language.
- At very large text sizes the layout may fall back to scrolling rather than hide content.
- Style: the passport. Navy cover, cream pages, ink stamps, gold. Details such as number size are open.

## Status

Built:

- Monorepo (pnpm, Vite+) with `packages/core` (schemas, geo, play rules, content loader; tested) and `packages/app` (React PWA).
- Sample content: three nested locations and one quest with three pins.
- App flow: suggest locations from the position, list quests, play a pin (distance, direction, text, rough map, timed and on-request clues), proximity check with accuracy, round stamp, quiz, quest completion.
- Local progress and the "local expert" setting in localStorage.
- Content validation in CI (`pnpm run content:check`) and a Cloudflare Worker config named `pinpoint`.

Not built yet: photo capture and the end-of-quest collage, extra marks, stamp shapes other than round, real map tiles (the map clue is schematic), the service worker for offline play, the `/admin` authoring page with gitvfs-cms, UI translations, length-limit checks, the icon coverage test.

## Open questions

- **Runtime role of gitvfs.** Leaning towards authoring only. The player would fetch the content files from GitHub (raw JSON/YAML) and validate them with the same zod schemas. That keeps both options open: bundle content at build time later, or use gitvfs live.
- **Stack.** Decided: React PWA in a pnpm monorepo with Vite+, like `gitvfs`, deployed as a Cloudflare Worker with static assets.
- **Naming.** "Quest" for the whole, "pins" for the stops. Alternatives considered: mission, expedition. Route, trail and hunt were rejected because they imply order or overlap with quest.

## Visual style

Players use the app outdoors in sunlight, one-handed, while walking. Constraints for every direction:

- The clue (distance, arrow, map) is the hero of the screen.
- High contrast and large touch targets; light by default, dark optional.
- Feedback you can feel: warmer/colder cues, a pulse when close, a satisfying arrival moment (and haptics where available).
- The album is the reward and should look good enough to share.

Directions explored: field journal, treasure map, modern map-first, radar/HUD, bold and playful, polaroid/film. Four were mocked up on the "current pin" screen.

Decision: the overall style is the **passport** (variation 2B: a navy cover with a cream page and stamps in different inks). Bold and playful and field journal were the two strongest directions; modern map-first and radar/HUD were dropped. Elements still open: how large the distance number is, and whether clue marks on stamps are always visible or behind a tap.

## Next steps

1. Photo capture (stored on the device) and the end-of-quest collage.
2. The remaining stamp shapes and the extra marks.
3. Real map tiles and the service worker for offline play.
4. Authoring: an `/admin` page using gitvfs-cms, a contributor guide, and length-limit checks in CI.
5. The icon coverage test against OpenStreetMap tags.
