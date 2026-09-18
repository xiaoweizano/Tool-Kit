// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import RestApiClientPage from '@tools/rest-api-client'
import { useRestStore } from '@tools/rest-api-client/store'
afterEach(() => { cleanup(); useRestStore.setState({ writeFailed: false }) })
vi.mock('@core/http', () => ({ httpFetch: vi.fn(async () => ({ ok: true, status: 200, statusText: 'OK', headers: {}, body: '{}', bodyBytes: 2, finalUrl: 'u' })), httpCancel: vi.fn() }))
describe('rest client UI', () => {
  it('渲染三栏关键控件', () => { render(<RestApiClientPage />); expect(screen.getByTestId('method-select')).toBeTruthy(); expect(screen.getByTestId('send-btn')).toBeTruthy() })
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
})
