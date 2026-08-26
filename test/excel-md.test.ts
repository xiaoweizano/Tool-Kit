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
  it('列数不齐的行以空单元格补齐(容错真实 Excel)', () => {
    const r = sheetToMarkdown([['A', 'B', 'C'], [1]])
    expect(r).toEqual({ status: 'ok', data: '| A | B | C |\n|---|---|---|\n| 1 |  |  |' })
  })
  it('含换行的单元格折叠为空格,表格保持单行有效(含 \\r\\n)', () => {
    const r = sheetToMarkdown([['A', 'B'], ['多行\n内容', 'x']])
    expect(r).toEqual({ status: 'ok', data: '| A | B |\n|---|---|\n| 多行 内容 | x |' })
    const r2 = sheetToMarkdown([['A'], ['a\r\nb']])
    expect(r2).toEqual({ status: 'ok', data: '| A |\n|---|\n| a b |' })
  })
  it('含竖线的单元格被转义不破表', () => {
    const r = sheetToMarkdown([['A'], ['a|b']])
    expect(r).toEqual({ status: 'ok', data: '| A |\n|---|\n| a\\|b |' })
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
