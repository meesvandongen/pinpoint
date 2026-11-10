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
- **Length:** default 4–6 pins, under an hour's walk. A narrow theme may only have three places worth a pin within walking distance; three strong pins beat five padded ones. Say so to the user rather than stretching the theme.
- **Languages:** default `en` as `defaultLanguage`; add `nl` (or the local language) when the city is not English-speaking and the user wants it.
- **Order:** decide with the user, no default. `linear` (one pin at a time) suits a short story-like route with no very hard pins; `free` suits longer quests, spread-out pins or hard pins, because a player stuck on one pin can try another. See section 7 of `docs/writing-pins.md`.

Check `content/locations/`: if no location outline covers the area, the quest also needs one (a name and a rough polygon around the city). Nominatim gives a simplified city outline; drop the last point, since a polygon closes itself:

```bash
curl -sS -A "pinpoint-quest-research/1.0" "https://nominatim.openstreetmap.org/search?q=CITY&countrycodes=nl&format=json&limit=3&polygon_geojson=1&polygon_threshold=0.01"
```

Pick the result for the city itself (`"type": "administrative"`, the smaller bounding box), not the wider municipality, unless the user wants that.

To propose themes, a quick list of the heritage sites near the centre helps. Wikidata's SPARQL endpoint can list every item with a heritage designation (`P1435`) within a radius, with its type and whether it has a Wikipedia article:

```sparql
SELECT ?item ?label ?coord ?typeLabel ?article WHERE {
  SERVICE wikibase:around { ?item wdt:P625 ?coord . bd:serviceParam wikibase:center "Point(LNG LAT)"^^geo:wktLiteral . bd:serviceParam wikibase:radius "1.5" . }
  ?item wdt:P1435 ?h .
  OPTIONAL { ?item wdt:P31 ?type }
  OPTIONAL { ?article schema:about ?item ; schema:isPartOf <https://nl.wikipedia.org/> }
  ?item rdfs:label ?label FILTER(lang(?label)="nl")
  SERVICE wikibase:label { bd:serviceParam wikibase:language "nl,en". }
} LIMIT 600
```

```bash
curl -sS -A "pinpoint-quest-research/1.0" -H "Accept: application/sparql-results+json" --data-urlencode query@query.rq https://query.wikidata.org/sparql
```

Note that `Point(…)` takes longitude first.

## 2. Research candidates

Collect more candidates than you need (two or three per pin), then pick.

- **Search** heritage registers, municipal monument lists, local archives and historical societies, Wikipedia and its sources, and historical maps. Use WebSearch/WebFetch when available.
  - **Heritage register entries are the most useful single source.** In the Netherlands, `https://monumentenregister.cultureelerfgoed.nl/monumenten/<number>` describes what you can see from the street: inscriptions, materials, history and later changes. Search for "monumentenregister <name>" to find the number.
  - **Fetch articles with WebFetch.** Wikipedia's API rate-limits bare scripted requests; WebFetch on the article URL works.
  - **Regional news and city guides** (in Tilburg: Omroep Brabant, NOS, In Your Pocket) often hold the local anecdote that makes a pin. Check each anecdote against a second source.
  - **When sources disagree** (a death date, a demolition year), use what the most reliable sources agree on, or leave the detail out. List the conflict in the hand-over. Example: the national register gives 3 April 1849 for Willem II's death, while Wikipedia and the regional archive give 17 March.
- **Positions from OpenStreetMap.** Never estimate coordinates.
  - **Overpass** (`https://overpass-api.de/api/interpreter`) is the easiest way to query by tag, but it is not always reachable from here. Try it once, then move on:

    ```bash
    curl -sS -m 30 https://overpass-api.de/api/interpreter --data-urlencode 'data=[out:json];nwr["historic"](around:800,LAT,LNG);out center tags;'
    ```

  - **The OSM API** returns everything in a small box (a few hundred metres across) and is reliable:

    ```bash
    curl -sS -A "pinpoint-quest-research/1.0" "https://api.openstreetmap.org/api/0.6/map.json?bbox=MINLNG,MINLAT,MAXLNG,MAXLAT" -o map.json
    ```

    Then filter `map.json` in Python for `historic`, `memorial`, `tourism=artwork`, `amenity=fountain|townhall|place_of_worship`, named squares and buildings. Average a way's nodes for its centre, and its min/max for its footprint.
  - **Nominatim** (`https://nominatim.openstreetmap.org/search?q=…&format=json`) finds a single named place.
  - **Use the footprint, not only the centre.** Know where the building's sides are, which side faces a square, and where the roads run (`highway=tertiary` and up is traffic). Then put the pin where a player would stand: the pavement or square in front, not the middle of the building, and not on the road.
  - **Map the category.** Map the OSM tags to a `category` with `osmCategory(key, value)` in `packages/core/src/osm.ts`. A statue tagged `tourism=artwork` maps to `art`; a protected monument may read better as `monument`.
  - **Check the spacing.** Places within a few dozen metres of each other (a needle, a statue and a church on one square) are one pin with several facts, not three pins.
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
- Consider a `photo` clue (a detail, a viewpoint, or an old archive picture of the place). Use a file the user supplies, or one you found with a licence that allows reuse. Never hot-link: `src` is a path under `content/`. Audio only from files the user supplies.
  - **Where to find openly licensed images.** The Rijksmuseum's photos are CC0 and on Wikimedia Commons. Search Commons for files (namespace 6), then ask for the licence and a thumbnail URL:

    ```bash
    curl -sS -A "pinpoint-quest-research/1.0" "https://commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6&srsearch=WORDS&format=json&srlimit=15"
    curl -sS -G -A "pinpoint-quest-research/1.0" https://commons.wikimedia.org/w/api.php --data-urlencode action=query --data-urlencode "titles=File:NAME" --data-urlencode prop=imageinfo --data-urlencode "iiprop=url|size|extmetadata" --data-urlencode iiurlwidth=1000 --data-urlencode format=json
    ```

    Wikimedia throttles quick bursts and then answers with an HTML error page instead of JSON. Wait a few seconds between requests, send a User-Agent, and check that a download is really an image (`file x.jpg`).
  - **Only use** `LicenseShortName` CC0, public domain, CC BY or CC BY-SA. Write the source URL and licence down for the pull request.
  - **Prepare the file.** Crop away mounts and printed captions, which may give the answer away. Keep it at most 1200 px wide, save it as JPEG under `content/media/<quest-id>/`, give it an `alt`, and look at the result.
  - **A picture of something that is gone** (a demolished house, a lost tower) does not help anyone find the spot. It is atmosphere: show it from the start, or tell its story after arrival, rather than making it a hint that costs a star.
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

Then run the playtest script next to this skill. It plays every pin as a player would and writes a screenshot of each step at 360×640:

```bash
node .claude/skills/write-quest/playtest.cjs <quest-id> <scratchpad>/playtest
```

What the script does, in order:
1. With local expert on, it shows the first pin's opening clue.
2. For each pin, it stands 240 m away, reads the first clue and asks for every hint in turn.
3. It walks to the pin, checks in and goes through every page after arrival.
4. It ends on the quest page.

**Look at every screenshot.** Check that each text fits, that each hint helps more than the one before, and that facts and questions read well in order. Paste a few side by side to compare quickly. The round icon at the right edge is the test tools' button, and it only shows in development. The script prints page errors, and should print none.

To try something by hand, open `http://localhost:3000/quest/<quest-id>/find/<pin-id>?sim=LAT,LNG,10` to stand anywhere. The test tools (round icon → **Location**) can also walk you to the pin.

## 6. Hand over

You cannot stand at the pins; a person has to. When opening the pull request (or reporting back), include:

- A short summary of the quest and its route, with total walking distance.
- **Per pin:** the sources for every fact, and what still needs checking on site (is the detail visible, is the position right, is the GPS good enough for the radius, is it safe to stand there).
- **Media:** for each file, its source URL and licence. Also add a line to the Credits in `README.md`.
- **Conflicts:** any facts where sources disagreed, and what you chose.
- A note that a reviewer can stand at every pin in the preview deployment with the test tools.

Do not describe the quest as ready to publish until someone has walked it.
