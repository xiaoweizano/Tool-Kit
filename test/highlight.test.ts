import { describe, it, expect } from 'vitest'
import { highlightLine } from '@components/highlight'

describe('JSON 逐行着色(纯函数,虚拟行渲染时现算)', () => {
  it('键与字符串着色', () => {
    const html = highlightLine('  "name": "toolkit",', 'json')
    expect(html).toContain('class="tk-k"')   // 键
    expect(html).toContain('class="tk-s"')   // 字符串
  })
  it('数字与字面量着色,转义 HTML', () => {
    const html = highlightLine('  "n": 42, "ok": true, "x": "<b>"', 'json')
    expect(html).toContain('class="tk-n"')
    expect(html).toContain('class="tk-p"')
    expect(html).toContain('&lt;b&gt;')
  })
  it('空行原样返回', () => {
    expect(highlightLine('', 'json')).toBe('')
  })
})
