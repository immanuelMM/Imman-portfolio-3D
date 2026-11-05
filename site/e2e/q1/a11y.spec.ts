// axe (wcag2a, wcag2aa, wcag21aa, wcag22aa): 0 serious/critical on the page, the open agent dialog, expanded experience
// entries, the open nav menu / CV menu. Moderate/minor counts are attached to the report for the record.
// Allowlist: each entry names the axe rule and the milestone that fixes it (none needed at Q1).
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { closeNavIfOpen, instantScroll, openNavIfCollapsed, openSession, waitSceneState, type Session } from './support'

test.describe.configure({ mode: 'serial' })

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']
const ALLOW: { rule: string; fixedIn: string }[] = []

let s: Session
test.beforeAll(async ({ browser }, info) => {
  s = await openSession(browser, info)
  await waitSceneState(s.page)
})
test.afterAll(async () => {
  await s?.ctx.close()
})

async function scan(label: string, info: import('@playwright/test').TestInfo) {
  const results = await new AxeBuilder({ page: s.page })
    .withTags(AXE_TAGS)
    .disableRules(ALLOW.map((a) => a.rule))
    .analyze()
  const by = (impact: string) => results.violations.filter((v) => v.impact === impact)
  const counts = `critical ${by('critical').length}, serious ${by('serious').length}, moderate ${by('moderate').length}, minor ${by('minor').length}; ${results.passes.length} rules passed, ${results.incomplete.length} incomplete`
  info.annotations.push({ type: `axe ${label}`, description: counts })
  console.info(`axe[${info.project.name}] ${label}: ${counts}`)
  const blocking = [...by('critical'), ...by('serious')]
  expect(
    blocking.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
    `axe ${label}`,
  ).toEqual([])
  // moderate/minor findings are reported too, and fail only if they exist (so we notice)
  expect(
    results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
    `axe ${label} (all impacts)`,
  ).toEqual([])
}

test('page at rest (glass cards, collapsed experience entries)', async ({}, info) => {
  await instantScroll(s.page, 0)
  await scan('page', info)
})

test('each chapter scrolled into view', async ({}, info) => {
  for (const id of ['experience', 'ai', 'web', 'education', 'contact']) {
    await s.page.locator(`#${id}-title`).evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
    await s.page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))))
    await scan(`chapter ${id}`, info)
  }
})

test('experience entries expanded', async ({}, info) => {
  const toggles = s.page.locator('[data-expand-toggle]')
  const n = await toggles.count()
  expect(n).toBeGreaterThan(1)
  for (let i = 0; i < n; i++) {
    await toggles.nth(i).evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
    if ((await toggles.nth(i).getAttribute('aria-expanded')) !== 'true') await toggles.nth(i).click()
    await expect(toggles.nth(i)).toHaveAttribute('aria-expanded', 'true')
  }
  await scan('experience all open', info)
  for (let i = 0; i < n; i++) {
    if ((await toggles.nth(i).getAttribute('aria-expanded')) === 'true') await toggles.nth(i).click()
  }
  for (let i = 0; i < n; i++) await expect(toggles.nth(i)).toHaveAttribute('aria-expanded', 'false')
  await scan('experience all collapsed', info)
})

test('agent dialog open', async ({}, info) => {
  const btn = s.page.locator('.agent[data-agent="backend"]')
  await btn.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await btn.click()
  await s.page.locator('[role="dialog"]').waitFor({ state: 'visible' })
  await s.page.waitForTimeout(600) // sheet/card animation
  await scan('agent dialog', info)
  await s.page.keyboard.press('Escape')
  await expect(s.page.locator('#agent-dialog')).toBeHidden()
})

test('nav menu and CV menu open', async ({}, info) => {
  await instantScroll(s.page, 0)
  await openNavIfCollapsed(s.page)
  await scan('nav open', info)
  await closeNavIfOpen(s.page)
  const summary = s.page.locator('.cv-menu > summary')
  if (await summary.isVisible()) {
    await summary.click()
    await expect(s.page.locator('.cv-menu')).toHaveAttribute('open', '')
    await scan('cv menu open', info)
    await summary.click()
  }
})

test('no console errors', async () => {
  expect(s.errors).toEqual([])
})
