import { expect, test } from '@playwright/test'
import { collectProblems } from './helpers'

// The production build: a service worker, no test tools, and the game keeps working without a connection.
test.use({
  viewport: { width: 390, height: 780 },
  geolocation: { latitude: 51.5629, longitude: 5.0768, accuracy: 10 },
  permissions: ['geolocation'],
})

test('the production build has no test tools and works offline', async ({ page, context }) => {
  const problems = collectProblems(page)
  await page.goto('/')
  await expect(page.locator('.row').first()).toBeVisible()
  // A returning player who already allowed their location is not asked again.
  await expect(page.locator('.row', { hasText: 'Tilburg' }).getByText('near you')).toBeVisible()

  expect(await page.getByLabel('Open TanStack Devtools').count()).toBe(0)
  const workers = await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve))
    return (await navigator.serviceWorker.getRegistrations()).map((r) => new URL(r.active?.scriptURL ?? 'about:blank').pathname)
  })
  expect(workers).toEqual(['/sw.js'])
  expect((await page.request.get('/mockServiceWorker.js')).headers()['content-type']).toContain('text/html') // no such file: the app page

  // Open a map clue while online, so the map has been seen
  await page.locator('.row', { hasText: 'Tilburg' }).click()
  await page.locator('.quest', { hasText: 'Wool city' }).click()
  await page.getByRole('button', { name: 'Show now' }).click()
  await page.getByRole('button', { name: 'Show another clue' }).click()
  await expect(page.locator('.mapview, .areamap').first()).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(3000)

  await context.setOffline(true)
  await page.goto('/')
  await expect(page.locator('.row', { hasText: 'Tilburg' })).toBeVisible()
  await page.locator('.row', { hasText: 'Tilburg' }).click()
  await expect(page.locator('.quest')).toHaveCount(2)
  await page.locator('.quest', { hasText: 'Wool city' }).click()
  await expect(page.getByTestId('distance')).toHaveText('240 m')
  await page.getByRole('button', { name: 'Show now' }).click()
  await page.getByRole('button', { name: 'Show another clue' }).click()
  await expect(page.locator('.mapview, .areamap').first()).toBeVisible()

  // A deep link works offline too
  await page.goto('/book')
  await expect(page.getByRole('heading', { name: 'My book' })).toBeVisible()
  expect(problems).toEqual([])
})

test('the editor asks for a token in production, and has no copy of the content to play with', async ({ page }) => {
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Edit the quests' })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByLabel('GitHub token')).toBeVisible()
  await expect(page.getByText('Preview: edits go to a copy')).toHaveCount(0)
})
