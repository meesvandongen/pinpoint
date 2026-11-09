---
name: write-quest
description: Research and write a Pinpoint quest or pin (content/quests/*.json) that is fun to play — choosing places, researching facts, writing clues, quiz and photo prompt, checking and playtesting. Use when asked to add, draft, improve or review a quest, a pin, clues or a location for a city.
---

# Writing a Pinpoint quest

You are writing content for a game played on foot in a real city. A player who follows your clues will walk there, so wrong facts, wrong coordinates or unsafe places are real problems, not typos.

Read these first, every time:

- `docs/writing-pins.md`: what makes a pin engaging, with the checklist. **This is the standard the result is judged by.**
- `docs/content.md`: the file format and its limits.
- `fixtures/content/quests/*.json`: test fixtures that show the shape of a file. Their coordinates and facts are not real; do not copy them into `content/`.

## 1. Get the brief

Settle these with the user before researching. Ask only for what you cannot sensibly default:

- **Where:** city and neighbourhood, or a start point.
- **Theme:** a thread through the pins (industry, water, lost walls, street names…). If the user has none, propose two or three after a first look at the area.
- **Length:** default 4–6 pins, under an hour's walk.
- **Languages:** default `en` as `defaultLanguage`; add `nl` (or the local language) when the city is not English-speaking and the user wants it.
- **Order:** `linear` (a route you design) unless the pins are far apart.

Check `content/locations/`: if no location outline covers the area, the quest also needs one (a name and a rough polygon around the city).

## 2. Research candidates

Collect more candidates than you need (two or three per pin), then pick.

- **Search** heritage registers, municipal monument lists, local archives and historical societies, Wikipedia and its sources, and historical maps. Use WebSearch/WebFetch when available.
- **Positions from OpenStreetMap.** Never estimate coordinates. Query the Overpass API, for example:

  ```bash
  curl -sS https://overpass-api.de/api/interpreter --data-urlencode 'data=[out:json];nwr["historic"](around:800,LAT,LNG);out center tags;'
  ```

  Use the node, or the `center` of a way, and then move the point to where a player would stand (the pavement or square in front, not the middle of the building). Map the OSM tags to a `category` with `osmCategory(key, value)` in `packages/core/src/osm.ts`.
- **Check it is still there and public** with street-level imagery and recent sources. Drop anything behind a gate, on a private garden, on a road without a pavement, or dependent on a shop, a sign or a temporary artwork.

For each candidate, write a note (keep it in your scratchpad, not in the repo):

```
id / name / position (source) / suggested radius
detail you can see from the street:
the surprise (the fact a local might not know):
facts + source URL for each:
nearby look-alikes:
open questions to verify on site:
```

Pick the pins that pass the three-sentence test in `docs/writing-pins.md` (*walks here because… / looks at… / leaves knowing…*). Prefer variety: big and small, up and down, one riddle-only pin. Then order them into a route and check the walking distance between pins.

## 3. Write

Follow `docs/writing-pins.md` sections 4–8. In short:

- The first text clue shows from the start and must find the pin on its own (local expert mode hides distance, direction and map).
- Then hints with `"reveal": { "onRequest": true }`, easier each time: a second riddle or `wordShape`, then `map` with `"view": "area"`, then `direction` and `distance` last.
- The quiz is answerable by looking, or teaches the surprise; wrong answers are plausible.
- Photo prompts ask for a detail or a viewpoint and differ between pins.
- Every text within its limit in every language: titles 40, clues 140, photo prompts 100, questions 120, answers 48, description 240.
- **Every fact must come from a source you found.** Never fill a gap with something plausible. If you cannot source it, leave it out or ask.
- Do not add photo or audio clues unless the user supplies the files and says they may be shared. Never hot-link: `src` is a path under `content/`.
- Translations: write each language natively, not word for word, and keep the riddle working in each.

Save to `content/quests/<id>.json` (the file name is the id; no `id` field at the top).

## 4. Check

```bash
pnpm run content
```

Fix everything it reports. Then go through the checklist at the end of `docs/writing-pins.md` pin by pin and say honestly which items you could not check from a desk.

## 5. Playtest

```bash
pnpm --filter pinpoint-app dev
```

Open `http://localhost:3000/?sim=LAT,LNG` (a point a few hundred metres from the first pin) and play the quest with the test tools (round icon at the right edge → **Location**): stand 240 m away and read only the first clue, ask for each hint in turn, walk to the pin, check in. Try it once with **local expert** on. Screenshots at 360×640 show whether the text fits.

## 6. Hand over

You cannot stand at the pins; a person has to. When opening the pull request (or reporting back), include:

- A short summary of the quest and its route, with total walking distance.
- **Per pin:** the sources for every fact, and what still needs checking on site (is the detail visible, is the position right, is the GPS good enough for the radius, is it safe to stand there).
- A note that a reviewer can stand at every pin in the preview deployment with the test tools.

Do not describe the quest as ready to publish until someone has walked it.
