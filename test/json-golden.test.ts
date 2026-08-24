import { describe, it, expect } from 'vitest'
import { transformJson } from '@tools/json-parser/transform'
import { manifest } from './fixtures/json-parser/manifest'

describe('golden:逐样例断言', () => {
  for (const c of manifest) {
    it(c.name, () => {
      const r = transformJson(c.input, { indent: '2' })
      if (c.expected.status === 'ok') {
        expect(r).toEqual(c.expected)
      } else if (r.status === 'error') {
        expect(r.kind).toBe(c.errorKind ?? 'invalid-input')
        expect(r.message).toBeTypeOf('string')
        if (c.errorPosition != null) expect((r as { position?: number }).position).toBe(c.errorPosition)
      } else {
        expect.unreachable(`golden ${c.name} expected error`)
      }
    })
  }
})
