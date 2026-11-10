import { expect, test } from '@playwright/test'
import { collectProblems, lookForPin } from './helpers'

// What a reviewer of a pull request does on a preview deployment: stand somewhere, change the time and
// the weather, and see the marks. The devtools shell and its panels are the interface.
test.use({ viewport: { width: 1000, height: 900 } })

test('moves the player, changes the time and the weather, and earns the marks', async ({ page }) => {
  const problems = collectProblems(page)
  const tools = page.locator('[data-testid=tanstack_devtools]')
  const tab = (name: string) => tools.getByText(name, { exact: true }).first().click()

  await page.goto('/settings')
  await page.getByRole('switch', { name: 'Weather marks' }).click()
  await page.getByText('‹ Back').click()
  await page.locator('.row', { hasText: 'Tilburg' }).click()
  await page.locator('.quest', { hasText: 'Wool city' }).click()
  await lookForPin(page)
  await expect(page.getByRole('button', { name: 'Use my location' })).toBeVisible()

  await page.getByLabel('Open TanStack Devtools').click()
  await tab('Location')
  await page.getByRole('button', { name: 'Simulated' }).click()
  await page.getByRole('button', { name: '240 m' }).click()
  await expect(page.getByTestId('distance')).toHaveText('240 m')

  await page.getByRole('button', { name: '80 m' }).click()
  await expect(page.getByTestId('distance')).toHaveText('80 m')
  await expect(page.getByTestId('status')).toHaveText('Get within 50 m to check in.')

  await page.getByRole('button', { name: 'Vague fix' }).click()
  await expect(page.getByTestId('status')).toHaveText('Almost there. Hold still while GPS settles.')

  await tab('Time and weather')
  await page.getByRole('button', { name: 'After dark here today' }).click()
  await page.getByRole('button', { name: 'Raining' }).click()
  await tab('Location')
  await page.getByRole('button', { name: 'On the pin' }).click()
  await expect(page.getByTestId('status')).toHaveText('You are here.')
  await page.getByLabel('Close TanStack Devtools').click()
  await page.getByRole('button', { name: 'Check in' }).click()

  await expect(page.locator('.photo-page')).toBeVisible()
  await expect(page.locator('.extras-row [role=img]')).toHaveCount(2)
  const marks = await page.locator('.extras-row [role=img]').evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')))
  expect(marks).toEqual(['Found after dark', 'Found in rain'])
  expect(problems).toEqual([])
})

test('answers requests with the mocks, and lets a query be inspected', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.row').first()).toBeVisible()
  const mocked = await page.evaluate(async () => (await fetch('/content/index.json')).json())
  expect(mocked.quests).toContain('quests/tilburg-textile.json')
  await page.getByLabel('Open TanStack Devtools').click()
  await page.locator('[data-testid=tanstack_devtools]').getByText('Mocks', { exact: true }).first().click()
  await expect(page.getByText('commit', { exact: false }).first()).toBeVisible()
})
