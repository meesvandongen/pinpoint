# Writing a pin people remember

[content.md](content.md) says what a quest file may contain, and [contributing.md](contributing.md) how to get it in. This page is about what to put in it: how to find a place worth walking to, how to research it, and how to write clues, facts, questions and a photo prompt that make the walk the fun part.

A pin works when the player has to **look at the city** to find it, and when, standing there, they **notice something they had walked past before**. Everything below serves one of those two things.

## 1. Pick the place

Most of the work is here. A good pin is a place with a story you can see.

**Good places have:**

- **A visible detail with a reason behind it.** A wall anchor with a year on it, a street that bends around a moat that is gone, a gable stone, a bricked-up door, a name in the pavement, a bollard made from an old cannon. The detail is the reward; the reason is what the facts, the questions and the photo prompt are about.
- **A surprise.** Something most locals do not know: why the street is called that, what the building used to be, what stood here before. "The oldest house in town" is fine; "the oldest house in town is hidden behind a shop front from 1960" is a pin.
- **Something you can only learn by standing there.** If the whole pin can be solved from a sofa with a search engine, it is a trivia question, not a pin.
- **A clear point to stand on.** A square, a corner, a bridge, the front of a building. Not "somewhere in the park".

**Avoid:**

- Places that are not public, or not safe to stand still in: private gardens, courtyards behind a gate, building sites, roadsides without a pavement, the middle of a cycle path.
- Things that may be gone next month: a shop, a mural on a building up for renovation, a temporary art work, a sign, a view that only exists when the trees are bare. If the pin depends on it, the quest breaks when it goes.
- The obvious landmark with nothing to add. The big church can be a pin, but then the pin is about the gargoyle on the north side, not "find the church".
- Anything that sends players onto someone's doorstep or into a place of worship during a service.

**A quick test.** Before you write anything, finish these three sentences. If you cannot, pick another place.

1. *The player walks here because…* (the clue's hook)
2. *Once here, they look at…* (the detail; becomes the photo prompt)
3. *They leave knowing…* (the story; becomes the facts and questions)

## 2. Research it

Facts in a quest are checked by people standing in front of them. Get them right.

**Where to look**

| Source | Good for |
| --- | --- |
| Heritage registers (in the Netherlands the [Rijksmonumentenregister](https://monumentenregister.cultureelerfgoed.nl), and the municipal monument lists) | Construction dates, original use, what is protected and why. Usually the most reliable short description of a building. |
| Local archives, historical societies, their image banks | Old photos, what stood here before, street name origins. |
| Historical maps ([Topotijdreis](https://www.topotijdreis.nl) for the Netherlands, old city plans in the archive) | Filled-in canals, old walls, railway lines, how a street got its bend. |
| [OpenStreetMap](https://www.openstreetmap.org) | Exact positions, the tags that give the pin its `category` (see `packages/core/src/osm.ts`), what is a footpath and what is not. |
| Wikipedia and local wikis | A starting point and their sources. Check anything surprising against a second source. |
| Plaques, information boards, gable stones on site | Often the best fact of all, and a natural question. |
| Street-level imagery (Mapillary, the big map apps) | Whether the detail is still there and visible from the street. Not a substitute for going. |

**What to write down for every pin**

- The **position** to stand at (see below), and where you got it.
- The **detail** and whether it is visible from public ground, at any time of day and year.
- Two or three **facts**, each with its source. Put the sources in the pull request description; they do not go in the file.
- **What is nearby** that could be confused with it: another chimney, a second bridge, a similar gable. A clue that fits two places is a bad afternoon.

**Go there.** Nobody should merge a pin that nobody has stood at. Check that the detail is visible, take the coordinates where you stand, note how good the GPS is (narrow streets and tall buildings make it worse), and see what the place is like at the time of day people will play.

## 3. Place it

- **`position` is where the player stands, not the middle of the building.** For a tower, that is the square it rises from; for a gable stone, the pavement opposite. Take it on site or from OpenStreetMap, never from a guess on a satellite photo.
- **`radius`** is how close counts as arrived. 30–50 m suits most pins: GPS in a street is rarely better than 20 m. Go larger (60–120 m) for a park, a big square, or a place among tall buildings; smaller only in open ground with a good fix.
- Two pins must be further apart than their radius; the content check says when they are not.

## 4. Write the clues

Clues are shown in the order they are listed. The ones without a `reveal` show from the start and are free; the ones with `"reveal": { "onRequest": true }` are **hints** the player asks for, one at a time. Every pin starts with three stars, and asking for hints or answering questions wrong can cost them; [content.md](content.md#stars) has the exact rule. In short: the more hints and questions a pin has, the more slips it forgives, so a pin with many hints lets the player ask for a few before it costs anything.

**Think of the clues as a ladder.** Each hint should usually make the pin a little easier than the one before, so a player who asks for one more gets one step closer, not the answer. Which clues you use, and in what order, is up to you and the place. Some ingredients:

- **A clue that shows from the start.** Usually a text clue or a photo. It should be enough on its own for someone who knows the city, because **local expert** mode hides distance, direction and map.
- **A narrower riddle or a `wordShape`.** A second angle on the place, or the shape of the name on the plaque.
- **A `photo`.** A detail, a viewpoint or an old picture of the place. Depending on what it shows it can be the opening clue, a mid-way hint or nearly the answer.
- **`map` with `"view": "area"`.** Says roughly where without saying exactly.
- **`direction` and `distance`.** The most direct help, so they usually work best as hints near the end. A pin that is meant to be an easy walk can show them from the start.

A pin with one riddle and a distance hint is fine. A pin with a photo and nothing else can be great. A pin whose first clue is a full map is a walk, not a game, unless that is what you want for that stop.

**Writing the text clue (140 characters)**

- **Point at what is there, not at what it is called.** "Find the town hall" is a lookup. "Two lions guard the door where every couple in town says yes" is a pin.
- **Use the story.** The thing it used to be, what the name means, a number, a date, who built it. The surprise you found in research is the best clue.
- **Be fair.** The player should groan when they find it, not feel cheated. Every word should be true of this place and of no other place nearby.
- **Give a direction of travel when the area is large.** "Downhill from the last stamp", "where the old wall met the river".
- **Write for a stranger.** No in-jokes, no "you know the one". Read it aloud to someone who was not there.
- **Concrete beats clever.** Colours, materials, numbers, animals, faces, words carved in stone.

| Weak | Better |
| --- | --- |
| Find the old church. | Its weathercock has watched the market for six hundred years. Stand where it can see you. |
| Go to the bridge. | The only bridge in town that was built to open. Look for its counterweight. |
| A building with a story. | Every brick here was once a cow's worth of wool. Find the chimney that still says whose. |

**A `wordShape`** turns a name you can read on site into a hint: the name on a plaque, a word in a gable stone, a carved motto. It is most fun when the word is visible once you are there.

**A `photo` clue** is often the most fun clue of all: the player has to match a picture to the street. It can be:

- **A detail** from a spot the player can find: a door knocker, a carved face, a date on a wall. Crop it so it is recognizable from close by and puzzling from afar.
- **A viewpoint:** the place seen from where the player should stand, or a view from the pin of something further away.
- **An old picture** of the place from an archive, so the player has to find what is still the same.

Use a photo you took, or one whose licence allows it (many archives and Wikimedia Commons have openly licensed images); put the file under `content/media/`, give it an `alt` text, and say in the pull request where it comes from and under which licence. Keep it under 1200 pixels wide.

**An `audio` clue** fits a place with a sound: a carillon, a mill, a ferry horn, a market crier. Record it yourself.

## 5. After arrival: facts, questions, the photo

After check-in the player turns pages: the stamp, then the pin's `arrival` list in the order you write it. It can hold as many facts and questions as the place deserves, and says where the one photo page goes. A good order tells a small story: a fact that sets up a question, a question whose answer a fact then explains, the photo last as the souvenir. Keep it short: two to four pages after the stamp is plenty for most pins, and each page has to fit on a screen that does not scroll.

### Facts

A `fact` (240 characters) is the reward for arriving: the surprise from your research, told now that the player is standing in front of it.

- **Tie it to what they see.** "The bricked-up door on your left was the entrance for the horses." beats "The building dates from 1890."
- **One fact per page.** If you have two good ones, use two pages, or a fact and a question.
- **Sourced,** like everything else.

### Questions

A `quiz` has two to four answers (48 characters each). Answering earns the quiz mark, and a wrong answer can cost a star, so a question should make the player **look**, not guess.

- **Answerable by looking.** "How many lions guard the door?" "What year is on the wall anchor?" "What animal is carved above the arch?" The answer is in front of them.
- **Or a fact that rewards the walk.** If it cannot be seen, it should be the surprise from your research: what the building used to be, what the name means. Then the answers teach something whichever one is picked.
- **Plausible wrong answers.** All options should sound possible to someone who has not looked. "Wool cloth / Bicycles / Cheese" for a textile town is too easy; "Wool cloth / Linen / Leather" makes them look at the chimney.
- **Not opinions, not things that change** (opening hours, what is in the shop window).

### The photo page

Every pin has exactly one photo page. Leave it out of the list and it comes right after the stamp with a general suggestion; list it as `{ "type": "photo", "prompt": … }` to choose its place and its prompt (100 characters). Photos end up side by side in a collage, so:

- **Ask for a detail or a point of view,** not "a photo of the building": "the face above the door", "the tower framed by the arch", "your reflection in the canal".
- **Vary them across the quest:** one close-up, one wide, one with the player in it, one at an odd angle. A collage of six façades is dull.
- **Point at what the clues and facts talked about,** so the photo becomes the memory of the story.

## 6. The stamp

- Pick the most specific **`category`** that fits (`chimney` rather than `industrial`). It chooses the icon. The list is in [content.md](content.md#categories), and OpenStreetMap tags map to it in `packages/core/src/osm.ts`.
- The pin **`title`** (40 characters) is printed on the stamp. Name the place as a local would, not the clue: "The wool chimney", not "Find the chimney".
- Leave `stamp` out unless you want a particular shape or ink; it is chosen from the category and the id.

## 7. Make the quest more than its pins

- **A theme.** "Wool city", "The vanished canals", "Where the walls were". A theme turns facts into a story, and makes the title and description easy to write.
- **A route, or not.** Three to eight pins is a good size, an hour's walk or less. Choose the order to fit the quest; neither is the default:
  - `"order": "linear"` gives one pin at a time. It suits a short quest that tells a story in sequence, where each pin leads to the next and the walk ends somewhere pleasant (a square, a café-lined street, a view). The catch: a player stuck on one pin cannot go on, so it works best when the pins are few and none is very hard.
  - `"order": "free"` lets the player pick. It suits a longer quest, pins that are spread out, or pins that are hard: a player who is stuck can try another and come back later. You can still suggest a route in the description.
- **Vary the pins.** Mix big and small, a riddle-only pin for locals, a pin that needs a hint, one that is about looking up, one about looking down.
- **Think about the extra marks.** A pin that is lit at night or faces the sunrise invites the after-dark and sunrise marks; a bridge or a harbour is a good place to be in the rain.
- **The description (240 characters)** says what the walk is about, how long it is, and where it starts.

## Checklist

Before you open the pull request, every pin should pass these:

- [ ] I have stood there. It is public, safe to stand still in, and the detail is visible from there.
- [ ] `position` is where the player stands; `radius` suits the GPS there.
- [ ] The first clue alone finds it for someone who knows the city (try **local expert** in the settings).
- [ ] No clue fits another place nearby.
- [ ] The hints go from less to more help, and distance, direction and map are only on screen from the start if the pin is meant to be easy.
- [ ] The facts are tied to what the player sees, and each fits on one page.
- [ ] Each question can be answered by looking, or teaches the surprise; the wrong answers are plausible.
- [ ] The photo prompt asks for a detail or a point of view, and differs from the other pins.
- [ ] Every fact has a source, listed in the pull request description.
- [ ] Every photo or sound is mine, or has a licence that allows it, and the description says which.
- [ ] `pnpm run content` passes, and I have played the quest in the dev server with the test tools.

## A worked example

An illustration with an invented place, so the parts can be seen together:

```json
{
  "id": "wool-chimney",
  "title": { "en": "The wool chimney", "nl": "De wolschoorsteen" },
  "category": "chimney",
  "position": { "lat": 52.0000, "lng": 5.0000 },
  "radius": 45,
  "clues": [
    { "type": "text", "text": { "en": "A factory that is now flats still signs its name in white brick, forty metres up.", "nl": "Een fabriek die nu woningen is, zet nog steeds haar naam in witte steen, veertig meter hoog." } },
    { "type": "wordShape", "word": { "en": "Van Dijk", "nl": "Van Dijk" }, "reveal": { "onRequest": true } },
    { "type": "map", "view": "area", "reveal": { "onRequest": true } },
    { "type": "direction", "reveal": { "onRequest": true } },
    { "type": "distance", "reveal": { "onRequest": true } }
  ],
  "arrival": [
    {
      "type": "quiz",
      "question": { "en": "What did the boilers under this chimney power?", "nl": "Wat dreven de ketels onder deze schoorsteen aan?" },
      "options": [ { "en": "Wool looms", "nl": "Weefgetouwen" }, { "en": "A brewery", "nl": "Een brouwerij" }, { "en": "A tram line", "nl": "Een tramlijn" } ],
      "answer": 0
    },
    { "type": "fact", "text": { "en": "Two steam engines down there drove three hundred looms. When the factory closed, the town kept the chimney as a landmark.", "nl": "Twee stoommachines dreven hier driehonderd weefgetouwen aan. Toen de fabriek sloot, hield de stad de schoorsteen als herkenningspunt." } },
    { "type": "photo", "prompt": { "en": "Look straight up the chimney from its foot.", "nl": "Kijk vanaf de voet recht omhoog langs de schoorsteen." } }
  ]
}
```

Why it works: the first clue gives a hook (a name, a height, a change of use) that only fits one chimney; the hints narrow it step by step and the most direct help comes last; with four hints and a question it forgives two slips before a star goes; after arrival, the question makes the player think about the chimney and the fact explains the answer; the photo comes last and gives the collage an unusual angle.
