// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import RestApiClientPage from '@tools/rest-api-client'
import { useRestStore } from '@tools/rest-api-client/store'

vi.mock('@core/http', () => ({
  httpFetch: vi.fn(async () => ({ ok: true, status: 200, statusText: 'OK', headers: {}, body: '{}', bodyBytes: 2, finalUrl: 'u' })),
  httpCancel: vi.fn()
}))

const rid = (n: number): string => crypto.randomUUID() + '.' + n

beforeEach(() => {
  localStorage.clear()
  useRestStore.setState({ collections: [], environments: [], history: [], activeEnvId: '', writeFailed: false })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('rest client sidebar CRUD', () => {
  it('1. 「+ 分组」→ collections 增加一个 group 节点', () => {
    vi.spyOn(window, 'prompt').mockReturnValue('租户服务')
    render(<RestApiClientPage />)
    fireEvent.click(screen.getByTestId('add-group-btn'))
    const cols = useRestStore.getState().collections
    expect(cols.length).toBe(1)
    expect(cols[0].type).toBe('group')
    expect(cols[0].name).toBe('租户服务')
  })

  it('2. 删除含请求的分组 → 触发确认;取消不删,确认删除子树', () => {
    useRestStore.getState().addGroup('', 'G1')
    const gid = useRestStore.getState().collections[0].id
    useRestStore.getState().addRequest(gid, { id: rid(1), name: '登录', method: 'POST', url: '/login', headers: [], body: '' })
    render(<RestApiClientPage />)
    // 取消:不删除
    const cancel = vi.spyOn(window, 'confirm').mockReturnValue(false)
    fireEvent.click(screen.getByTestId(`delete-btn-${gid}`))
    expect(cancel).toHaveBeenCalled()
    expect(useRestStore.getState().collections.find((c) => c.id === gid)).toBeTruthy()
    // 确认:子树消失
    cancel.mockReturnValue(true)
    fireEvent.click(screen.getByTestId(`delete-btn-${gid}`))
    expect(useRestStore.getState().collections.find((c) => c.id === gid)).toBeFalsy()
  })

  it('3. 重命名分组 → name 变更且树更新', () => {
    useRestStore.getState().addGroup('', '旧名')
    const gid = useRestStore.getState().collections[0].id
    render(<RestApiClientPage />)
    vi.spyOn(window, 'prompt').mockReturnValue('新名')
    fireEvent.click(screen.getByTestId(`rename-btn-${gid}`))
    expect(useRestStore.getState().collections[0].name).toBe('新名')
  })

  it('4. 移动请求到另一分组 → 原父不含、新父含(无重复)', () => {
    useRestStore.getState().addGroup('', 'A')
    useRestStore.getState().addGroup('', 'B')
    const [a, b] = useRestStore.getState().collections.map((c) => c.id)
    const reqId = rid(2)
    useRestStore.getState().addRequest(a, { id: reqId, name: 'R', method: 'GET', url: '/r', headers: [], body: '' })
    render(<RestApiClientPage />)
    fireEvent.change(screen.getByTestId(`move-select-${reqId}`), { target: { value: b } })
    const cols = useRestStore.getState().collections
    const inA = cols.find((c) => c.id === a)!.children.some((n) => n.id === reqId)
    const inB = cols.find((c) => c.id === b)!.children.some((n) => n.id === reqId)
    expect(inA).toBe(false)
    expect(inB).toBe(true)
  })

  it('5. 「+ 环境」→ environments 增加且首个自动成为 activeEnvId', () => {
    vi.spyOn(window, 'prompt').mockReturnValue('dev')
    render(<RestApiClientPage />)
    fireEvent.click(screen.getByTestId('env-add-btn'))
    const s = useRestStore.getState()
    expect(s.environments.length).toBe(1)
    expect(s.activeEnvId).toBe(s.environments[0].id)
  })

  it('6. 编辑活动环境变量(加一行 k=v)→ setEnvVars 被调用且 vars 含该键', () => {
    vi.spyOn(window, 'prompt').mockReturnValue('dev')
    render(<RestApiClientPage />)
    fireEvent.click(screen.getByTestId('env-add-btn'))
    const spy = vi.spyOn(useRestStore.getState(), 'setEnvVars')
    fireEvent.change(screen.getByTestId('env-var-key'), { target: { value: 'token' } })
    fireEvent.change(screen.getByTestId('env-var-value'), { target: { value: 'abc' } })
    fireEvent.click(screen.getByTestId('env-var-add-btn'))
    expect(spy).toHaveBeenCalled()
    const env = useRestStore.getState().environments[0]
    expect(env.vars.token).toBe('abc')
  })

  it('7. 删除含变量的环境 → 触发确认', () => {
    useRestStore.getState().addEnv('dev')
    const eid = useRestStore.getState().environments[0].id
    useRestStore.getState().setEnvVars(eid, { k: 'v' })
    render(<RestApiClientPage />)
    const spy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    fireEvent.click(screen.getByTestId(`env-delete-btn-${eid}`))
    expect(spy).toHaveBeenCalled()
    expect(useRestStore.getState().environments.find((e) => e.id === eid)).toBeFalsy()
  })

  it('8. 新增分组/环境不触发 discard 确认(spy confirm 未被调用)', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(window, 'prompt').mockReturnValue('x')
    render(<RestApiClientPage />)
    // 先弄脏草稿
    fireEvent.change(screen.getByTestId('url-input'), { target: { value: 'https://x/a' } })
    fireEvent.click(screen.getByTestId('add-group-btn'))
    fireEvent.click(screen.getByTestId('env-add-btn'))
    expect(confirmSpy).not.toHaveBeenCalled()
  })
})
