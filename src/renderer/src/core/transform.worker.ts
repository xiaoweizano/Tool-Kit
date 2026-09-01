import * as Comlink from 'comlink'
import type { Transform, TransformOpts, ToolResult } from './types'
import type { LangId } from '@tools/es-query-builder/types'
import { transformJson } from '@tools/json-parser/transform'
import { convertTimestamp } from '@tools/date-converter/transform'
import { fillPlaceholders } from '@tools/sql-placeholder/transform'
import { assembleTenantSql } from '@tools/sql-builder/transform'
import { matchRegex } from '@tools/regex-generator/transform'
import { parseCreateTable } from '@tools/testdata-gen/transform'
import { batchTransform } from '@tools/batch-transform/transform'
import { buildQueryDsl, parseQueryDsl, generateCode } from '@tools/es-query-builder/transform'
import { analyzeStrength, generateByRules } from '@tools/password-strength/transform'
import { parseJwt, verifyJwt, signJwt, renewJwt } from '@tools/jwt-tool/transform'
import type { JwtAlg } from '@tools/jwt-tool/types'
import type { Level } from '@tools/password-strength/types'

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
registry.set('regex-generator', ((input: { pattern: string; flags: string; text: string }) =>
  matchRegex({ pattern: input?.pattern ?? '', flags: input?.flags || 'g', text: input?.text ?? '' })
) as Transform<unknown, unknown, TransformOpts>)
registry.set('testdata-gen', ((input: { sql: string }) =>
  parseCreateTable(input?.sql ?? '')
) as Transform<unknown, unknown, TransformOpts>)
registry.set('batch-transform', ((input: { raw: string; opsJson: string; format: string; customSep: string }) =>
  batchTransform(input)
) as Transform<unknown, unknown, TransformOpts>)
registry.set('es-query-builder', ((input: unknown, opts?: TransformOpts) => {
  const action = opts?.action ?? 'build'
  if (action === 'parse') return parseQueryDsl(input as string)
  if (action === 'generate') return generateCode(input as string, (opts?.lang as LangId) ?? 'java')
  return buildQueryDsl(input as never)
}) as Transform<unknown, unknown, TransformOpts>)
registry.set('password-strength', ((input: string, opts?: TransformOpts) => {
  const action = opts?.action ?? 'analyze'
  if (action === 'generate') {
    const requireCharsets = typeof opts?.requireCharsets === 'string' ? opts.requireCharsets.split(',') : undefined
    return generateByRules({
      targetLevel: (opts?.targetLevel as Level) ?? 'medium',
      minLength: Number(opts?.minLength ?? 12),
      requireCharsets,
      excludeChars: typeof opts?.excludeChars === 'string' ? opts.excludeChars : undefined
    })
  }
  return analyzeStrength(input)
}) as unknown as Transform<unknown, unknown, TransformOpts>)
registry.set('jwt-tool', ((input: string, opts?: TransformOpts) => {
  const action = opts?.action ?? 'parse'
  const alg = (typeof opts?.alg === 'string' ? opts.alg : 'HS256') as JwtAlg
  const secret = typeof opts?.secret === 'string' ? opts.secret : ''
  const expiry = typeof opts?.expiry === 'string' ? opts.expiry : '1h'
  if (action === 'verify') return verifyJwt(input, secret, alg)
  if (action === 'sign') return signJwt(input, secret, alg, expiry)
  if (action === 'renew') return renewJwt(input, secret, expiry)
  return parseJwt(input)
}) as unknown as Transform<unknown, unknown, TransformOpts>)

const unsupported = (id: string): ToolResult<never> => ({
  status: 'error', kind: 'unsupported', structure: id, message: '未注册的工具'
})

const api = {
  run: (id: string, input: unknown, opts?: TransformOpts): ToolResult<unknown> =>
    (registry.get(id) ?? (() => unsupported(id)))(input, opts)
}

Comlink.expose(api)
