// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import RestApiClientPage from '@tools/rest-api-client'
import { useRestStore } from '@tools/rest-api-client/store'

vi.mock('@core/http', () => ({
  httpFetch: vi.fn(async () => ({ ok: true, status: 200, statusText: 'OK', headers: {}, body: '{}', bodyBytes: 2, finalUrl: 'u' })),
  httpCancel: vi.fn()
}))

// 「另存为副本」用例会往 store 里加集合,不清就会让后续用例看到脏集合
beforeEach(() => {
  localStorage.clear()
  useRestStore.setState({ collections: [], environments: [], history: [], activeEnvId: '', writeFailed: false })
})
afterEach(() => {
  cleanup()
  useRestStore.setState({ writeFailed: false })
})

describe('请求区页签', () => {
  it('默认 Params 页签:query 参数表在 DOM,headers / body / cURL 不在', () => {
    render(<RestApiClientPage />)
    expect(screen.getByTestId('request-tab-params').getAttribute('aria-selected')).toBe('true')
    expect(screen.getByPlaceholderText('新增 key')).toBeTruthy()
    expect(screen.queryByPlaceholderText('Header-Name')).toBeNull()
    expect(screen.queryByPlaceholderText('粘贴浏览器 Copy as cURL (bash / cmd)…')).toBeNull()
  })

  it('切到 Headers:只渲染 headers 内容', () => {
    render(<RestApiClientPage />)
    fireEvent.click(screen.getByTestId('request-tab-headers'))
    // 空请求下 headers 列表无行,故断言区块标题而非行内 input(原断言 Header-Name 依赖已有 header,与「原样迁移」矛盾)
    expect(screen.getByText('HEADERS · 请求头')).toBeTruthy()
    expect(screen.queryByPlaceholderText('新增 key')).toBeNull()
  })

  it('切到 Body:只渲染 body 编辑器,且「格式化 JSON」与它在同一屏', () => {
    render(<RestApiClientPage />)
    fireEvent.click(screen.getByTestId('request-tab-body'))
    // testing-library 只归一化 DOM 文本、不归一化字符串入参,双空格需写成归一化后的单空格
    expect(screen.getByPlaceholderText('{"key":"value"} 支持 {{var}}')).toBeTruthy()
    expect(screen.getByText('格式化 JSON')).toBeTruthy()
    expect(screen.queryByPlaceholderText('Header-Name')).toBeNull()
  })

  it('切到 cURL:粘贴框与「导出 cURL」「解析导入」都在该页签内', () => {
    render(<RestApiClientPage />)
    fireEvent.click(screen.getByTestId('request-tab-curl'))
    expect(screen.getByTestId('curl-import')).toBeTruthy()
    expect(screen.getByTestId('curl-export-btn')).toBeTruthy()
    expect(screen.getByText('解析导入')).toBeTruthy()
    expect(screen.queryByPlaceholderText('新增 key')).toBeNull()
  })

  it('页签计数:headers 有内容时 Headers 页签显示条数', () => {
    render(<RestApiClientPage />)
    fireEvent.click(screen.getByTestId('request-tab-headers'))
    fireEvent.click(screen.getByText('+ Header'))
    expect(screen.getByTestId('request-tab-headers').textContent).toContain('1')
  })

  it('计数为 0 时不显示数字', () => {
    render(<RestApiClientPage />)
    expect(screen.getByTestId('request-tab-params').textContent).toBe('Params')
    expect(screen.getByTestId('request-tab-headers').textContent).toBe('Headers')
  })
})

describe('标题行脏标记', () => {
  it('未改动时没有「未保存」标记', () => {
    render(<RestApiClientPage />)
    expect(screen.queryByTestId('dirty-marker')).toBeNull()
  })

  it('改了 URL 后出现「未保存」', () => {
    render(<RestApiClientPage />)
    fireEvent.change(screen.getByTestId('url-input'), { target: { value: 'https://x/a' } })
    expect(screen.getByTestId('dirty-marker').textContent).toContain('未保存')
  })

  it('「另存为副本」后标记消失(baseline 被重置)', () => {
    render(<RestApiClientPage />)
    fireEvent.change(screen.getByTestId('url-input'), { target: { value: 'https://x/a' } })
    expect(screen.getByTestId('dirty-marker')).toBeTruthy()
    fireEvent.click(screen.getByText('另存为副本'))
    expect(screen.queryByTestId('dirty-marker')).toBeNull()
  })

  it('请求名称仍是可输入控件(带 aria-label)', () => {
    render(<RestApiClientPage />)
    const name = screen.getByLabelText('请求名称') as HTMLInputElement
    fireEvent.change(name, { target: { value: '登录接口' } })
    expect(name.value).toBe('登录接口')
  })
})
