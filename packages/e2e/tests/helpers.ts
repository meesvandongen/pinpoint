import { expect, type Page } from '@playwright/test'

/** Where the pins of the sample quest "Wool city" are. */
export const PINS = {
  chimney: [51.5607, 5.0768],
  market: [51.5552, 5.0833],
  harbour: [51.5599, 5.0912],
} as const

/** Nothing on a screen may scroll or be cut off: the rule the whole interface is built on. */
export async function expectNoClipping(page: Page, label: string) {
  const problems = await page.evaluate(() => {
    const found: string[] = []
    for (const body of document.querySelectorAll('.screen .body:not(.settings-body)')) {
      if (body.scrollHeight > body.clientHeight + 1) found.push(`the page scrolls (${body.scrollHeight} > ${body.clientHeight})`)
      const box = body.getBoundingClientRect()
      for (const el of body.querySelectorAll('*')) {
        const b = el.getBoundingClientRect()
        if (b.width && b.height && !el.closest('svg') && !el.closest('.pager-item') && b.bottom > box.bottom + 1) {
          found.push(`${el.tagName.toLowerCase()}.${String(el.className)} is cut off at the bottom`)
        }
      }
    }
    if (document.documentElement.scrollHeight > document.documentElement.clientHeight) found.push('the document scrolls')
    return found.slice(0, 5)
  })
  expect(problems, label).toEqual([])
}

/** A small picture, as bytes, to stand in for a camera photo. */
export async function samplePhoto(page: Page): Promise<Buffer> {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 480
    const g = canvas.getContext('2d')!
    const gradient = g.createLinearGradient(0, 0, 640, 480)
    gradient.addColorStop(0, '#e07a5f')
    gradient.addColorStop(1, '#3d405b')
    g.fillStyle = gradient
    g.fillRect(0, 0, 640, 480)
    g.fillStyle = '#f4f1de'
    g.beginPath()
    g.arc(320, 240, 90, 0, 7)
    g.fill()
    return canvas.toDataURL('image/jpeg', 0.8).split(',')[1]
  })
  return Buffer.from(base64, 'base64')
}

/** Console errors that matter: not blocked fonts or tiles on a machine without a network. */
export function collectProblems(page: Page): string[] {
  const problems: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' && !/fonts|Failed to load resource|ERR_|net::/.test(m.text())) problems.push(m.text())
  })
  page.on('pageerror', (e) => problems.push(`PAGEERROR ${e.message}`))
  return problems
}

/** Counts the items of a paged list across all its pages, turning them with the page buttons. */
export async function countAcrossPages(page: Page, items: string): Promise<number> {
  let total = 0
  for (let turn = 0; turn < 20; turn++) {
    total += await page.locator(items).count()
    const next = page.getByRole('button', { name: 'Next page' })
    if ((await next.count()) === 0 || (await next.isDisabled())) break
    await next.click()
  }
  return total
}
