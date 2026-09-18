import { describe, it, expect, beforeEach } from 'vitest'
import { useRestStore, HISTORY_CAP, HISTORY_BODY_CAP } from '@tools/rest-api-client/store'
import type { HistoryEntry } from '@tools/rest-api-client/types'

beforeEach(() => {
  localStorage.clear()
  useRestStore.setState({ collections: [], environments: [], history: [], activeEnvId: '', writeFailed: false })
})

const big = (n: number) => 'x'.repeat(n)
const entry = (at: number, body = ''): HistoryEntry => ({
  id: 'h' + at,
  request: { method: 'GET', url: 'u', headers: [], body },
  response: { status: 200, statusText: '', durationMs: 1, sizeBytes: 1, finalUrl: 'u' },
  envName: 'x',
  at
})

describe('rest store', () => {
  it('历史超 50 淘汰最旧', () => {
    for (let i = 0; i < 55; i++) useRestStore.getState().pushHistory(entry(i))
    const h = useRestStore.getState().history
    expect(h.length).toBe(HISTORY_CAP)
    expect(h[0].at).toBe(54) // 最新在前
    expect(h[h.length - 1].at).toBe(5) // 最旧被淘汰
  })
  it('历史 body 超 10KB 截断标 truncated', () => {
    useRestStore.getState().pushHistory(entry(1, big(20000)))
    expect(useRestStore.getState().history[0].request.body.length).toBe(HISTORY_BODY_CAP)
  })
  it('集合树 add/remove', () => {
    const s = useRestStore.getState()
    s.addGroup('', '租户')
    const gid = useRestStore.getState().collections[0].id
    s.addRequest(gid, { id: 'r1', type: 'request', name: '登录', method: 'POST', url: '{{baseUrl}}/login', headers: [], body: '' })
    expect(useRestStore.getState().collections[0].children.length).toBe(1)
    useRestStore.getState().remove('r1')
    expect(useRestStore.getState().collections[0].children.length).toBe(0)
  })
  it('写失败标记', () => {
    useRestStore.getState().markWriteFailed()
    expect(useRestStore.getState().writeFailed).toBe(true)
  })
  it('持久化底层写失败时标记 writeFailed', () => {
    const original = (localStorage as { setItem?: unknown }).setItem
    ;(localStorage as { setItem?: unknown }).setItem = () => { throw new Error('QuotaExceededError') }
    try { useRestStore.getState().addEnv('dev') } finally { (localStorage as { setItem?: unknown }).setItem = original }
    expect(useRestStore.getState().writeFailed).toBe(true)
  })
  it('renameEnv 不可变改环境名且不动其它环境', () => {
    useRestStore.getState().addEnv('dev')
    useRestStore.getState().addEnv('prod')
    const before = useRestStore.getState().environments
    const dev = before.find((e) => e.name === 'dev')!
    useRestStore.getState().renameEnv(dev.id, '开发')
    const after = useRestStore.getState().environments
    expect(after.find((e) => e.id === dev.id)!.name).toBe('开发')
    expect(before.find((e) => e.id === dev.id)!.name).toBe('dev') // 原对象未被就地改写
    expect(after).not.toBe(before)
    expect(after.find((e) => e.name === 'prod')!.id).toBe(before.find((e) => e.name === 'prod')!.id)
  })
  it('rename 不可变且能改嵌套节点', () => {
    useRestStore.getState().addGroup('', '租户')
    const before = useRestStore.getState().collections[0]
    useRestStore.getState().addGroup(before.id, '子组')
    useRestStore.getState().rename(before.id, '租户2')
    const after = useRestStore.getState().collections[0]
    expect(after.name).toBe('租户2')
    expect(before.name).toBe('租户') // 原节点未被就地改写
    expect(after).not.toBe(before)
    expect(after.children[0].name).toBe('子组')
  })
})
