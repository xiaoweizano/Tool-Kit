import { describe, it, expect } from 'vitest'
import { compareSemver } from '@core/check-update'

describe('semver 比对', () => {
  it('识别新版可用', () => {
    expect(compareSemver('0.1.0', 'v0.2.0')).toBe('newer')
  })
  it('相同版本', () => {
    expect(compareSemver('0.1.0', '0.1.0')).toBe('same')
  })
  it('无最新信息', () => {
    expect(compareSemver('0.1.0', null)).toBe('unknown')
  })
})
