// Agent detail card: open from the strip, close with Escape / the close button / the backdrop, focus returns to the trigger.
// (The 3D click path is covered by `npm run e2e:agents -- --webgl`.)
import { expect, test } from '@playwright/test'
import { meta, openSession, waitSceneState, type Session } from './support'

test.describe.configure({ mode: 'serial' })

let s: Session
test.beforeAll(async ({ browser }, info) => {
  s = await openSession(browser, info)
  await waitSceneState(s.page)
})
test.afterAll(async () => {
  await s?.ctx.close()
})

const dialog = () => s.page.locator('[role="dialog"]')
const focusedAgent = () => s.page.evaluate(() => document.activeElement?.getAttribute('data-agent') ?? null)
const insideDialog = () => s.page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))

async function openAgent(id: string, how: 'click' | 'enter' = 'click') {
  const btn = s.page.locator(`.agent[data-agent="${id}"]`)
  await btn.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
  if (how === 'enter') {
    await btn.focus()
    await btn.press('Enter')
  } else {
    await btn.click()
  }
  await dialog().waitFor({ state: 'visible' })
}

test('seven agent buttons and a closed, labelled dialog', async () => {
  await expect(s.page.locator('.agents button.agent[data-agent]')).toHaveCount(7)
  await expect(s.page.locator('#agent-dialog')).toBeHidden()
  await expect(dialog()).toHaveCount(1)
})

test('keyboard: Enter opens, focus moves in, page behind is inert, Escape closes and focus returns', async () => {
  await openAgent('qa', 'enter')
  await expect(dialog()).toHaveAttribute('aria-modal', 'true')
  const labelledBy = await dialog().getAttribute('aria-labelledby')
  await expect(s.page.locator(`#${labelledBy}`)).toHaveText('QA')
  expect(await insideDialog()).toBe(true)
  expect(await s.page.locator('main').evaluate((el: HTMLElement) => el.inert)).toBe(true)
  // the dialog fits the viewport (bottom sheet on phones, card on desktop)
  const box = (await dialog().locator('[data-agent-card]:not([hidden])').boundingBox())!
  const vp = s.page.viewportSize()!
  expect(box.x).toBeGreaterThanOrEqual(-1)
  expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 1)
  expect(box.y + box.height).toBeLessThanOrEqual(vp.height + 1)
  for (let i = 0; i < 6; i++) {
    await s.page.keyboard.press('Tab')
    expect(await insideDialog(), `Tab ${i + 1} stays inside`).toBe(true)
  }
  await s.page.keyboard.press('Escape')
  await expect(s.page.locator('#agent-dialog')).toBeHidden()
  expect(await focusedAgent()).toBe('qa')
  expect(await s.page.locator('main').evaluate((el: HTMLElement) => el.inert)).toBe(false)
})

test('close button returns focus to the trigger', async () => {
  await openAgent('planner')
  await s.page.locator('.agent-dialog__close').click()
  await expect(s.page.locator('#agent-dialog')).toBeHidden()
  expect(await focusedAgent()).toBe('planner')
})

test('a click on the backdrop closes it and returns focus', async ({}, info) => {
  await openAgent('devops')
  await s.page.waitForTimeout(600) // past the touch ghost-click guard
  const vp = s.page.viewportSize()!
  const card = (await dialog().locator('[data-agent-card]:not([hidden])').boundingBox())!
  // a point outside the card: left of it on wide screens, above it on phones/tablets
  const x = card.x > 40 ? card.x / 2 : vp.width / 2
  const y = card.x > 40 ? vp.height / 2 : Math.max(4, card.y / 2)
  test.skip(card.x <= 40 && card.y < 8, `no backdrop visible at ${meta(info).width}px (full-screen card)`)
  await s.page.mouse.click(x, y)
  await expect(s.page.locator('#agent-dialog')).toBeHidden()
  expect(await focusedAgent()).toBe('devops')
})

test('every agent opens its own card', async () => {
  const names = ['Lead', 'Planner', '.NET Backend', 'React Frontend', 'QA', 'Docs', 'DevOps']
  const ids = await s.page.locator('.agents button.agent').evaluateAll((els) => els.map((e) => e.getAttribute('data-agent')!))
  expect(ids).toHaveLength(7)
  for (let i = 0; i < ids.length; i++) {
    await openAgent(ids[i])
    await expect(s.page.locator('[data-agent-card]:not([hidden]) h3')).toHaveText(names[i])
    await s.page.keyboard.press('Escape')
    await expect(s.page.locator('#agent-dialog')).toBeHidden()
  }
})

test('no console errors', async () => {
  expect(s.errors).toEqual([])
})
