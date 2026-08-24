// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { JsonParserPage } from '@tools/json-parser/index'

// vitest 非 globals 模式下 testing-library 不自动 cleanup
afterEach(cleanup)

vi.mock('@core/transform.channel', () => ({
  runTransform: async (_id: string, input: string, opts?: { indent?: string }) => {
    const { transformJson } = await import('@tools/json-parser/transform')
    return transformJson(input, opts as never)
  }
}))

describe('JSON 工具页', () => {
  it('粘贴合法 JSON 自动出格式化结果', async () => {
    render(<MemoryRouter><JsonParserPage /></MemoryRouter>)
    fireEvent.change(screen.getByPlaceholderText(/粘贴/), { target: { value: '{"a":1}' } })
    // indent=2 时 {"a":1} 格式化为 3 行(brief 原文 /2 行/ 系笔误,实际行数为 3)
    await screen.findByText(/3 行/)
    expect(screen.getAllByRole('button', { name: '复制' }).length).toBeGreaterThan(0)
  })
  it('非法 JSON 出 ERROR 定位', async () => {
    render(<MemoryRouter><JsonParserPage /></MemoryRouter>)
    fireEvent.change(screen.getByPlaceholderText(/粘贴/), { target: { value: '{"a":1,,}' } })
    await screen.findByText(/输入无效/)
  })
  it('空输入显示 EMPTY 引导', () => {
    render(<MemoryRouter><JsonParserPage /></MemoryRouter>)
    expect(screen.getByText(/粘贴内容到上方/)).toBeTruthy()
    expect(screen.getAllByRole('button', { name: '复制' }).some((b) => (b as HTMLButtonElement).disabled)).toBe(true)
  })
})
