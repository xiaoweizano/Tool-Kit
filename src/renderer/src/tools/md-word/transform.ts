import { Document, HeadingLevel, Paragraph, TextRun, Table, TableCell, TableRow, WidthType } from 'docx'
import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'

export type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; runs: { text: string; bold?: boolean; italic?: boolean; code?: boolean; link?: string }[] }
  | { type: 'bulletList'; items: string[] }
  | { type: 'orderedList'; items: string[] }
  | { type: 'codeBlock'; language?: string; text: string }
  | { type: 'table'; header: string[]; rows: string[][] }
  | { type: 'hr' }

// 行内解析:**粗** *斜* `code` [text](url)
function parseInline(text: string): { text: string; bold?: boolean; italic?: boolean; code?: boolean; link?: string }[] {
  const runs: { text: string; bold?: boolean; italic?: boolean; code?: boolean; link?: string }[] = []
  const re = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g
  let last = 0; let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) runs.push({ text: text.slice(last, m.index) })
    if (m[2] !== undefined) runs.push({ text: m[2], bold: true, italic: true })
    else if (m[3] !== undefined) runs.push({ text: m[3], bold: true })
    else if (m[4] !== undefined) runs.push({ text: m[4], italic: true })
    else if (m[5] !== undefined) runs.push({ text: m[5], code: true })
    else if (m[6] !== undefined) runs.push({ text: m[6], link: m[7] })
    last = m.index + m[0].length
  }
  if (last < text.length) runs.push({ text: text.slice(last) })
  return runs
}

function splitCells(line: string): string[] {
  const t = line.replace(/^\||\|$/g, '')
  return t.split('|').map((s) => s.trim())
}

export function parseMarkdown(md: string): Block[] {
  const blocks: Block[] = []
  const lines = md.split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()
    if (!trimmed) { i++; continue }
    const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed)
    if (heading) { blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] }); i++; continue }
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') { blocks.push({ type: 'hr' }); i++; continue }
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim() || undefined
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) { codeLines.push(lines[i]); i++ }
      i++ // 跳过结束 ```
      blocks.push({ type: 'codeBlock', language: lang, text: codeLines.join('\n') })
      continue
    }
    if (/^\s*[-*+]\s+/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^\s*[-*+]\s+/, '')); i++ }
      blocks.push({ type: 'bulletList', items })
      continue
    }
    if (/^\s*\d+[.)]\s+/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^\s*\d+[.)]\s+/, '')); i++ }
      blocks.push({ type: 'orderedList', items })
      continue
    }
    if (trimmed.includes('|')) {
      const header = splitCells(trimmed)
      const rows: string[][] = []
      i++
      while (i < lines.length && lines[i].trim().includes('|')) {
        const cells = splitCells(lines[i].trim())
        // 跳过分隔行(---)
        if (!cells.every((c) => /^:?-+:?$/.test(c))) rows.push(cells)
        i++
      }
      blocks.push({ type: 'table', header, rows })
      continue
    }
    const para = parseInline(trimmed)
    if (para.some((r) => r.text.trim() !== '')) blocks.push({ type: 'paragraph', runs: para })
    i++
  }
  return blocks
}

type Inline = { text: string; bold?: boolean; italic?: boolean; code?: boolean; link?: string }

function runsToRuns(runs: Inline[]): TextRun[] {
  return runs.map((r) => new TextRun({
    text: r.text,
    bold: r.bold,
    italics: r.italic,
    ...(r.code ? { font: 'Consolas' } : {})
  }))
}

export function buildDocxDocument(blocks: Block[]): Document {
  const children: (Paragraph | Table)[] = []
  for (const b of blocks) {
    switch (b.type) {
      case 'heading': {
        const levels = [undefined, HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6] as const
        children.push(new Paragraph({ heading: levels[b.level] ?? HeadingLevel.HEADING_6, children: runsToRuns(parseInline(b.text)) }))
        break
      }
      case 'paragraph':
        children.push(new Paragraph({ children: runsToRuns(b.runs) }))
        break
      case 'bulletList':
        b.items.forEach((it) => children.push(new Paragraph({ bullet: { level: 0 }, children: runsToRuns(parseInline(it)) })))
        break
      case 'orderedList':
        b.items.forEach((it) => children.push(new Paragraph({ numbering: { reference: 'ordered-list', level: 0 }, children: runsToRuns(parseInline(it)) })))
        break
      case 'codeBlock':
        b.text.split('\n').forEach((ln) => children.push(new Paragraph({ children: [new TextRun({ text: ln, font: 'Consolas', size: 20 })] })))
        break
      case 'table':
        children.push(new Table({
          rows: [
            new TableRow({ children: b.header.map((h) => new TableCell({ children: [new Paragraph({ children: runsToRuns(parseInline(h)) })] })) }),
            ...b.rows.map((row) => new TableRow({ children: row.map((c) => new TableCell({ children: [new Paragraph({ children: runsToRuns(parseInline(c)) })] })) }))
          ],
          width: { size: 100, type: WidthType.PERCENTAGE }
        }))
        break
      case 'hr':
        children.push(new Paragraph({ border: { bottom: { style: 'single', size: 6, color: '999999' } }, children: [] }))
        break
    }
  }
  return new Document({
    numbering: { config: [{ reference: 'ordered-list', levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: 'start' }] }] },
    sections: [{ children }]
  })
}

export function htmlToMd(html: string): string {
  const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' })
  td.use(gfm)
  return td.turndown(html)
}
