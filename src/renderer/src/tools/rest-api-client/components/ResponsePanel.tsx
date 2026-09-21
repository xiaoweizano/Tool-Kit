import { useMemo, useState } from 'react'
import { JsonView } from '@components/JsonView'
import { CopyButton } from '@components/CopyButton'
import { writeDeepLink } from '../deep-link'
import { DEFAULT_RESPONSE_H, MAX_RESERVE, MIN_RESPONSE_H } from '../split-layout'
import type { ResponseModel, UiError } from '../types'

const MB = 1024 * 1024

interface Props {
  response: ResponseModel | null
  error: UiError | null
  sending: boolean
  onCancel: () => void
  // 以下三项由 Task 7 从 useRestLayout 注入;缺省值让面板可独立渲染/测试
  collapsed?: boolean
  onToggle?: () => void
  height?: number
}

export function ResponsePanel({
  response,
  error,
  sending,
  onCancel,
  collapsed = false,
  onToggle = () => {},
  height = DEFAULT_RESPONSE_H
}: Props): JSX.Element {
  const [notice, setNotice] = useState('')

  const body = response?.body ?? ''
  const size = body.length
  const truncated = size > MB
  const ct = (response?.headers['content-type'] ?? '').toLowerCase()
  const isJson = ct.includes('json') || /^\s*[[{]/.test(body)
  // 拖拽分隔条时 height 变化会高频重渲染本组件(~60/s):把全文 JSON.parse 与 1MB slice
  // 缓存起来,只有 body / 截断标志 / JSON 判定真正变化时才重算,避免每次指针移动阻塞主线程。
  const preview = useMemo(() => (truncated ? body.slice(0, MB) : body), [body, truncated])
  // 超过 1MB 的响应:绝不整体 JSON.parse、也绝不渲染完整 JsonView 树(会冻结界面);
  // 只走下方截断 <pre> 预览分支。上方的截断提示条已说明「复制」「深链」仍使用全量文本。
  const jsonValue = useMemo(
    () => (!truncated && isJson ? safeParse(body) : null),
    [body, truncated, isJson]
  )

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

  return (
    <section
      data-testid="response-panel"
      className="flex shrink-0 flex-col overflow-hidden border-t border-base-300 bg-base-200/40"
      style={
        collapsed
          ? undefined
          : { height, minHeight: MIN_RESPONSE_H, maxHeight: `calc(100% - ${MAX_RESERVE}px)` }
      }
    >
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <button
          data-testid="response-toggle"
          className="btn btn-xs btn-ghost gap-1 px-1 font-mono"
          aria-expanded={!collapsed}
          onClick={onToggle}
        >
          <span aria-hidden="true">{collapsed ? '▸' : '▾'}</span>
          返回响应
        </button>

        {sending ? (
          <span className="font-mono text-sm text-warning">◐ 请求进行中…</span>
        ) : error ? (
          <span role="alert" className="font-mono text-sm text-error">✕ {error.title}</span>
        ) : response ? (
          <>
            <span data-testid="response-status" className={`badge badge-lg font-mono font-bold ${statusColor(response.status)}`}>
              {response.status} {response.statusText}
            </span>
            <span className="font-mono text-[11px] text-neutral">{response.durationMs} ms</span>
            <span className="font-mono text-[11px] text-neutral">{formatBytes(response.bodyBytes)}</span>
          </>
        ) : (
          <span className="font-mono text-[11px] text-neutral">填好请求,点发送或 Ctrl+Enter</span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {sending && (
            <button className="btn btn-xs btn-ghost" onClick={onCancel}>取消</button>
          )}
          {!sending && response && (
            <CopyButton getText={() => response.body} enabled={response.body !== ''} />
          )}
        </div>
      </div>

      {/* 发送中隐藏整个 body 容器:否则会残留上一次响应的内容,与「进行中」头部自相矛盾 */}
      {!collapsed && !sending && (
        <div data-testid="response-body" className="flex min-h-0 flex-1 flex-col">
          {/* 错误详情 */}
          {error && <div className="px-3 pb-2 text-sm">{error.message}</div>}

          {/* 成功态:finalUrl / 未替换变量 / 截断提示 / notice / headers 折叠 / body / 深链按钮 */}
          {response && (
            <>
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
            </>
          )}
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
