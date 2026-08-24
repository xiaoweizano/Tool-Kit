import { describe, it, expect } from 'vitest'
import type { ToolResult, ToolDescriptor } from '@core/types'

describe('ToolResult 判别联合', () => {
  it('ok 携带 data', () => {
    const r: ToolResult<string> = { status: 'ok', data: 'x' }
    expect(r.status).toBe('ok')
  })
  it('invalid-input 携带位置', () => {
    const r: ToolResult<never> = { status: 'error', kind: 'invalid-input', message: '非法字符', position: 12 }
    expect(r.kind).toBe('invalid-input')
  })
  it('partial 携带失败项', () => {
    const r: ToolResult<string[]> = { status: 'error', kind: 'partial', message: '部分失败', failedItems: [3, 7] }
    expect(r.failedItems).toEqual([3, 7])
  })
  it('unsupported 携带结构名', () => {
    const r: ToolResult<never> = { status: 'error', kind: 'unsupported', structure: '合并单元格', message: '不支持' }
    expect(r.structure).toBe('合并单元格')
  })
})

// @ts-expect-error 缺 capability 必须编译期失败
const bad: ToolDescriptor = { id: 'x', name: 'X', route: '/tools/x' }
void bad
