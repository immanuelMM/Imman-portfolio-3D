/**
 * Word export. Lazy: this module (and the `docx` package) is `import()`ed on the first Word click, never on page load.
 * Layout ported from AI_Porfolio's `downloadCvWord`: A4, Calibri, single column.
 */
import {
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
  Document,
  ExternalHyperlink,
  LevelFormat,
  Packer,
  Paragraph,
  Tab,
  TabStopType,
  TextRun,
  type IRunOptions,
} from 'docx'
import { cvFileName, type CvEntry, type CvModel } from './model'

const FONT = 'Calibri'
const INK = '111111'
const MUTED = '555555'
const LINK = '1D4ED8'
const RIGHT_TAB = convertInchesToTwip(8.27 - 0.75 * 2) // A4 width minus margins

const run = (text: string, o: Partial<IRunOptions> = {}) =>
  new TextRun({ text, font: FONT, size: 20, color: INK, ...o } as IRunOptions)
const link = (text: string, href: string, size = 20) =>
  new ExternalHyperlink({
    link: href,
    children: [new TextRun({ text, font: FONT, size, color: LINK, underline: {} })],
  })
const sep = (size = 20) => run('  |  ', { color: MUTED, size })

type Inline = TextRun | ExternalHyperlink

const joinRuns = (parts: Inline[][], size = 20): Inline[] => parts.flatMap((p, i) => (i ? [sep(size), ...p] : p))

export async function buildCvDocx(m: CvModel): Promise<Blob> {
  const children: Paragraph[] = []

  const heading = (text: string) =>
    children.push(
      new Paragraph({
        children: [run(text.toUpperCase(), { bold: true, size: 22, characterSpacing: 20 })],
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '999999', space: 2 } },
        spacing: { before: 240, after: 100 },
        keepNext: true,
      }),
    )
  const para = (runs: Inline[], o: Record<string, unknown> = {}) =>
    children.push(new Paragraph({ children: runs, spacing: { after: 60 }, ...o }))
  const bullets = (items: string[]) =>
    items.forEach((b) =>
      children.push(
        new Paragraph({
          children: [run(b)],
          numbering: { reference: 'cv-bullets', level: 0 },
          spacing: { after: 30 },
        }),
      ),
    )
  const titleRow = (title: string, date?: string) =>
    para(
      [
        run(title, { bold: true, size: 21 }),
        ...(date ? [new TextRun({ children: [new Tab(), date], font: FONT, size: 20, color: MUTED })] : []),
      ],
      {
        tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
        spacing: { before: 120, after: 20 },
        keepNext: true,
      },
    )
  const entry = (e: CvEntry) => {
    titleRow(e.title, e.period)
    if (e.org) para([run(e.org, { italics: true, color: MUTED })], { spacing: { after: 40 } })
    bullets(e.bullets)
  }

  // Header
  para([run(m.name, { bold: true, size: 40 })], { alignment: AlignmentType.CENTER, spacing: { after: 20 } })
  if (m.title)
    para([run(m.title, { size: 24, color: MUTED })], { alignment: AlignmentType.CENTER, spacing: { after: 60 } })
  if (m.contact.length)
    para(
      joinRuns(
        m.contact.map((c) => [c.href ? link(c.text, c.href, 19) : run(c.text, { size: 19 })]),
        19,
      ),
      {
        alignment: AlignmentType.CENTER,
        spacing: { after: 20 },
      },
    )
  if (m.links.length)
    para(
      joinRuns(
        m.links.map((l) => [run(`${l.label}: `, { size: 19 }), link(l.text, l.href, 19)]),
        19,
      ),
      {
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
      },
    )

  if (m.summary) {
    heading('Professional Summary')
    para([run(m.summary)])
  }

  if (m.skills.length) {
    heading('Skills')
    m.skills.forEach((s) =>
      para([run(`${s.label}: `, { bold: true }), run(s.items.join(', '))], { spacing: { after: 40 } }),
    )
  }

  if (m.experience.length) {
    heading('Work Experience')
    m.experience.forEach(entry)
  }

  if (m.projectGroups.length) {
    heading('Projects')
    m.projectGroups.forEach((g) => {
      para([run(g.label.toUpperCase(), { bold: true, size: 18, color: MUTED })], {
        spacing: { before: 140, after: 0 },
        keepNext: true,
      })
      g.items.forEach((p) => {
        titleRow(p.title)
        if (p.desc) para([run(p.desc)], { spacing: { after: 40 } })
        bullets(p.bullets)
        const meta: Inline[][] = [
          ...(p.tech.length
            ? [[run('Tech: ', { bold: true, size: 19 }), run(p.tech.join(', '), { size: 19, color: MUTED })]]
            : []),
          ...p.links.map((l) => [run(`${l.label}: `, { bold: true, size: 19 }), link(l.text, l.href, 19)]),
        ]
        if (meta.length) para(joinRuns(meta, 19), { spacing: { after: 40 } })
      })
    })
  }

  if (m.education.length) {
    heading('Education')
    m.education.forEach(entry)
  }

  if (m.certifications.length) {
    heading('Certifications')
    m.certifications.forEach((c) => {
      titleRow(c.name, c.year)
      para([run(c.issuer, { italics: true, color: MUTED })], { spacing: { after: c.link ? 20 : 40 } })
      if (c.link)
        para([run('Credential: ', { bold: true, size: 19 }), link(c.link.replace(/^https?:\/\//, ''), c.link, 19)])
    })
  }

  if (m.languages.length) {
    heading('Languages')
    para(joinRuns(m.languages.map((l) => [run(l.name, { bold: true }), run(l.level ? ` (${l.level})` : '')])))
  }

  const doc = new Document({
    creator: m.name,
    title: `${m.name} – CV`,
    numbering: {
      config: [
        {
          reference: 'cv-bullets',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '•',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 360, hanging: 240 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: convertInchesToTwip(8.27), height: convertInchesToTwip(11.69) },
            margin: {
              top: convertInchesToTwip(0.7),
              bottom: convertInchesToTwip(0.7),
              left: convertInchesToTwip(0.75),
              right: convertInchesToTwip(0.75),
            },
          },
        },
        children,
      },
    ],
  })

  return Packer.toBlob(doc)
}

/** Saves through a Blob URL and a temporary `<a download>`: works on Android Chrome and iOS Safari without FileSaver. */
export async function downloadCvDocx(m: CvModel): Promise<void> {
  const blob = await buildCvDocx(m)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${cvFileName(m)}.docx`
  a.rel = 'noopener'
  document.body.append(a)
  a.click()
  a.remove()
  // Revoke after the browser has started the download.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
