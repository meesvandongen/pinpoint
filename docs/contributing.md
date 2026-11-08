# Adding a quest

A quest is one JSON file. You do not need to run the game to write one, but it is much easier to get right when you do. The format is in [content.md](content.md).

## 1. Write it

Either way, the file ends up in `content/quests/<id>.json`:

- **In the editor.** Open `/admin` on the game's site, sign in with GitHub (or paste a token) and use the forms: maps for the pins and the area, a list for the clues, a preview that runs the game's own checks. Every save is a commit on a branch of its own; **Review & publish** opens a pull request. You need write access to the repository.
- **As a file.** Fork the repository, copy `content/quests/tilburg-textile.json`, and change it. This works for everyone.

Locations are the same, under `content/locations/`. Only add one when the place has no outline yet: a quest shows up under every location whose outline overlaps its area.

## 2. Check it

```sh
pnpm install
pnpm run content
```

It reports what is wrong, file by file: bad coordinates, texts that are too long, a language missing from a text, pins that sit inside each other, files that do not exist.

## 3. Play it

```sh
pnpm --filter pinpoint-app dev      # http://localhost:3000
```

The dev server and every preview deployment have the **test tools** on: open the quest, tap the round icon at the right edge, and use **Location** to stand at the pin, 240 m away, or in a street with a bad GPS fix; **Time and weather** to check the after-dark, sunrise and rain marks; **Mocks** to see the copy of the content that the editor works on. A link such as `/?sim=51.5607,5.0768` opens the game with the player standing there.

Walk through the whole quest at least once: read every clue as a stranger would, check the arrival radius feels right, and try it with **local expert** on in the settings.

## 4. Open the pull request

Every pull request gets a **preview deployment** with your quest in it and the test tools on, so a reviewer can stand at each pin without leaving their desk. Put the preview link in the description, and say which parts are worth a look.

CI runs `pnpm run content`, the unit tests and a browser run of the game.

## What makes a good quest

- **Public places only.** Pins must be somewhere anyone can stand, in daylight, without trespassing. No private gardens, no railway tracks, no roadsides without a pavement.
- **Short.** Three to eight pins, within a walk of an hour or so. Say in the description how far it is.
- **One thing to find at a time.** The clue says where; the quiz and the photo prompt say what to look at once you are there.
- **Clues that survive a bad day.** Do not make a pin depend on a shop being open, a sign that may be taken down, or a view that is only there in winter.
- **Writing for a screen that does not scroll.** Hints are 140 characters or fewer. If it needs more, it is two clues.
- **Languages are optional.** One language is fine. If you add more, add them everywhere, and always include the default.
- **Photos and sounds you may share.** Only add files you took or made, or that have a licence that allows it, and say where in the description.
