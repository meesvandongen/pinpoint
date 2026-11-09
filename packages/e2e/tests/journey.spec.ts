import { expect, test } from '@playwright/test'
import { collectProblems, countAcrossPages, expectNoClipping, lookForPin, PINS, samplePhoto } from './helpers'

// A whole game on a phone: find three pins, collect stamps, photos and extra marks, finish the quest,
// make the collage, look at the book. Run on a normal phone and on a very small one.
for (const [name, viewport] of [
  ['a phone', { width: 390, height: 780 }],
  ['a very small phone', { width: 320, height: 568 }],
] as const) {
  test.describe(name, () => {
    // Reduced motion: the pages do not turn, so a measurement never catches one halfway.
    test.use({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' })

    test('plays the sample quest from start to finish', async ({ page }) => {
      const problems = collectProblems(page)

      async function arrive(pin: keyof typeof PINS, { quiz }: { quiz: boolean }) {
        const [lat, lng] = PINS[pin]
        await page.goto(`/quest/tilburg-textile?sim=${lat},${lng},10`)
        await lookForPin(page)
        await expect(page.getByTestId('status')).toHaveText('You are here.')
        await expectNoClipping(page, `play ${pin}`)
        await page.getByRole('button', { name: 'Check in' }).click()

        // Page 1: the stamp
        await expect(page.locator('.big-stamp')).toBeVisible()
        await expectNoClipping(page, `stamp ${pin}`)
        await page.getByRole('button', { name: 'Next' }).click()

        // Page 2: the photo
        await page.getByTestId('photo-input').setInputFiles({ name: 'photo.jpg', mimeType: 'image/jpeg', buffer: await samplePhoto(page) })
        await expect(page.getByTestId('photo-preview')).toBeVisible()
        await expectNoClipping(page, `photo ${pin}`)
        await page.locator('.foot .btn.primary').click()

        // Page 3: the question, where there is one
        if (quiz) {
          await expect(page.locator('.quiz-page')).toBeVisible()
          await expectNoClipping(page, `quiz ${pin}`)
          await page.locator('.options .btn').first().click()
          await expect(page.locator('.options .btn.right')).toHaveCount(1)
          await page.locator('.foot .btn.primary').click()
        }
      }

      // Home → the quest, with the position suggesting Tilburg
      await page.goto('/?sim=51.5629,5.0768,10')
      await expect(page.locator('.row', { hasText: 'Tilburg' }).getByText('near you')).toBeVisible()
      await expectNoClipping(page, 'home')
      await page.locator('.row', { hasText: 'Tilburg' }).click()
      await expect(page.locator('.quest')).toHaveCount(2)
      await expectNoClipping(page, 'quests')
      await page.locator('.quest', { hasText: 'Wool city' }).click()
      await expect(page.locator('.slot')).toHaveCount(3)
      await expect(page.locator('.slot.open')).toHaveCount(1) // in order: only the next pin can be played
      await expect(page.locator('.slot.locked')).toHaveCount(2)
      await expectNoClipping(page, 'quest page')
      await lookForPin(page)
      await expect(page.getByTestId('distance')).toHaveText('240 m')
      await expectNoClipping(page, 'play')

      // Hints open one at a time, on request: a button says so, how many are left, and what the next one costs.
      // Distance is on screen from the start, so one of the three points is already spent.
      const more = page.getByRole('button', { name: /Get another hint/ })
      const points = (n: number) => page.getByRole('img', { name: `${n} of 3 points still to earn` })
      await expect(points(2)).toBeVisible()
      await expect(more).toContainText('3 hints left')
      await expect(more).toContainText('costs a point')
      await expect(page.getByRole('tab')).toHaveCount(0)
      await more.click()
      await expect(page.getByTestId('arrow')).toBeVisible()
      await expect(more).toContainText('2 hints left')
      await expect(points(1)).toBeVisible()
      await more.click()
      await expect(page.getByRole('tab')).toHaveCount(2)
      await expect(points(0)).toBeVisible()
      await expect(page.locator('.mapview, .areamap').first()).toBeVisible()
      await expectNoClipping(page, 'play with the map')

      await arrive('chimney', { quiz: true })
      await arrive('market', { quiz: false })
      await arrive('harbour', { quiz: false })

      // The finish: the quest stamp and the collage
      await page.waitForURL(/\/done$/)
      await expect(page.getByTestId('collage')).toBeVisible({ timeout: 30_000 })
      await expectNoClipping(page, 'done')
      const collage = await page.evaluate(async () => {
        const img = document.querySelector<HTMLImageElement>('[data-testid=collage]')!
        const blob = await (await fetch(img.src)).blob()
        return { width: img.naturalWidth, height: img.naturalHeight, bytes: blob.size, type: blob.type }
      })
      expect(collage).toMatchObject({ width: 1080, height: 1350, type: 'image/png' })
      expect(collage.bytes).toBeGreaterThan(50_000)
      await expect(page.getByRole('link', { name: 'Save collage' })).toHaveAttribute('download', 'tilburg-textile-collage.png')

      // The quest page: every pin on its own page, the photos taped over the stamps
      await page.goto('/quest/tilburg-textile')
      await expect(page.locator('.slot').first()).toBeVisible()
      expect(await countAcrossPages(page, '.slot')).toBe(4) // three pins and the quest stamp, over as many pages as fit
      await expectNoClipping(page, 'quest page with stamps')
      await expect(page.locator('.points').first()).toBeVisible()
      // Back to the first page, if there are several
      const previous = page.getByRole('button', { name: 'Previous page' })
      while ((await previous.count()) > 0 && (await previous.isEnabled())) await previous.click()
      // Lift a photo to show the stamps under it, then open the pin
      const flap = page.locator('.flap').first()
      await expect(flap).toHaveAttribute('aria-expanded', 'false')
      await flap.click()
      await expect(flap).toHaveAttribute('aria-expanded', 'true')
      await expect(page.locator('.slot.lifted')).toHaveCount(1)
      await page.locator('.slot.lifted .hit').click()
      await expect(page.locator('.detail-stamp')).toBeVisible()
      // Quiz and photo, plus the dark or sunrise mark when the test runs at such an hour
      await expect(page.locator('.extras-list li').nth(1)).toBeVisible()
      expect(await page.locator('.extras-list li').count()).toBeGreaterThanOrEqual(2)
      await expectNoClipping(page, 'book pin')

      // The progress survives a reload
      await page.reload()
      await expect(page.locator('.detail-stamp')).toBeVisible()

      // Dutch
      await page.goto('/settings')
      await page.getByRole('radio', { name: 'Nederlands' }).click()
      await expect(page.getByRole('heading', { name: 'Instellingen' })).toBeVisible()
      await page.goto('/')
      await expect(page.locator('.cover p')).toHaveText('Vind echte plekken. Verzamel stempels.')

      expect(problems).toEqual([])
    })
  })
}

test.describe('the clue deck', () => {
  test.use({ viewport: { width: 390, height: 780 } })

  test('keeps distance and direction out of a local expert’s way', async ({ page }) => {
    await page.goto('/settings')
    await page.getByRole('switch', { name: 'Local expert' }).click()
    await page.goto('/quest/tilburg-textile?sim=51.5629,5.0768,10')
    await lookForPin(page)
    await expect(page.getByText('“Look for the old chimney')).toBeVisible()
    await expect(page.getByTestId('distance')).toHaveCount(0)
    await expect(page.getByTestId('arrow')).toHaveCount(0)
  })

  test('a quest in any order lets the player pick the pin', async ({ page }) => {
    await page.goto('/quest/tilburg-green?sim=51.5629,5.0768,10')
    await expect(page.locator('.slot.open')).toHaveCount(3)
    await expect(page.locator('.slot.locked')).toHaveCount(0)
    await lookForPin(page, 'The pond')
    await expect(page.getByText('“Ducks know the way.”')).toBeVisible()
  })

  test('a pin that is not open yet cannot be played', async ({ page }) => {
    await page.goto('/quest/tilburg-textile')
    await expect(page.locator('.slot.locked')).toHaveCount(2)
    // Asking for a later pin by its address leads back to the page of the quest.
    await page.goto('/quest/tilburg-textile/find/harbour')
    await expect(page).toHaveURL(/\/quest\/tilburg-textile$/)
  })
})

test.describe('moving around', () => {
  test.use({ viewport: { width: 390, height: 780 }, reducedMotion: 'reduce' })

  test('Back never walks in circles, Home is always close, and a started quest can be resumed', async ({ page }) => {
    await page.goto('/place/tilburg?sim=51.5607,5.0768,10')
    await page.getByRole('button', { name: /Wool city/ }).click()
    await expect(page.getByRole('link', { name: 'Start' })).toBeVisible()
    await page.getByRole('link', { name: 'Start' }).click()
    await page.getByRole('button', { name: 'Check in' }).click()
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByRole('button', { name: 'Skip' }).click()
    await page.getByRole('button', { name: 'Skip' }).click()

    // Back on the quest page, which now offers to go on, and Back leads to the list it was chosen from.
    await expect(page).toHaveURL(/\/quest\/tilburg-textile$/)
    await expect(page.getByRole('link', { name: 'Continue' })).toBeVisible()
    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page).toHaveURL(/\/place\/tilburg(\?|$)/)

    // Forward again, then the home shortcut, which offers the started quest.
    await page.getByRole('button', { name: /Wool city/ }).click()
    await page.getByRole('link', { name: 'Home' }).click()
    await expect(page).toHaveURL(/\/(\?.*)?$/)
    const resume = page.locator('.row.resume')
    await expect(resume).toContainText('Wool city')
    await expect(resume).toContainText('1/3')
    await expectNoClipping(page, 'home with a started quest')
    await resume.click()
    await expect(page).toHaveURL(/\/quest\/tilburg-textile$/)
    // Back from a quest entered from Home returns to Home.
    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page).toHaveURL(/\/(\?.*)?$/)
  })

  test('hints asked for stay used when the player leaves the pin and comes back', async ({ page }) => {
    await page.goto('/quest/tilburg-textile/find/chimney?sim=51.5629,5.0768,10')
    const points = (n: number) => page.getByRole('img', { name: `${n} of 3 points still to earn` })
    await expect(points(2)).toBeVisible()
    await page.getByRole('button', { name: /Get another hint/ }).click()
    await expect(page.getByTestId('arrow')).toBeVisible()
    await expect(points(1)).toBeVisible()

    // Leave through the quest page and come back: the compass is still open, the point still spent.
    await page.getByRole('button', { name: /All pins/ }).click()
    await page.locator('.slot.open').click()
    await expect(page.getByTestId('arrow')).toBeVisible()
    await expect(points(1)).toBeVisible()
    await expect(page.getByRole('button', { name: /Get another hint/ })).toContainText('2 hints left')

    // And it survives closing the app.
    await page.reload()
    await expect(page.getByTestId('arrow')).toBeVisible()
    await expect(points(1)).toBeVisible()
  })
})
