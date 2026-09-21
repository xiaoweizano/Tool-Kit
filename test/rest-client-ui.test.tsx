// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import type { Mock } from 'vitest'
import { httpFetch } from '@core/http'
import RestApiClientPage from '@tools/rest-api-client'
import { useRestStore } from '@tools/rest-api-client/store'
import { LAYOUT_KEY } from '@tools/rest-api-client/split-layout'
// 必须清 localStorage:布局 hook 会把 collapsed/height 写进 toolkit.rest-client.layout,
// 否则「折叠」用例的 folded 状态会漏给后面的用例(下一条初值就不是展开态了)。
beforeEach(() => {
  localStorage.clear()
  useRestStore.setState({ collections: [], environments: [], history: [], activeEnvId: '', writeFailed: false })
})
afterEach(() => { cleanup(); useRestStore.setState({ writeFailed: false }) })
vi.mock('@core/http', () => ({ httpFetch: vi.fn(async () => ({ ok: true, status: 200, statusText: 'OK', headers: {}, body: '{}', bodyBytes: 2, finalUrl: 'u' })), httpCancel: vi.fn() }))
describe('rest client UI', () => {
  it('渲染请求行与发送控件(上下分栏布局)', () => { render(<RestApiClientPage />); expect(screen.getByTestId('method-select')).toBeTruthy(); expect(screen.getByTestId('send-btn')).toBeTruthy() })
  it('修改 URL 后 dirty=true,切换集合项触发确认(window.confirm)', () => {
    const spy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<RestApiClientPage />)
    fireEvent.change(screen.getByTestId('url-input'), { target: { value: 'https://x/a' } })
    fireEvent.click(screen.getByTestId('new-request-btn'))
    expect(spy).toHaveBeenCalled(); spy.mockRestore()
  })
  it('Ctrl+Enter 发送', async () => {
    render(<RestApiClientPage />)
    fireEvent.keyDown(screen.getByTestId('url-input'), { key: 'Enter', ctrlKey: true })
    await screen.findByText(/200/)
  })
  it('编辑 query 参数值时输入框不重挂载(焦点保留,URL 双向同步)', () => {
    render(<RestApiClientPage />)
    fireEvent.change(screen.getByTestId('url-input'), { target: { value: 'https://api.test/users?page=1' } })
    const valueInput = screen.getByDisplayValue('1') as HTMLInputElement
    valueInput.focus()
    expect(document.activeElement).toBe(valueInput)
    fireEvent.change(valueInput, { target: { value: '12' } })
    expect(document.activeElement).toBe(valueInput)
    fireEvent.change(valueInput, { target: { value: '123' } })
    expect(document.activeElement).toBe(valueInput)
    expect((screen.getByTestId('url-input') as HTMLInputElement).value).toBe('https://api.test/users?page=123')
  })

  it('上下分栏:分隔条在 DOM', () => {
    render(<RestApiClientPage />)
    expect(screen.getByTestId('layout-splitter')).toBeTruthy()
  })

  it('折叠响应区后 body 容器离开 DOM,状态仍在', async () => {
    render(<RestApiClientPage />)
    fireEvent.change(screen.getByTestId('url-input'), { target: { value: 'https://x/a' } })
    fireEvent.keyDown(screen.getByTestId('url-input'), { key: 'Enter', ctrlKey: true })
    await screen.findByTestId('response-status')
    fireEvent.click(screen.getByTestId('response-toggle'))
    expect(screen.queryByTestId('response-body')).toBeNull()
    expect(screen.getByTestId('response-status')).toBeTruthy()
  })

  it('失败自动展开:折叠状态下发一个失败请求 → 响应区展开且失败可见', async () => {
    ;(httpFetch as unknown as Mock).mockRejectedValueOnce(new Error('boom'))
    render(<RestApiClientPage />)
    fireEvent.change(screen.getByTestId('url-input'), { target: { value: 'https://x/a' } })
    fireEvent.click(screen.getByTestId('response-toggle'))
    expect(screen.getByTestId('response-toggle').getAttribute('aria-expanded')).toBe('false')
    fireEvent.keyDown(screen.getByTestId('url-input'), { key: 'Enter', ctrlKey: true })
    await screen.findByText(/请求失败/)
    expect(screen.getByTestId('response-toggle').getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByTestId('response-body')).toBeTruthy()
  })

  it('布局记忆:折叠状态写进独立 key,不混入 zustand 的 toolkit.rest-client', () => {
    render(<RestApiClientPage />)
    fireEvent.click(screen.getByTestId('response-toggle'))
    expect(JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? 'null').collapsed).toBe(true)
    const persisted = JSON.parse(localStorage.getItem('toolkit.rest-client') ?? '{}') as Record<string, unknown>
    expect(persisted).not.toHaveProperty('collapsed')
    expect(persisted).not.toHaveProperty('height')
  })

  it('布局读失败:回落默认布局、不抛、不点亮「本地存储写入失败」横幅', () => {
    // 只让布局那个 key 抛错,其余 key 走原实现 —— 避免打断 zustand persist 的 rehydrate
    const real = localStorage.getItem.bind(localStorage)
    const spy = vi.spyOn(localStorage, 'getItem').mockImplementation((k: string) => {
      if (k === LAYOUT_KEY) throw new Error('storage blocked')
      return real(k)
    })
    render(<RestApiClientPage />)
    expect(screen.getByTestId('layout-splitter')).toBeTruthy()
    expect(screen.queryByText(/本地存储写入失败/)).toBeNull()
    spy.mockRestore()
  })
})
