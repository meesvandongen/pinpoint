# Pinpoint: plan and decisions

Status: early planning. Nothing is built yet. This file records what has been decided, what is still open, and why.

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

## Open questions

- **Runtime role of gitvfs.** Leaning towards authoring only. The player would fetch the content files from GitHub (raw JSON/YAML) and validate them with the same zod schemas. That keeps both options open: bundle content at build time later, or use gitvfs live.
- **Stack.** gitvfs-cms is React with Vite and pnpm, so a React PWA in a pnpm monorepo like `gitvfs` is the default candidate.
- **Naming.** "Quest" for the whole, "pins" for the stops. Alternatives considered: mission, expedition. Route, trail and hunt were rejected because they imply order or overlap with quest.

## Visual style

Players use the app outdoors in sunlight, one-handed, while walking. Constraints for every direction:

- The clue (distance, arrow, map) is the hero of the screen.
- High contrast and large touch targets; light by default, dark optional.
- Feedback you can feel: warmer/colder cues, a pulse when close, a satisfying arrival moment (and haptics where available).
- The album is the reward and should look good enough to share.

Directions explored: field journal, treasure map, modern map-first, radar/HUD, bold and playful, polaroid/film. Four were mocked up on the "current pin" screen.

Decision so far: **bold and playful** (flat colour, thick outlines, hard shadows) and **field journal** (paper, ink, stamps) are the two strongest. Modern map-first and radar/HUD are dropped as base styles. Radar's dark screen washes out in sun; map-first has little personality.

Next: explore variations on both before merging them into one style.

## Next steps

1. Finish the style decision (variations on bold/playful and field journal).
2. Scaffold the repo: pnpm monorepo, content schemas, sample content (a few locations and one quest of about 3 pins), empty player PWA.
3. Player loop: detect location, suggest location, list quests, show current pin, proximity check, photo, quiz, album.
4. Authoring: an `/admin` page using gitvfs-cms, plus CI schema validation and a contributor guide.
