import { expect, test } from '@playwright/test'

// In a preview the editor works on a copy of the content that lives in the browser, and the game
// reads the same copy, so an edit can be played at once.
test('an edit in the editor shows up in the game', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
  const editor = await context.newPage()
  await editor.goto('/admin')
  await expect(editor.locator('.gcms-app')).toBeVisible({ timeout: 30_000 })
  await expect(editor.getByText('Preview: edits go to a copy of the content in this browser')).toBeVisible()

  await editor.getByText('tilburg-textile', { exact: true }).first().click()
  const title = editor.getByLabel('Title (en)')
  await expect(title).toHaveValue('Wool city')
  // The preview pane runs the game's own checks on what is typed.
  await expect(editor.getByText('Nothing to fix: the game would accept this quest.')).toBeVisible()

  await title.fill('Wool city (edited in a preview)')
  await editor.getByRole('button', { name: 'Save' }).first().click()
  await expect(editor.getByText(/Committed [0-9a-f]{7}/)).toBeVisible()

  const game = await context.newPage()
  await game.setViewportSize({ width: 390, height: 780 })
  await game.goto('/?sim=51.5629,5.0768,10')
  await game.locator('.row', { hasText: 'Tilburg' }).click()
  await expect(game.locator('.quest strong')).toContainText(['Green corners', 'Wool city (edited in a preview)'])
  await context.close()
})

test('the preview pane names what a quest still needs', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 })
  await page.goto('/admin')
  await expect(page.locator('.gcms-app')).toBeVisible({ timeout: 30_000 })
  await page.getByText('tilburg-green', { exact: true }).first().click()
  const title = page.getByLabel('Title (nl)')
  await expect(title).toBeVisible()
  // Take the default language out of the title: the game would show nothing sensible in English.
  await page.getByRole('button', { name: 'Remove en' }).first().click()
  await expect(page.getByText('title: missing the default language "en"')).toBeVisible()
})

test('a new location needs a name and an outline', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 })
  await page.goto('/admin')
  await expect(page.locator('.gcms-app')).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'Locations' }).click()
  await page.getByText('tilburg', { exact: true }).first().click()
  await expect(page.getByText(/Area \d+(\.\d+)? km²/).first()).toBeVisible({ timeout: 30_000 })
})
