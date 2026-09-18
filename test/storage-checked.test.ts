import { describe, it, expect } from 'vitest'
import { storageSetChecked } from '@core/storage'
describe('storageSetChecked', () => {
  it('正常写入返回 ok', () => { expect(storageSetChecked('k', { a: 1 })).toEqual({ ok: true }) })
  it('setItem 抛错返回 ok:false 且带 reason', () => {
    const orig = localStorage.setItem; ;(localStorage as { setItem?: unknown }).setItem = () => { throw new Error('QuotaExceededError') }
    const r = storageSetChecked('k', 1); ;(localStorage as { setItem?: unknown }).setItem = orig
    expect(r.ok).toBe(false); if (!r.ok) expect(r.reason).toContain('Quota')
  })
})
