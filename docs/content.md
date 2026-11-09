# Content format

Everything the game shows lives in `content/`, as JSON. `pnpm run content` checks all of it, and CI runs the same check on every pull request.

```
content/
  locations/<id>.json     a place and its outline
  quests/<id>.json        a quest and its pins
  media/…                 photos and sounds that clues point at (optional)
```

**The file name is the id.** `tilburg-textile.json` is the quest `tilburg-textile`; the file does not repeat it. Ids use lowercase letters, digits and dashes.

## Coordinates

Points and corners are `{ "lat": 51.5607, "lng": 5.0768 }`: latitude first, WGS 84 degrees. This is what the editor's map fields write, and what you get when you copy a pair from a map app. A polygon is a list of corners and closes itself.

## Locations

```json
{
  "name": { "en": "Tilburg", "nl": "Tilburg" },
  "polygon": [
    { "lat": 51.52, "lng": 5.02 },
    { "lat": 51.52, "lng": 5.14 },
    { "lat": 51.6, "lng": 5.14 },
    { "lat": 51.6, "lng": 5.02 }
  ]
}
```

A location is only a name and an outline. There is no parent: a player inside the outlines of Tilburg, Noord-Brabant and the Netherlands is offered all three, smallest first. Draw as much detail as the place needs; a rough box is fine for a city.

## Quests

```json
{
  "title": { "en": "Wool city", "nl": "Wollenstad" },
  "description": { "en": "Three stops in the old textile quarter." },
  "defaultLanguage": "en",
  "order": "linear",
  "area": [ { "lat": 51.55, "lng": 5.06 }, … ],
  "pins": [ … ]
}
```

| Field | | |
| --- | --- | --- |
| `title` | required | Up to 40 characters. |
| `description` | optional | Up to 240 characters. |
| `defaultLanguage` | `en` | Shown when a player's language has no text. Every text that lists languages has to include it. |
| `order` | `linear` | `linear`: one pin at a time. `free`: the player picks. |
| `area` | the pins, plus 150 m | Where the quest is played. A quest shows under every location whose outline overlaps its area. |
| `pins` | required | 1 to 24. |

### Pins

```json
{
  "id": "chimney",
  "title": { "en": "The chimney", "nl": "De schoorsteen" },
  "category": "chimney",
  "position": { "lat": 51.5607, "lng": 5.0768 },
  "radius": 50,
  "clues": [ … ],
  "arrival": [ … ],
  "stamp": { "shape": "round", "ink": "#5b34a8" }
}
```

| Field | | |
| --- | --- | --- |
| `id` | required | Unique in the quest. Saved stamps are filed under it, so do not change it once the quest is out. |
| `title` | required | Up to 40 characters. Printed on the stamp. |
| `category` | `other` | The kind of place. Picks the icon on the stamp. See below. |
| `position` | required | The centre of the place. |
| `radius` | 40 | Metres around the position that count as arrived, 10 to 500. GPS in a street is rarely better than 20 m, so do not go below that without a reason. |
| `clues` | required | At least one. |
| `arrival` | `[]` | The pages after check-in: facts, questions, and where the photo page goes. Up to 8. See below. |
| `stamp` | optional | `shape` (`round`, `postage`, `hex`, `ticket`, `oval`), `ink` (a `#rrggbb` colour) and `icon` (a category). Anything left out is chosen from the category and the pin id. |

Two pins closer together than their radius are rejected: arriving at one would be arriving at both.

### Clues

A pin gives its clues in order, and any clue can be left out. A pin with only a riddle is for players who know the city.

| `type` | Fields | Shows |
| --- | --- | --- |
| `text` | `text` (up to 140 characters) | A hint or a riddle. |
| `distance` | | How far the player is. |
| `direction` | | A compass: an arrow towards the pin that follows the phone's compass. |
| `map` | `view`: `full` (default) or `area` | The pin and its arrival circle, or only a loose circle that contains it. |
| `photo` | `src`, `alt` (optional) | A picture. `src` is a path under `content/`, never a web address. |
| `audio` | `src`, `caption` (optional) | A sound. |
| `wordShape` | `word`, `showFirstLetter` (default true) | The shape of a word to find: `D_ S__________`. |

Every clue can also have a `reveal`:

```json
{ "type": "direction", "reveal": { "onRequest": true } }
{ "type": "map", "view": "area", "reveal": { "onRequest": true } }
```

Without one, a clue shows from the start. With `onRequest` it is a **hint**: it waits until the player asks for it. Hints come one at a time, in the order of the list. Asking for a hint can cost a star; see [Stars](#stars). A reveal that names anything else, such as the old `afterSeconds`, is rejected. Players can also switch on **local expert** in the settings, which hides `distance`, `direction` and `map` everywhere. It only ever makes a quest harder, so a quest should still work with just its text.

A clue type this version of the game does not know is kept in the file and skipped when playing, so newer content does not break older apps.

### After arrival

After check-in the player turns pages: first the stamp, then the pin's `arrival` steps in the order they are listed.

```json
"arrival": [
  { "type": "fact", "text": { "en": "The chimney is 42 m tall." } },
  {
    "type": "quiz",
    "question": { "en": "What did the buildings around you produce?" },
    "options": [ { "en": "Wool cloth" }, { "en": "Linen" }, { "en": "Leather" } ],
    "answer": 0
  },
  { "type": "fact", "text": { "en": "The factory closed in 1975." } },
  { "type": "photo", "prompt": { "en": "Photograph the base of the chimney." } }
]
```

| `type` | Fields | Shows |
| --- | --- | --- |
| `fact` | `text` (up to 240 characters) | Something to tell the player now that they are here. |
| `quiz` | `question` (120), `options` (two to four, 48 each), `answer` (counts from 0) | A question. Answering earns the quiz mark, right or wrong; a wrong answer can cost a star. |
| `photo` | `prompt` (optional, 100) | The photo page, with a suggestion. |

Every pin has exactly one photo page, because every pin has one place in the collage. List it to choose where it goes and what it suggests; leave it out and it comes right after the stamp, with a general suggestion. Listing it twice is an error. Facts and questions can be repeated as often as the pin needs.

A step type this version of the game does not know is kept and skipped, like clues.

### Stars

Every pin starts with three stars. Two things can cost one: **asking for a hint** and **answering a question wrong**. A pin's chances are its hints (clues with `onRequest`) plus its questions; clues that show from the start are free.

The stars stay at three as long as at least three chances are untouched. So a pin with five chances forgives two slips: the third costs a star, and if everything goes wrong, none are left. A pin with three chances or fewer counts as having three, so there every slip costs a star. Skipping a question is not a slip.

Stars never unlock or block anything. **Local expert** hides `distance`, `direction` and `map`, so those hints cannot be asked for, and a quest should still work with just its text.

## Languages

Any text is either a plain string, shown in every language, or a map of language code to text:

```json
"title": "Tilburg"
"title": { "en": "Wool city", "nl": "Wollenstad" }
```

A map has to include the quest's `defaultLanguage`. The game shows the player's language when there is one, and falls back to the default.

## Length limits

Text has to fit on a screen that never scrolls, so each kind of text has a limit, checked per language: titles and names 40, hints 140, photo suggestions 100, questions 120, answers 48, descriptions 240, captions 100, a word-shape word 32.

## Categories

`category` is one of: other, building, house, industrial, chimney, mill, farm, religious, church, civic, education, culture, theatre, library, health, sports, hotel, food, pub, shop, castle, tower, lighthouse, clock, square, market, street, station, bridge, harbour, water, fountain, nature, tree, park, garden, playground, viewpoint, monument, memorial, ruins, art, cemetery, attraction, zoo.

Each has a parent it falls back to (`chimney` → `industrial` → `building` → `other`). `packages/core/src/osm.ts` maps OpenStreetMap tags to these, and a test checks the mapping against the most used values on taginfo, so a category is only added where people actually map things that have none. To add one, add it to `packages/core/src/categories.ts` and draw its icon in `packages/app/src/stamps/icons.ts`; the app does not compile until it has one.

## Photos and sounds

Put files under `content/media/` (or anywhere under `content/`) and point at them with a path relative to `content/`, such as `media/chimney.jpg`. Web addresses are refused: a picture hosted elsewhere could change after review, and its host would learn who is playing. The check fails when a file is missing. Keep pictures small: a clue photo does not need to be wider than 1200 pixels.
