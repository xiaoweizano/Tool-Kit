import { describe, it, expect } from 'vitest'
import { sheetToMarkdown, markdownToSheet } from '@tools/excel-md/transform'

describe('sheetToMarkdown', () => {
  it('首行表头 + 管道表格', () => {
    const r = sheetToMarkdown([['A', 'B'], [1, 2], ['x', 'y']])
    expect(r).toEqual({ status: 'ok', data: '| A | B |\n|---|---|\n| 1 | 2 |\n| x | y |' })
  })
  it('空 → 错误', () => {
    const r = sheetToMarkdown([])
    expect(r.status).toBe('error')
  })
  it('列数不一 → 错误', () => {
    const r = sheetToMarkdown([['A'], [1, 2]])
    expect(r.status).toBe('error')
  })
})

describe('markdownToSheet', () => {
  it('合法表格 → aoa', () => {
    const r = markdownToSheet('| A | B |\n|---|---|\n| 1 | 2 |')
    expect(r).toEqual({ status: 'ok', data: [['A', 'B'], ['1', '2']] })
  })
  it('无表格 → 错误', () => {
    const r = markdownToSheet('hello')
    expect(r.status).toBe('error')
  })
  it('列数不一 → 错误', () => {
    const r = markdownToSheet('| A | B |\n|---|---|\n| 1 |')
    expect(r.status).toBe('error')
  })
})
