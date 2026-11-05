import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { siteData } from '../../data'
import { buildCvDocx } from './docx'
import { buildCvModel } from './model'

/** Personal details that must never reach the CV: street address, birth date, nationality line, the photo. */
const BANNED = ['Highview', 'P2-B2', 'Dec 24', '1991', 'Filipino  •', 'profile.jpg', 'profile.JPG', 'avatar']

const model = buildCvModel(siteData, 'https://immanuelmm.github.io/immanuel-3d/')

describe('CV privacy', () => {
  it('the model carries none of the banned strings', () => {
    const json = JSON.stringify(model)
    for (const s of BANNED) expect(json, s).not.toContain(s)
    expect(json).not.toMatch(/"(photo|image|picture)"/i)
  })

  it('the model shows the city only', () => {
    expect(model.contact.map((c) => c.text)).toContain('Apalit, Philippines')
    expect(JSON.stringify(model)).not.toMatch(/Apalit, Pampanga, Philippines|Highview/)
  })

  it('the docx has the content and none of the banned strings, and no embedded images', async () => {
    const blob = await buildCvDocx(model)
    expect(blob.size).toBeGreaterThan(5_000)
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()))
    const xml = strFromU8(files['word/document.xml'])
    expect(xml).toContain('Immanuel Mahusay')
    expect(xml.toLowerCase()).toContain('professional summary')
    expect(xml).toContain('Software Engineer Lead')
    expect(xml).toContain('immanuel@qstrike.com')
    for (const s of BANNED) expect(xml, s).not.toContain(s)
    for (const name of Object.keys(files)) {
      expect(name.startsWith('word/media/'), name).toBe(false)
      expect(strFromU8(files[name]), `${name}`).not.toMatch(/Highview|P2-B2|Dec 24, 1991/)
    }
  })
})
