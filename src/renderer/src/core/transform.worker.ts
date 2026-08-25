import * as Comlink from 'comlink'
import type { Transform, TransformOpts, ToolResult } from './types'
import { transformJson } from '@tools/json-parser/transform'
import { convertTimestamp } from '@tools/date-converter/transform'
import { fillPlaceholders } from '@tools/sql-placeholder/transform'
import { assembleTenantSql } from '@tools/sql-builder/transform'

const registry = new Map<string, Transform<unknown, unknown, TransformOpts>>()
// 注册行示例(加工具在此追加 import + 一行注册)。
registry.set('json-parser', transformJson as Transform<unknown, unknown, TransformOpts>)
registry.set('date-converter', convertTimestamp as Transform<unknown, unknown, TransformOpts>)
registry.set('sql-placeholder', ((input: { sql: string; params: string }) => {
  const params = (input?.params ?? '').split('\n').filter((s) => s.trim() !== '')
  return fillPlaceholders({ sql: input?.sql ?? '', params })
}) as Transform<unknown, unknown, TransformOpts>)
registry.set('sql-builder', ((input: { tenants: string; sqls: string }) => {
  const splits = (s: string) => s.split(/[\n,]+/).map((x) => x.trim()).filter(Boolean)
  const sqls = (input?.sqls ?? '').split(/\n+/).map((x) => x.trim()).filter(Boolean)
  return assembleTenantSql({ tenants: splits(input?.tenants ?? ''), sqls })
}) as Transform<unknown, unknown, TransformOpts>)

const unsupported = (id: string): ToolResult<never> => ({
  status: 'error', kind: 'unsupported', structure: id, message: '未注册的工具'
})

const api = {
  run: (id: string, input: unknown, opts?: TransformOpts): ToolResult<unknown> =>
    (registry.get(id) ?? (() => unsupported(id)))(input, opts)
}

Comlink.expose(api)
