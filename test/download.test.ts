// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildBlobUrl } from '@core/download'

describe('buildBlobUrl', () => {
  beforeEach(() => { vi.restoreAllMocks() })
  it('创建 blob URL', () => {
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() })
    expect(buildBlobUrl(['x'], 'text/markdown')).toBe('blob:mock')
    expect(URL.createObjectURL).toHaveBeenCalled()
  })
})
