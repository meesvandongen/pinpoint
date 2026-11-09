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

      async function arrive(pin: keyof typeof PINS, { quiz, fact = false }: { quiz: boolean; fact?: boolean }) {
        const [lat, lng] = PINS[pin]
        await page.goto(`/quest/tilburg-textile?sim=${lat},${lng},10`)
        await lookForPin(page)
        await expect(page.getByTestId('status')).toHaveText('You are here.')
        await expectNoClipping(page, `play ${pin}`)
        await page.getByRole('button', { name: 'Check in' }).click()

        // First the photo, which shows at once while it is saved behind the scenes
        await page.getByTestId('photo-input').setInputFiles({ name: 'photo.jpg', mimeType: 'image/jpeg', buffer: await samplePhoto(page) })
        await expect(page.getByTestId('photo-preview')).toBeVisible()
        await expectNoClipping(page, `photo ${pin}`)
        await page.locator('.foot .btn.primary').click()

        // Then what the pin lists after the photo: a fact, a question
        if (fact) {
          await expect(page.locator('.fact-page')).toBeVisible()
          await expectNoClipping(page, `fact ${pin}`)
          await page.locator('.foot .btn.primary').click()
        }
        if (quiz) {
          await expect(page.locator('.quiz-page')).toBeVisible()
          await expectNoClipping(page, `quiz ${pin}`)
          await page.locator('.options .btn').first().click()
          await expect(page.locator('.options .btn.right')).toHaveCount(1)
          await page.locator('.foot .btn.primary').click()
        }

        // Back on the quest page, where the stamp is pressed onto the pin's page, then the stars, then the photo
        await expect(page).toHaveURL(/\/quest\/tilburg-textile(\?|$)/)
        const slot = page.locator('.slot.landing')
        await expect(slot).toHaveCount(1)
        await expect(slot.locator('.stamper')).toBeVisible()
        await expect(slot.locator('.paper-stamp')).toBeVisible()
        await expect(slot.locator('.flap img')).toBeVisible()
        await expect(page.locator('.slot.landing')).toHaveCount(0, { timeout: 6000 })
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

      // Hints open one at a time, on request: a button says so and how many are left. Nothing about stars
      // shows while looking.
      const more = page.getByRole('button', { name: /Get another hint/ })
      await expect(more).toContainText('3 hints left')
      await expect(page.getByText(/star/i)).toHaveCount(0)
      await expect(page.getByRole('tab')).toHaveCount(0)
      await more.click()
      await expect(page.getByTestId('arrow')).toBeVisible()
      await expect(more).toContainText('2 hints left')
      await more.click()
      await expect(page.getByRole('tab')).toHaveCount(2)
      await expect(page.getByText(/star/i)).toHaveCount(0)
      await expect(page.locator('.mapview, .areamap').first()).toBeVisible()
      await expectNoClipping(page, 'play with the map')

      await arrive('chimney', { quiz: true, fact: true })
      await arrive('market', { quiz: false })
      await arrive('harbour', { quiz: false })

      // The finish: the quest stamp on the quest page, and the collage behind it
      await expect(page.locator('.quest-slot')).toBeVisible()
      await page.getByRole('link', { name: 'Open the collage' }).first().click()
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
      // The stars show once a pin is done. The chimney had four chances (three hints and a question) and two
      // hints were asked: one is forgiven, one costs a star. The other pins had no hints and keep all three.
      const previous = page.getByRole('button', { name: 'Previous page' })
      const toFirstPage = async () => {
        while ((await previous.count()) > 0 && (await previous.isEnabled())) await previous.click()
      }
      await toFirstPage()
      expect(await countAcrossPages(page, '.points[aria-label="2 of 3 stars"]')).toBe(1)
      await toFirstPage()
      expect(await countAcrossPages(page, '.points[aria-label="3 of 3 stars"]')).toBe(2)
      await toFirstPage()
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
    // Photo, fact, question.
    await page.getByRole('button', { name: 'Skip' }).click()
    await expect(page.locator('.fact-page')).toBeVisible()
    await page.getByRole('button', { name: 'Next' }).click()
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
    const more = page.getByRole('button', { name: /Get another hint/ })
    await more.click()
    await more.click()
    await expect(page.getByRole('tab')).toHaveCount(2)

    // Leave through the quest page and come back: the hints are still open and still count as asked.
    await page.getByRole('button', { name: /All pins/ }).click()
    await page.locator('.slot.open').click()
    await expect(page.getByTestId('arrow')).toBeVisible()
    await expect(page.getByRole('tab')).toHaveCount(2)
    await expect(more).toContainText('Last hint')

    // And it survives closing the app.
    await page.reload()
    await expect(page.getByTestId('arrow')).toBeVisible()
    await expect(more).toContainText('Last hint')
  })
})
