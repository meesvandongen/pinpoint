---
name: write-quest
description: Research and write a Pinpoint quest or pin (content/quests/*.json) that is fun to play — choosing places, researching facts, writing clues, facts, questions and the photo prompt, checking and playtesting. Use when asked to add, draft, improve or review a quest, a pin, clues or a location for a city.
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
- **Order:** decide with the user, no default. `linear` (one pin at a time) suits a short story-like route with no very hard pins; `free` suits longer quests, spread-out pins or hard pins, because a player stuck on one pin can try another. See section 7 of `docs/writing-pins.md`.

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
the surprise (the fact a local might not know; becomes a fact or a question):
facts + source URL for each:
nearby look-alikes:
open questions to verify on site:
```

Pick the pins that pass the three-sentence test in `docs/writing-pins.md` (*walks here because… / looks at… / leaves knowing…*). Prefer variety: big and small, up and down, one riddle-only pin. Then decide between `linear` and `free`, and either way check the walking distance between pins (for `free`, the longest likely walk).

## 3. Write

Follow `docs/writing-pins.md` sections 4–7. In short:

- The first text clue shows from the start and must find the pin on its own (local expert mode hides distance, direction and map).
- Then hints with `"reveal": { "onRequest": true }` that generally give a little more help each time. Choose the clues and their order to suit the place: a second riddle, a `wordShape`, a photo, a `map` with `"view": "area"`, `direction`, `distance`. Each hint and each question is a chance to lose a star; a pin keeps three stars until fewer than three chances are left untouched (see Stars in `docs/content.md`). Distance, direction and map are the most direct help, so they usually come late, but that is a judgement, not a rule.
- After arrival, write the `arrival` list: facts (the surprise from your research, tied to what the player sees), questions (answerable by looking, plausible wrong answers), and optionally the photo page with a prompt to choose where it goes. Usually two to four pages; order them so they tell a small story.
- Photo prompts ask for a detail or a viewpoint and differ between pins. A pin has exactly one photo page.
- Every text within its limit in every language: titles 40, clues 140, facts 240, photo prompts 100, questions 120, answers 48, description 240.
- **Every fact must come from a source you found.** Never fill a gap with something plausible. If you cannot source it, leave it out or ask.
- Consider a `photo` clue (a detail, a viewpoint, or an old archive picture of the place). Use a file the user supplies, or one you found with a licence that allows reuse (for example an openly licensed archive or Wikimedia Commons image). Download it into `content/media/`, at most 1200 px wide, give it an `alt`, and record the source and licence for the pull request. Never hot-link: `src` is a path under `content/`. Audio only from files the user supplies.
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
