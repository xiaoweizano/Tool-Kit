import { describe, it, expect, beforeEach } from 'vitest'
import { useRestStore, exportBundle, importBundle, bundleHasSecrets } from '@tools/rest-api-client/store'

beforeEach(() => {
  localStorage.clear()
  useRestStore.setState({ collections: [], environments: [], history: [], activeEnvId: '' })
})

describe('bundle import/export', () => {
  it('导出清空再导入还原', () => {
    useRestStore.getState().addEnv('dev')
    useRestStore.getState().setEnvVars(useRestStore.getState().environments[0].id, { tk: 'secret' })
    const snap =
      JSON.stringify(useRestStore.getState().collections) +
      JSON.stringify(useRestStore.getState().environments)
    const b = exportBundle()
    useRestStore.setState({ environments: [], collections: [] })
    expect(importBundle(b).ok).toBe(true)
    expect(
      JSON.stringify(useRestStore.getState().collections) + JSON.stringify(useRestStore.getState().environments)
    ).toBe(snap)
    expect(bundleHasSecrets()).toBe(true)
  })

  it('非法 bundle 不污染', () => {
    useRestStore.getState().addEnv('keep')
    const r = importBundle('{"nope":1}')
    expect(r.ok).toBe(false)
    expect(useRestStore.getState().environments.length).toBe(1)
  })

  it('同名共存不覆盖', () => {
    useRestStore.getState().addEnv('dev')
    useRestStore.getState().addEnv('dev')
    expect(useRestStore.getState().environments.length).toBe(2)
  })

  it('导入同名环境时按 id 合并,新 id 追加、同名共存', () => {
    useRestStore.getState().addEnv('dev')
    const localId = useRestStore.getState().environments[0].id
    const foreign = JSON.stringify({
      version: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      collections: [],
      environments: [{ id: 'foreign-id', name: 'dev', vars: {} }]
    })
    expect(importBundle(foreign).ok).toBe(true)
    const envs = useRestStore.getState().environments
    expect(envs.length).toBe(2)
    expect(envs.some((e) => e.id === localId)).toBe(true)
    expect(envs.some((e) => e.id === 'foreign-id')).toBe(true)
  })

  it('无任何非空环境变量时 bundleHasSecrets 为 false', () => {
    useRestStore.getState().addEnv('empty')
    expect(bundleHasSecrets()).toBe(false)
  })

  it('导出后清空再导入还原集合树(组+子请求)', () => {
    const s = useRestStore.getState()
    s.addGroup('', '租户')
    const gid = useRestStore.getState().collections[0].id
    s.addRequest(gid, {
      id: 'child-req',
      type: 'request',
      name: '登录',
      method: 'POST',
      url: '{{baseUrl}}/login',
      headers: [],
      body: '{}'
    })
    const before = JSON.stringify(useRestStore.getState().collections)
    const b = exportBundle()
    useRestStore.setState({ collections: [] })
    expect(importBundle(b).ok).toBe(true)
    const cols = useRestStore.getState().collections
    expect(cols.length).toBe(1)
    expect(cols[0]).toMatchObject({ id: gid, type: 'group', name: '租户' })
    expect(cols[0].children.length).toBe(1)
    expect(cols[0].children[0]).toMatchObject({
      id: 'child-req',
      type: 'request',
      name: '登录',
      method: 'POST',
      url: '{{baseUrl}}/login'
    })
    expect(JSON.stringify(cols)).toBe(before)
  })

  it('重复导入同一 bundle 不产生重复条目(id 跳过)', () => {
    const s = useRestStore.getState()
    s.addGroup('', '组A')
    const gidA = useRestStore.getState().collections[0].id
    s.addRequest(gidA, { id: 'req-a', type: 'request', name: 'a', method: 'GET', url: 'u/a', headers: [], body: '' })
    s.addGroup('', '组B')
    const gidB = useRestStore.getState().collections[1].id
    s.addRequest(gidB, { id: 'req-b', type: 'request', name: 'b', method: 'GET', url: 'u/b', headers: [], body: '' })
    s.addEnv('dev')
    const b = exportBundle()
    useRestStore.setState({ collections: [], environments: [] })
    expect(importBundle(b).ok).toBe(true)
    const afterFirst = {
      groups: useRestStore.getState().collections.length,
      children: useRestStore.getState().collections.map((g) => g.children.length),
      envs: useRestStore.getState().environments.length
    }
    expect(importBundle(b).ok).toBe(true)
    const afterSecond = {
      groups: useRestStore.getState().collections.length,
      children: useRestStore.getState().collections.map((g) => g.children.length),
      envs: useRestStore.getState().environments.length
    }
    expect(afterSecond).toEqual(afterFirst)
    expect(afterSecond.groups).toBe(2)
    expect(afterSecond.envs).toBe(1)
  })
})
