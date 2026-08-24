import * as Comlink from 'comlink'
import type { Transform, TransformOpts, ToolResult } from './types'

const registry = new Map<string, Transform<unknown, unknown, TransformOpts>>()
// 注册行示例(加工具在此追加 import + 一行注册)。
// 注:json-parser 的真实 transform 在 Task 9 落地,此处先以恒等函数占位。
registry.set('json-parser', (i) => ({ status: 'ok', data: i }) as ToolResult<unknown>)

const unsupported = (id: string): ToolResult<never> => ({
  status: 'error', kind: 'unsupported', structure: id, message: '未注册的工具'
})

const api = {
  run: (id: string, input: unknown, opts?: TransformOpts): ToolResult<unknown> =>
    (registry.get(id) ?? (() => unsupported(id)))(input, opts)
}

Comlink.expose(api)
