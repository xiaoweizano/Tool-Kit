import { describe, it, expect } from 'vitest'
import { generateJvmParams } from '@tools/jvm-params/transform'

describe('generateJvmParams', () => {
  it('heap flags', () => {
    const r = generateJvmParams({ extra: [] })
    expect(r.status).toBe('ok')
  })
  it('includes g1 when chosen', () => {
    const r = generateJvmParams({ gc: 'g1', extra: [] })
    if (r.status !== 'ok') throw new Error('err')
    expect(r.data).toContain('-XX:+UseG1GC')
  })
  it('container flags', () => {
    const r = generateJvmParams({ container: true, xmx: '2g', extra: [] })
    if (r.status !== 'ok') throw new Error('err')
    expect(r.data).toContain('UseContainerSupport')
  })
})
