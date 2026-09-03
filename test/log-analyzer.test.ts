import { describe, it, expect } from 'vitest'
import { analyzeLog, splitContextLines } from '@tools/log-analyzer/transform'

const LOG = [
  '2026-08-29 14:30:01.123 INFO  [http-nio-8080-exec-1] [traceId=abc123] GET /api/health 200',
  '2026-08-29 14:30:02.456 ERROR [http-nio-8080-exec-2] [traceId=abc123] [requestId=req1] get /api/order -> 500',
  '2026-08-29 14:30:03.000 ERROR [http-nio-8080-exec-2] [traceId=def456] [requestId=req2] NullPointerException at OrderService.getOrder',
  '\tat java.lang.NullPointerException: null',
  '2026-08-29 14:30:04.000 INFO  [main] Server started on port 8080 from 10.0.0.1'
].join('\n')

const RICH = [
  '2026-08-29 14:30:00.000 ERROR [pid=1] [tid=abc] [rid=r1] POST /api/order 500 timeoutException at OrderService.getOrder',
  '\tat java.lang.TimeoutException: timed out',
  '2026-08-29 14:30:00.000 ERROR [pid=1] [tid=def] [rid=r2] POST /api/order 500 timeoutException at OrderService.pay',
  '2026-08-29 14:31:00.000 WARN  [pid=1] GET /api/health 200 slow database',
  '2026-08-29 14:32:00.000 INFO  [pid=1] GET /api/health 200 ok'
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
  it('>50MB input returns ok over truncated slice', () => {
    // Build the >50MB input from MANY SMALL lines (a short representative log
    // line repeated), NOT from a few huge lines. Per-line `.trim()`/`.toUpperCase()`
    // /regex-work on 1MB-long strings is pathological and hangs the worker, so we
    // keep each line short while still exceeding 50MB to fire the truncation branch.
    const line = '2026-08-29 14:30:00.000 ERROR [tid=abc] [rid=req1] POST /api/order 500 NullPointerException at OrderService.getOrder\n'
    // reps is chosen so raw.length genuinely exceeds 50MB (the truncation path).
    const reps = Math.ceil((50 * 1024 * 1024) / line.length) + 100
    const big = line.repeat(reps)
    expect(big.length).toBeGreaterThan(50 * 1024 * 1024)
    const r = analyzeLog(big)
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      // Truncation happened: totalLines reflects the truncated slice, i.e. fewer
      // lines than the full input contained.
      expect(r.data.totalLines).toBeGreaterThan(0)
      expect(r.data.totalLines).toBeLessThan(reps)
      expect(r.data.levelStats.length).toBeGreaterThan(0)
    }
  })
  it('extracts keywords from ERROR lines', () => {
    const r = analyzeLog(RICH)
    if (r.status !== 'ok') throw new Error('err')
    expect(r.data.keywords.length).toBeGreaterThan(0)
    expect(r.data.keywords.some((k) => k.word === 'timeoutException' || k.word === 'OrderService')).toBe(true)
  })
  it('aggregates errors per endpoint', () => {
    const r = analyzeLog(RICH)
    if (r.status !== 'ok') throw new Error('err')
    const ep = r.data.endpoints.find((e) => e.path === '/api/order')
    expect(ep).toBeDefined()
    expect(ep?.errors[0].count).toBe(2)
  })
  it('builds a timeline from timestamps', () => {
    const r = analyzeLog(RICH)
    if (r.status !== 'ok') throw new Error('err')
    expect(r.data.timeline.length).toBeGreaterThan(0)
    expect(r.data.timeline.every((t) => typeof t.ts === 'string' && t.count >= 1)).toBe(true)
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

describe('robust detection + error coloring', () => {
  // NOTE: endpoints aggregate ERROR/FATAL lines only. Line 1 (verb path) and the
  // bare-path ERROR line both carry numeric time and must yield error count = 2.
  const LOG = [
    '[2026-09-03 10:00:01] ERROR - GET /api/order/123 boom\n\tCaused by: java.sql.SQLException\n\tat com.x.Dao.query(Dao.java:10)',
    '[2026-09-03 10:00:02] ERROR - /api/health down',
  ].join('\n')
  it('clusters Caused by exception even without Exception keyword on same line', () => {
    const r = analyzeLog(LOG)
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      const types = r.data.exceptions.map((e) => e.type)
      expect(types.some((t) => t.includes('SQLException'))).toBe(true)
    }
  })
  it('aggregates endpoint path without HTTP verb (path token only)', () => {
    const r = analyzeLog(LOG)
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      const paths = r.data.endpoints.map((e) => e.path)
      expect(paths.some((p) => p === '/api/order/{id}' || p === '/api/order/123')).toBe(true)
      expect(paths.some((p) => p === '/api/health')).toBe(true)
    }
  })
  it('timeline buckets carry an error count', () => {
    const r = analyzeLog(LOG)
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.data.timeline.every((t) => typeof t.error === 'number'))
      expect(r.data.timeline.reduce((s, t) => s + (t.error ?? 0), 0)).toBe(2)
    }
  })
})
