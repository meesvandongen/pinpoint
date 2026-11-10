// Plays a quest in the dev server and screenshots every step, so you can check that every text fits and every
// page works without clicking through the test tools by hand.
//
//   pnpm --filter pinpoint-app dev                     # in another shell; add PINPOINT_CONTENT=… for another folder
//   node .claude/skills/write-quest/playtest.cjs <quest-id> <output-dir> [width] [height]
//
// For each pin, in the quest's order: stand 240 m north of it and screenshot the first clue, ask for every hint
// (one screenshot each), stand on the pin, check in, take a stand-in photo, answer each question with the first
// option, screenshot every page after arrival and the quest page at the end. It starts with the first pin's opening screen
// with local expert on. Prints any page errors. Uses the Playwright that is preinstalled.
const { chromium } = require('playwright')
const fs = require('node:fs')
const path = require('node:path')

const [id, outDir, width = '360', height = '640'] = process.argv.slice(2)
if (!id || !outDir) {
  console.error('usage: node playtest.cjs <quest-id> <output-dir> [width] [height]')
  process.exit(2)
}
const root = path.resolve(__dirname, '../../..')
const folder = process.env.PINPOINT_CONTENT ?? 'content'
const quest = JSON.parse(fs.readFileSync(path.join(root, folder, 'quests', `${id}.json`), 'utf8'))
const base = process.env.BASE_URL ?? 'http://localhost:3000'
const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${name}.png`) })

void (async () => {
  const browser = await chromium.launch()
  // Reduced motion: no page turns or stamp animation half way through a screenshot.
  const context = await browser.newContext({ locale: 'en-GB', viewport: { width: +width, height: +height }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

  await page.setContent('<body></body>')
  const photo = Buffer.from(
    await page.evaluate(async () => {
      const c = Object.assign(document.createElement('canvas'), { width: 800, height: 600 })
      const g = c.getContext('2d')
      g.fillStyle = '#88a'
      g.fillRect(0, 0, 800, 600)
      return Array.from(new Uint8Array(await (await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9))).arrayBuffer()))
    }),
  )

  // Local expert hides distance, direction and map: the first clue has to work on its own.
  await page.goto(`${base}/settings`)
  const expert = page.getByRole('switch', { name: /expert/i })
  await page.getByRole('switch').first().waitFor()
  if (await expert.count()) {
    await expert.click()
    const first = quest.pins[0]
    await page.goto(`${base}/quest/${id}/find/${first.id}?sim=${first.position.lat + 240 / 111200},${first.position.lng},10`)
    await page.waitForTimeout(800)
    await shot(page, `${first.id}-expert`)
    // And off again for the real run.
    await page.goto(`${base}/settings`)
    await expert.click()
  }

  for (const pin of quest.pins) {
    const { lat, lng } = pin.position
    await page.goto(`${base}/quest/${id}/find/${pin.id}?sim=${lat + 240 / 111200},${lng},10`)
    await page.getByRole('button', { name: 'Check in' }).waitFor()
    await page.waitForTimeout(800)
    await shot(page, `${pin.id}-0-start`)
    const more = page.getByRole('button', { name: /Get another hint/ })
    for (let n = 1; await more.count(); n++) {
      await more.click()
      await page.waitForTimeout(1200)
      await shot(page, `${pin.id}-${n}-hint`)
    }

    await page.goto(`${base}/quest/${id}/find/${pin.id}?sim=${lat},${lng},8`)
    await page.getByRole('button', { name: 'Check in' }).click()
    for (let k = 0; /\/arrived\//.test(page.url()); k++) {
      await page.waitForTimeout(500)
      if (await page.getByTestId('photo-input').count()) await page.getByTestId('photo-input').setInputFiles({ name: 'p.jpg', mimeType: 'image/jpeg', buffer: photo })
      const options = page.locator('.options .btn')
      if ((await options.count()) && !(await page.locator('.options .btn.right').count())) await options.first().click()
      await page.waitForTimeout(300)
      await shot(page, `${pin.id}-arrival-${k}`)
      await page.locator('.foot .btn.primary').click()
      await page.waitForTimeout(400)
    }
    await page.waitForTimeout(800)
    await shot(page, `${pin.id}-quest`)
  }

  console.log(errors.length ? `page errors:\n${errors.join('\n')}` : 'no page errors')
  await browser.close()
})()
