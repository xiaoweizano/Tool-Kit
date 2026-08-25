import { describe, it, expect } from 'vitest'
import { parseMarkdown, htmlToMd, buildDocxDocument } from '@tools/md-word/transform'

describe('parseMarkdown', () => {
  it('标题/段落/粗斜体/行内代码/链接', () => {
    const blocks = parseMarkdown('# 标题\n\n普通 **粗** 和 *斜* 与 `code` 和 [链接](https://x.com)\n')
    expect(blocks[0]).toEqual({ type: 'heading', level: 1, text: '标题' })
    const para = blocks[1]
    if (para.type === 'paragraph') {
      expect(para.runs.some((r) => r.bold)).toBe(true)
      expect(para.runs.some((r) => r.italic)).toBe(true)
      expect(para.runs.some((r) => r.code)).toBe(true)
      expect(para.runs.some((r) => r.link)).toBe(true)
    }
  })
  it('有序/无序列表与代码块与表格与分隔线', () => {
    const blocks = parseMarkdown('- a\n- b\n\n1. x\n2. y\n\n```js\nconst a=1\n```\n\n---\n\n| A | B |\n|---|---|\n| 1 | 2 |\n')
    expect(blocks.some((b) => b.type === 'bulletList')).toBe(true)
    expect(blocks.some((b) => b.type === 'orderedList')).toBe(true)
    expect(blocks.some((b) => b.type === 'codeBlock' && b.language === 'js')).toBe(true)
    expect(blocks.some((b) => b.type === 'hr')).toBe(true)
    expect(blocks.some((b) => b.type === 'table')).toBe(true)
  })
  it('空输入空数组', () => { expect(parseMarkdown('')).toEqual([]) })
})

describe('buildDocxDocument', () => {
  it('返回 Document 实例', () => {
    const doc = buildDocxDocument(parseMarkdown('# 标题\n\n段落\n'))
    expect(doc).toBeTruthy()
    expect(typeof doc).toBe('object')
  })
})

describe('htmlToMd', () => {
  it('标题/粗体/表格转 md', () => {
    const md = htmlToMd('<h1>标题</h1><p><strong>粗</strong></p><table><tr><th>A</th></tr><tr><td>1</td></tr></table>')
    expect(md).toContain('# 标题')
    expect(md).toContain('**粗**')
    expect(md).toContain('|')
  })
})
