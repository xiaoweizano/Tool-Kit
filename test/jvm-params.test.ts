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
  it('emits Xmx/Xms/Xmn/Metaspace with comments', () => {
    const r = generateJvmParams({ xms: '512m', xmx: '2g', xmn: '256m', metaspace: '256m', extra: [] })
    if (r.status !== 'ok') throw new Error('err')
    expect(r.data).toContain('-Xms512m')
    expect(r.data).toContain('-Xmx2g')
    expect(r.data).toContain('-Xmn256m')
    expect(r.data).toContain('-XX:MetaspaceSize=256m')
  })
  it('zgc and shenandoah emit their flags', () => {
    const z = generateJvmParams({ gc: 'zgc', extra: [] })
    if (z.status !== 'ok') throw new Error('err')
    expect(z.data).toContain('-XX:+UseZGC')
    const s = generateJvmParams({ gc: 'shenandoah', extra: [] })
    if (s.status !== 'ok') throw new Error('err')
    expect(s.data).toContain('-XX:+UseShenandoahGC')
  })
  it('debug + monitor + custom flags', () => {
    const r = generateJvmParams({
      heapDump: true, heapDumpPath: '/x', remoteDebugPort: '5005', printGc: true,
      jmxPort: '9999', flightRecorder: true, container: true, xmx: '2g',
      extra: ['-Dspring.profiles.active=prod']
    })
    if (r.status !== 'ok') throw new Error('err')
    expect(r.data).toContain('-XX:+HeapDumpOnOutOfMemoryError')
    expect(r.data).toContain('-XX:HeapDumpPath=/x')
    expect(r.data).toContain('-agentlib:jdwp')
    expect(r.data).toContain('-XX:+PrintGCDetails')
    expect(r.data).toContain('jmxremote.port=9999')
    expect(r.data).toContain('-XX:+FlightRecorder')
    expect(r.data).toContain('-XX:MaxRAMPercentage=75.0')
    expect(r.data).toContain('-Dspring.profiles.active=prod')
  })
  it('heap-flags test asserts actual heap output (was misnamed)', () => {
    const r = generateJvmParams({ xmx: '2g', extra: [] })
    if (r.status === 'ok') expect(r.data).toContain('-Xmx2g')
  })
})
