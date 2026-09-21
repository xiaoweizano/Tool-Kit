// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import RestApiClientPage from '@tools/rest-api-client'
import { useRestStore } from '@tools/rest-api-client/store'

vi.mock('@core/http', () => ({
  httpFetch: vi.fn(async () => ({ ok: true, status: 200, statusText: 'OK', headers: {}, body: '{}', bodyBytes: 2, finalUrl: 'u' })),
  httpCancel: vi.fn()
}))

beforeEach(() => {
  localStorage.clear()
  useRestStore.setState({ collections: [], environments: [], history: [], activeEnvId: '', writeFailed: false })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('左栏页签', () => {
  it('默认在「集合」页签:集合树可见', () => {
    useRestStore.getState().addGroup('', '用户中心')
    render(<RestApiClientPage />)
    expect(screen.getByTestId('sidebar-tab-collections').getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText('用户中心')).toBeTruthy()
  })

  it('切到「历史」页签:历史条目出现,集合树离开 DOM', () => {
    useRestStore.getState().addGroup('', '用户中心')
    useRestStore.setState({
      history: [
        {
          id: 'h1',
          request: { method: 'GET', url: '/u', headers: [], body: '', truncated: false },
          response: { status: 200, statusText: 'OK', durationMs: 1, sizeBytes: 1, finalUrl: 'u' },
          envName: '',
          at: 1
        }
      ]
    })
    render(<RestApiClientPage />)
    fireEvent.click(screen.getByTestId('sidebar-tab-history'))
    expect(screen.getByTestId('sidebar-tab-history').getAttribute('aria-selected')).toBe('true')
    expect(screen.queryByText('用户中心')).toBeNull()
    expect(screen.getByText('/u')).toBeTruthy()
  })

  it('导入 / 导出在任一页签下都可达', () => {
    render(<RestApiClientPage />)
    expect(screen.getByTestId('bundle-export-btn')).toBeTruthy()
    fireEvent.click(screen.getByTestId('sidebar-tab-history'))
    expect(screen.getByTestId('bundle-export-btn')).toBeTruthy()
    expect(screen.getByTestId('bundle-import-input')).toBeTruthy()
  })
})

describe('变量块折叠', () => {
  it('默认展开:环境变量输入行可见({{var}} 入口不多加一次点击)', () => {
    useRestStore.getState().addEnv('dev')
    render(<RestApiClientPage />)
    expect(screen.getByTestId('env-vars-toggle').getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByTestId('env-var-key')).toBeTruthy()
  })

  it('折叠后输入行离开 DOM,展开后回来', () => {
    useRestStore.getState().addEnv('dev')
    render(<RestApiClientPage />)
    fireEvent.click(screen.getByTestId('env-vars-toggle'))
    expect(screen.getByTestId('env-vars-toggle').getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByTestId('env-var-key')).toBeNull()
    fireEvent.click(screen.getByTestId('env-vars-toggle'))
    expect(screen.getByTestId('env-var-key')).toBeTruthy()
  })

  it('折叠状态只影响变量块,环境列表(重命名/删除)仍在', () => {
    useRestStore.getState().addEnv('dev')
    const eid = useRestStore.getState().environments[0].id
    render(<RestApiClientPage />)
    fireEvent.click(screen.getByTestId('env-vars-toggle'))
    expect(screen.getByTestId(`env-delete-btn-${eid}`)).toBeTruthy()
  })
})
