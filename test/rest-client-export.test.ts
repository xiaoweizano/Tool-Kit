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
})
