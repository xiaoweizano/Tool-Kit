import { httpFetch, httpCancel } from '@core/http'
import { NetFetchError } from '@core/net-channel'
import type { NetFetchOk } from '@core/net-channel'
import { resolveVars } from './env-resolve'
import type { RequestModel, Env, ResponseModel } from './types'
import type { ToolResult } from '@core/types'

let currentId = ''

const KIND_MSG: Record<string, string> = {
  timeout: '请求超时',
  aborted: '已取消',
  network: '网络不可达或被浏览器拦截(CORS/mixed-content/网络)。桌面版不受此限制',
  other: '请求失败'
}

export async function sendRequest(
  req: RequestModel,
  env: Env | undefined,
  opts: { timeoutMs: number }
): Promise<ToolResult<ResponseModel>> {
  const vars = env?.vars ?? {}
  const requestId = crypto.randomUUID()
  currentId = requestId

  const u = resolveVars(req.url, vars)
  const headers: Record<string, string> = {}
  const undef: string[] = [...u.undefinedVars]
  for (const h of req.headers) {
    if (!h.key) continue
    const r = resolveVars(h.value, vars)
    headers[h.key] = r.resolved
    undef.push(...r.undefinedVars)
  }
  const b = resolveVars(req.body, vars)
  undef.push(...b.undefinedVars)

  const t0 = Date.now()
  try {
    const res: NetFetchOk = await httpFetch(
      u.resolved,
      { method: req.method, headers, body: b.resolved || undefined },
      { requestId, timeoutMs: opts.timeoutMs }
    )
    return { status: 'ok', data: { ...res, durationMs: Date.now() - t0 } }
  } catch (e) {
    if (e instanceof NetFetchError) {
      return { status: 'error', kind: 'engine', message: KIND_MSG[e.kind] ?? e.message }
    }
    return { status: 'error', kind: 'engine', message: String(e) }
  } finally {
    if (currentId === requestId) currentId = ''
  }
}

export function cancelCurrent(): void {
  if (currentId) httpCancel(currentId)
}
