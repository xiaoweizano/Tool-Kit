import { useState } from 'react'
import { JsonView } from '@components/JsonView'
import { CopyButton } from '@components/CopyButton'
import { writeDeepLink } from '../deep-link'
import type { ResponseModel, UiError } from '../types'

const MB = 1024 * 1024

interface Props {
  response: ResponseModel | null
  error: UiError | null
  sending: boolean
  onCancel: () => void
}

export function ResponsePanel({ response, error, sending, onCancel }: Props): JSX.Element {
  const [notice, setNotice] = useState('')

  if (sending) {
    return (
      <section className="flex w-2/5 min-w-0 flex-col border border-base-300 bg-base-200/40">
        <div className="p-4 font-mono text-sm text-warning">◐ 请求进行中…
          <button className="btn btn-xs btn-ghost ml-3" onClick={onCancel}>取消</button>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="flex w-2/5 min-w-0 flex-col border border-error/60 bg-base-200/40">
        <div role="alert" className="p-4">
          <span className="font-mono text-sm text-error">✕ {error.title}</span>
          <p className="mt-1 text-sm">{error.message}</p>
        </div>
      </section>
    )
  }

  if (!response) {
    return (
      <section className="flex w-2/5 min-w-0 flex-col items-center justify-center border border-base-300 bg-base-200/40 p-6 text-center text-sm text-neutral">
        填好左侧请求,点「发送」或按 Ctrl+Enter
      </section>
    )
  }

  const body = response.body
  const size = body.length
  const truncated = size > MB
  const preview = truncated ? body.slice(0, MB) : body
  const ct = (response.headers['content-type'] ?? '').toLowerCase()
  const isJson = ct.includes('json') || /^\s*[[{]/.test(body)
  // 超过 1MB 的响应:绝不整体 JSON.parse、也绝不渲染完整 JsonView 树(会冻结界面);
  // 只走下方截断 <pre> 预览分支。上方的截断提示条已说明「复制」「深链」仍使用全量文本。
  const jsonValue = !truncated && isJson ? safeParse(body) : null

  const selected = (): string => {
    try {
      return window.getSelection()?.toString() ?? ''
    } catch {
      return ''
    }
  }

  const goto = (route: string): void => {
    window.location.hash = route
  }

  const openJson = (): void => {
    if (writeDeepLink('json-parser', body)) {
      goto('/tools/json-parser')
    } else {
      setNotice('响应过大,无法作为深链传递(请使用「复制」)')
    }
  }

  const openJwt = (): void => {
    const sel = selected()
    const payload = sel || body
    if (writeDeepLink('jwt-tool', payload)) {
      goto('/tools/jwt-tool')
      return
    }
    // 降级:仅传选中文本
    if (sel && writeDeepLink('jwt-tool', sel)) {
      setNotice('载荷过大,已降级为仅传递选中文本')
      goto('/tools/jwt-tool')
      return
    }
    // 文案如实区分两种原因:有选中(写它也超配额)与无选中
    setNotice(
      sel
        ? '响应过大且选中文本也超出配额,无法深链传递(请使用「复制」)'
        : '载荷过大且无选中文本,无法深链传递(请使用「复制」)'
    )
  }

  const statusClass = statusColor(response.status)

  return (
    <section className="flex w-2/5 min-w-0 flex-col border border-base-300 bg-base-200/40">
      <div className="flex flex-wrap items-center gap-2 border-b border-base-300 p-3">
        <span data-testid="response-status" className={`badge badge-lg font-mono font-bold ${statusClass}`}>
          {response.status} {response.statusText}
        </span>
        <span className="font-mono text-[11px] text-neutral">{response.durationMs} ms</span>
        <span className="font-mono text-[11px] text-neutral">{formatBytes(response.bodyBytes)}</span>
        <div className="ml-auto flex items-center gap-2">
          <CopyButton getText={() => body} enabled={body !== ''} />
        </div>
      </div>

      {response.finalUrl && (
        <div className="truncate border-b border-base-300 px-3 py-1 font-mono text-[11px] text-neutral" title={response.finalUrl}>
          → {response.finalUrl}
        </div>
      )}

      {response.undefinedVars.length > 0 && (
        <div className="border-b border-warning/40 bg-warning/10 px-3 py-1 font-mono text-[11px] text-warning">
          未替换变量:{response.undefinedVars.join(', ')}
        </div>
      )}

      {truncated && (
        <div className="border-b border-warning/40 bg-warning/10 px-3 py-1 font-mono text-[11px] text-warning">
          响应超过 1MB,此处为截断预览(「复制」「深链」使用完整 {formatBytes(size)} 全量)
        </div>
      )}

      {notice && (
        <div className="border-b border-info/40 bg-info/10 px-3 py-1 font-mono text-[11px] text-info">{notice}</div>
      )}

      {/* headers 折叠 */}
      <details className="border-b border-base-300 px-3 py-1">
        <summary className="cursor-pointer font-mono text-[11px] tracking-widest text-neutral">
          HEADERS · {Object.keys(response.headers).length}
        </summary>
        <div className="py-2 font-mono text-[12px]">
          {Object.entries(response.headers).map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <span className="text-info">{k}:</span>
              <span className="min-w-0 flex-1 break-all">{v}</span>
            </div>
          ))}
        </div>
      </details>

      {/* body */}
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {body === '' ? (
          <div className="font-mono text-sm text-neutral">EMPTY · 无响应体</div>
        ) : jsonValue !== null ? (
          <JsonView value={jsonValue} />
        ) : (
          <pre className="whitespace-pre-wrap break-all font-mono text-[12px]">{preview}</pre>
        )}
      </div>

      {body !== '' && (
        <div className="flex gap-2 border-t border-base-300 p-3">
          <button className="btn btn-xs btn-primary" onClick={openJson}>用 JSON 解析打开</button>
          <button className="btn btn-xs btn-secondary" onClick={openJwt}>用 JWT 解析打开</button>
        </div>
      )}
    </section>
  )
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function statusColor(status: number): string {
  if (status >= 200 && status < 300) return 'badge-success'
  if (status >= 400) return 'badge-error'
  return 'badge-warning'
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}
