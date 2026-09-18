// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { writeDeepLink, readDeepLink } from '@tools/rest-api-client/deep-link'
beforeEach(() => sessionStorage.clear())
describe('deep-link', () => {
  it('写后读一次即清', () => { writeDeepLink('json-parser', '{"a":1}'); expect(readDeepLink('json-parser')).toBe('{"a":1}'); expect(readDeepLink('json-parser')).toBeNull() })
})
