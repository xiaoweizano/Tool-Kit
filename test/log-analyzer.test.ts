import { describe, it, expect } from 'vitest'
import { analyzeLog, splitContextLines } from '@tools/log-analyzer/transform'

const LOG = [
  '2026-08-29 14:30:01.123 INFO  [http-nio-8080-exec-1] [traceId=abc123] GET /api/health 200',
  '2026-08-29 14:30:02.456 ERROR [http-nio-8080-exec-2] [traceId=abc123] [requestId=req1] get /api/order -> 500',
  '2026-08-29 14:30:03.000 ERROR [http-nio-8080-exec-2] [traceId=def456] [requestId=req2] NullPointerException at OrderService.getOrder',
  '\tat java.lang.NullPointerException: null',
  '2026-08-29 14:30:04.000 INFO  [main] Server started on port 8080 from 10.0.0.1'
].join('\n')

describe('analyzeLog', () => {
  it('level stats + ids + ips', () => {
    const r = analyzeLog(LOG)
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      const err = r.data.levelStats.find((l) => l.level === 'ERROR')
      expect(err?.count).toBe(2)
      expect(r.data.traceIds.length).toBeGreaterThanOrEqual(1)
      expect(r.data.ips.some((h) => h.id === '10.0.0.1')).toBe(true)
    }
  })
  it('exception clustering dedupes', () => {
    const r = analyzeLog(LOG)
    if (r.status === 'ok') {
      const npes = r.data.exceptions.filter((e) => e.type.includes('NullPointerException'))
      expect(npes.length).toBe(1)
      expect(npes[0].count).toBe(2)
      expect(npes[0].message).toBe('OrderService.getOrder')
    }
  })
  it('empty input invalid', () => {
    const r = analyzeLog('')
    expect(r.status).toBe('error')
    if (r.status === 'error') expect(r.kind).toBe('invalid-input')
  })
})

describe('splitContextLines', () => {
  it('returns window around a line', () => {
    const lines = LOG.split('\n')
    const ctx = splitContextLines(LOG, 2, 1)
    expect(ctx).toContain(lines[1])
    expect(ctx).toContain(lines[3])
  })
})
