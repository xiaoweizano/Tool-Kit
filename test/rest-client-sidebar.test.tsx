// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, fireEvent, screen, cleanup, act } from '@testing-library/react'
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

  it('9. 首次使用(空树)点「+ 请求」→ 建默认分组并落入请求,绝不静默丢弃', () => {
    // 空集合:旧代码里 addRequest('') 会被 insert 静默丢弃(collections 保持空)
    vi.spyOn(window, 'prompt').mockReturnValue('首个请求')
    render(<RestApiClientPage />)
    fireEvent.click(screen.getByTestId('add-request-btn'))
    const cols = useRestStore.getState().collections
    expect(cols.length).toBe(1)
    expect(cols[0].type).toBe('group')
    expect(cols[0].name).toBe('默认分组')
    expect(cols[0].children.length).toBe(1)
    const req = cols[0].children[0]
    expect(req.type).toBe('request')
    expect(req.name).toBe('首个请求')
  })

  it('10. 选中分组后删除它,再点「+ 请求」→ 请求仍落入真实分组(不消失)', () => {
    // 预置两个顶层分组 A、B
    useRestStore.getState().addGroup('', '组A')
    useRestStore.getState().addGroup('', '组B')
    const gidA = useRestStore.getState().collections.find((c) => c.name === '组A')!.id
    render(<RestApiClientPage />)
    // 选中 A 作为父节点(点击分组标题)
    fireEvent.click(screen.getByTestId(`group-node-${gidA}`))
    // 删除 A(A 无子项,不触发确认;仍 stub 以防)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    fireEvent.click(screen.getByTestId(`delete-btn-${gidA}`))
    expect(useRestStore.getState().collections.find((c) => c.id === gidA)).toBeFalsy()
    // 旧代码:selectedParentId 仍指向已删除的 A → addRequest 被静默丢弃
    vi.spyOn(window, 'prompt').mockReturnValue('迁移后的请求')
    fireEvent.click(screen.getByTestId('add-request-btn'))
    const reqNames = useRestStore
      .getState()
      .collections.flatMap((g) => g.children.map((n) => n.name))
    expect(reqNames).toContain('迁移后的请求')
  })
})

describe('bundle 导入/导出 UI + 历史「已截断」徽标', () => {
  // jsdom 不实现 Blob URL:最小 stub,真实断言落在导出内容与 store 转变上
  const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:mock-url')
  const revokeObjectURL = vi.fn()
  beforeEach(() => {
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true, writable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true, writable: true })
    createObjectURL.mockClear()
    revokeObjectURL.mockClear()
  })

  it('11. 导出:含明文环境变量时先弹「明文 token」警告,确认后下载 exportBundle 内容', async () => {
    useRestStore.getState().addEnv('dev')
    useRestStore.getState().setEnvVars(useRestStore.getState().environments[0].id, { tk: 'secret-token' })
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<RestApiClientPage />)
    fireEvent.click(screen.getByTestId('bundle-export-btn'))
    // 警告必须触发且点名明文 token(spec scenario: 含 token 导出警告)
    expect(confirmSpy).toHaveBeenCalledOnce()
    expect(String(confirmSpy.mock.calls[0][0])).toContain('明文 token')
    // 下载内容 = exportBundle() 的 JSON(含该明文值),而非空壳
    expect(createObjectURL).toHaveBeenCalledOnce()
    const blob = createObjectURL.mock.calls[0][0]
    const text = await blob.text()
    expect(JSON.parse(text)).toMatchObject({ version: 1 })
    expect(text).toContain('secret-token')
    expect(clickSpy).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('12. 导出:警告弹窗点取消 → 不下载(store 不受影响)', () => {
    useRestStore.getState().addEnv('dev')
    useRestStore.getState().setEnvVars(useRestStore.getState().environments[0].id, { tk: 'secret' })
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<RestApiClientPage />)
    fireEvent.click(screen.getByTestId('bundle-export-btn'))
    expect(createObjectURL).not.toHaveBeenCalled()
    expect(clickSpy).not.toHaveBeenCalled()
    expect(useRestStore.getState().environments.length).toBe(1)
  })

  it('13. 导入:合法 bundle 填充 store 并提示导入成功', async () => {
    render(<RestApiClientPage />)
    const bundle = JSON.stringify({
      version: 1,
      exportedAt: '2026-09-20T00:00:00.000Z',
      collections: [{ id: 'imp-group-1', type: 'group', name: '导入组', children: [] }],
      environments: [{ id: 'imp-env-1', name: 'qa', vars: { tk: 'v' } }]
    })
    const file = new File([bundle], 'bundle.json', { type: 'application/json' })
    await act(async () => {
      fireEvent.change(screen.getByTestId('bundle-import-input'), { target: { files: [file] } })
    })
    // 真实 store 转变,不是 mock 被调用
    expect(useRestStore.getState().collections.some((c) => c.id === 'imp-group-1')).toBe(true)
    expect(useRestStore.getState().environments.some((e) => e.id === 'imp-env-1')).toBe(true)
    expect(screen.getByTestId('bundle-import-notice').textContent).toContain('导入成功')
  })

  it('14. 导入:非法 bundle 显示原因且 store 保持原状(不静默失败)', async () => {
    useRestStore.getState().addEnv('keep')
    render(<RestApiClientPage />)
    const bad = JSON.stringify({ version: 999, collections: [], environments: [] })
    const file = new File([bad], 'bad.json', { type: 'application/json' })
    await act(async () => {
      fireEvent.change(screen.getByTestId('bundle-import-input'), { target: { files: [file] } })
    })
    const notice = screen.getByTestId('bundle-import-notice').textContent ?? ''
    expect(notice).toContain('导入失败')
    expect(notice).toContain('unsupported bundle version: 999')
    // 原子性:现有数据一条不少
    expect(useRestStore.getState().environments.map((e) => e.name)).toEqual(['keep'])
    expect(useRestStore.getState().collections.length).toBe(0)
  })

  it('15. 历史 body 截断条目显示「已截断」徽标(截断可见,不静默)', () => {
    useRestStore.getState().pushHistory({
      id: 'h1',
      request: { method: 'POST', url: '/u', headers: [], body: 'x'.repeat(20000) },
      response: { status: 200, statusText: 'OK', durationMs: 1, sizeBytes: 1, finalUrl: 'u' },
      envName: '',
      at: 1
    })
    render(<RestApiClientPage />)
    expect(screen.getByText('已截断')).toBeTruthy()
  })
})
