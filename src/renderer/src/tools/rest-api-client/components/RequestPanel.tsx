import { useEffect, useRef, useState } from 'react'
import { newKv, parseQuery, serializeQuery } from '../query-params'
import { resolveVars } from '../env-resolve'
import type { Env, KV, RequestModel } from '../types'

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
const TIMEOUTS = [5, 10, 15, 30, 60]

interface Props {
  draft: RequestModel
  onChange: (patch: Partial<RequestModel>) => void
  timeoutSec: number
  onTimeoutChange: (sec: number) => void
  env: Env | undefined
  sending: boolean
  onSend: () => void
  onImportCurl: (text: string) => void
  onExportCurl: () => void
  name: string
  onNameChange: (name: string) => void
  onSaveCopy: () => void
  dirty: boolean
}

type ReqTab = 'params' | 'headers' | 'body' | 'curl'

export function RequestPanel(p: Props): JSX.Element {
  const [curlText, setCurlText] = useState('')
  const [formatMsg, setFormatMsg] = useState('')
  const [newKey, setNewKey] = useState('')
  const [newVal, setNewVal] = useState('')
  const [tab, setTab] = useState<ReqTab>('params')

  // query 参数行以本地 state 为准,id 保持稳定 —— 避免每次渲染 parseQuery 重新生成
  // randomUUID 导致 key 变化,进而让输入框重挂载(丢焦点、破坏中文输入法组合)。
  const [params, setParams] = useState<KV[]>(() => parseQuery(p.draft.url).params)
  // 记录 params state 当前对应的 URL;只有当 URL 从「参数编辑器外部」改变时才回同步表格
  const syncedUrlRef = useRef(p.draft.url)

  const qIdx = p.draft.url.indexOf('?')
  const base = qIdx === -1 ? p.draft.url : p.draft.url.slice(0, qIdx)

  // URL 被外部改写(地址栏输入 / 载入请求 / cURL 导入 / 历史)→ 重新解析并回表。
  // 按「key 名 + 位置」复用旧 id,使未改动的行不重挂载。
  useEffect(() => {
    if (p.draft.url === syncedUrlRef.current) return
    syncedUrlRef.current = p.draft.url
    setParams((prev) => reconcileParams(parseQuery(p.draft.url).params, prev))
  }, [p.draft.url])

  const setUrl = (url: string): void => p.onChange({ url })

  // 参数编辑器内的改动:以当前行为准提交,同时把 URL 推给父级并标记为「已知」,
  // 阻止上面的 effect 再回解析覆盖(否则会重挂载并打断正在编辑的输入框)。
  const commit = (rows: KV[]): void => {
    const url = serializeQuery(base, rows)
    syncedUrlRef.current = url
    setParams(rows)
    p.onChange({ url })
  }

  const editParam = (i: number, patch: Partial<KV>): void => {
    commit(params.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))
  }
  const removeParam = (i: number): void => {
    commit(params.filter((_, idx) => idx !== i))
  }
  const addParam = (): void => {
    if (!newKey.trim()) return
    commit([...params, newKv(newKey, newVal)])
    setNewKey('')
    setNewVal('')
  }

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      if (!p.sending) p.onSend()
    }
  }

  const formatBody = (): void => {
    try {
      p.onChange({ body: JSON.stringify(JSON.parse(p.draft.body), null, 2) })
      setFormatMsg('')
    } catch {
      setFormatMsg('body 不是合法 JSON,无法格式化')
    }
  }

  const qCount = params.length
  const hCount = p.draft.headers.length

  // URL 栏实时 {{var}} 解析提示
  const hint = resolveVars(p.draft.url, p.env?.vars ?? {})

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-base-300 px-3 py-2">
        <input
          className="min-w-0 flex-1 border-0 bg-transparent font-mono text-[13px] font-bold text-base-content outline-none focus:border-b focus:border-primary"
          placeholder="请求名称"
          value={p.name}
          onChange={(e) => p.onNameChange(e.target.value)}
          aria-label="请求名称"
        />
        {p.dirty && (
          <span data-testid="dirty-marker" className="shrink-0 font-mono text-[11px] text-warning">
            ● 未保存
          </span>
        )}
        <button className="btn btn-xs btn-ghost shrink-0" onClick={p.onSaveCopy} title="将当前草稿另存为集合副本">
          另存为副本
        </button>
      </div>

      <div className="flex gap-2 border-b border-base-300 px-3 py-2">
        <select
          data-testid="method-select"
          className={`select select-bordered select-sm w-32 shrink-0 font-mono font-bold ${methodColor(p.draft.method)}`}
          value={p.draft.method}
          onChange={(e) => p.onChange({ method: e.target.value })}
        >
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          data-testid="url-input"
          className="input input-bordered input-sm min-w-0 flex-1 font-mono"
          placeholder="https://api.example.com/users?page=1 或 {{baseUrl}}/users"
          value={p.draft.url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <select
          className="select select-bordered select-sm w-24 shrink-0 font-mono"
          value={p.timeoutSec}
          onChange={(e) => p.onTimeoutChange(Number(e.target.value))}
          title="超时(秒)"
          aria-label="超时"
        >
          {TIMEOUTS.map((t) => (
            <option key={t} value={t}>
              {t}s
            </option>
          ))}
        </select>
        <button
          data-testid="send-btn"
          className="btn btn-sm btn-primary shrink-0"
          disabled={p.sending}
          onClick={p.onSend}
        >
          {p.sending ? '发送中…' : '发送'}
        </button>
      </div>

      {hint.undefinedVars.length > 0 ? (
        <div className="font-mono text-[11px] text-warning">
          未定义变量:{hint.undefinedVars.map((v) => <span key={v} className="badge badge-warning badge-outline badge-sm mr-1">{`{{${v}}}`}</span>)}
          <span className="ml-1 text-neutral">当前环境「{p.env?.name ?? '无'}」缺失,发送时按原样保留</span>
        </div>
      ) : hint.resolved !== p.draft.url ? (
        <div className="truncate font-mono text-[11px] text-neutral">→ {hint.resolved}</div>
      ) : null}

      <div className="flex items-center gap-3 border-b border-base-300 px-3">
        <button data-testid="request-tab-params" role="tab" aria-selected={tab === 'params'} className={tabClass(tab === 'params')} onClick={() => setTab('params')}>
          Params{qCount > 0 ? ` ${qCount}` : ''}
        </button>
        <button data-testid="request-tab-headers" role="tab" aria-selected={tab === 'headers'} className={tabClass(tab === 'headers')} onClick={() => setTab('headers')}>
          Headers{hCount > 0 ? ` ${hCount}` : ''}
        </button>
        <button data-testid="request-tab-body" role="tab" aria-selected={tab === 'body'} className={tabClass(tab === 'body')} onClick={() => setTab('body')}>
          {TAB_LABEL.body}
        </button>
        <button data-testid="request-tab-curl" role="tab" aria-selected={tab === 'curl'} className={tabClass(tab === 'curl')} onClick={() => setTab('curl')}>
          {TAB_LABEL.curl}
        </button>
      </div>

      <div role="tabpanel" className="min-h-0 flex-1 overflow-auto p-3">
        {tab === 'params' && (
          <div className="border border-base-300 bg-base-200/40 p-3">
            {/* query 参数编辑器(与 URL 文本双向同步,保留 {{var}}) */}
            <div className="mb-2 font-mono text-[11px] tracking-widest text-neutral">QUERY · 查询参数</div>
            {params.length === 0 && <div className="mb-2 font-mono text-[11px] text-neutral">无参数</div>}
            {params.map((row, i) => (
              <div key={row.id} className="mb-1 flex gap-1">
                <input
                  className="input input-bordered input-xs w-1/3 font-mono"
                  placeholder="key"
                  value={row.key}
                  onChange={(e) => editParam(i, { key: e.target.value })}
                />
                <input
                  className="input input-bordered input-xs flex-1 font-mono"
                  placeholder="value"
                  value={row.value}
                  onChange={(e) => editParam(i, { value: e.target.value })}
                />
                <button className="btn btn-xs btn-ghost text-error" title="删除参数" onClick={() => removeParam(i)}>
                  ✕
                </button>
              </div>
            ))}
            <div className="flex gap-1">
              <input
                className="input input-bordered input-xs w-1/3 font-mono"
                placeholder="新增 key"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
              />
              <input
                className="input input-bordered input-xs flex-1 font-mono"
                placeholder="value"
                value={newVal}
                onChange={(e) => setNewVal(e.target.value)}
              />
              <button className="btn btn-xs btn-ghost" onClick={addParam}>
                + 参数
              </button>
            </div>
          </div>
        )}

        {tab === 'headers' && (
          <div className="border border-base-300 bg-base-200/40 p-3">
            {/* headers KV 表 */}
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[11px] tracking-widest text-neutral">HEADERS · 请求头</span>
              <button
                className="btn btn-xs btn-ghost"
                onClick={() => p.onChange({ headers: [...p.draft.headers, newKv()] })}
              >
                + Header
              </button>
            </div>
            {p.draft.headers.length === 0 && <div className="mb-1 font-mono text-[11px] text-neutral">无请求头</div>}
            {p.draft.headers.map((h, i) => (
              <div key={h.id} className="mb-1 flex gap-1">
                <input
                  className="input input-bordered input-xs w-1/3 font-mono"
                  placeholder="Header-Name"
                  value={h.key}
                  onChange={(e) =>
                    p.onChange({ headers: p.draft.headers.map((x, idx) => (idx === i ? { ...x, key: e.target.value } : x)) })
                  }
                />
                <input
                  className="input input-bordered input-xs flex-1 font-mono"
                  placeholder="value(支持 {{var}})"
                  value={h.value}
                  onChange={(e) =>
                    p.onChange({ headers: p.draft.headers.map((x, idx) => (idx === i ? { ...x, value: e.target.value } : x)) })
                  }
                />
                <button
                  className="btn btn-xs btn-ghost text-error"
                  title="删除"
                  onClick={() => p.onChange({ headers: p.draft.headers.filter((_, idx) => idx !== i) })}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === 'body' && (
          <div className="flex h-full flex-col border border-base-300 bg-base-200/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[11px] tracking-widest text-neutral">BODY · 请求体</span>
              <button className="btn btn-xs btn-ghost" onClick={formatBody}>
                格式化 JSON
              </button>
            </div>
            {formatMsg && <div className="mb-1 font-mono text-[11px] text-error">{formatMsg}</div>}
            <textarea
              className="min-h-0 w-full flex-1 rounded border border-base-300 bg-base-100/60 p-3 font-mono text-[13px] leading-relaxed"
              placeholder='{"key":"value"}  支持 {{var}}'
              value={p.draft.body}
              onChange={(e) => p.onChange({ body: e.target.value })}
              onKeyDown={onKeyDown}
            />
          </div>
        )}

        {tab === 'curl' && (
          <div className="border border-base-300 bg-base-200/40 p-3">
            {/* cURL 导入 / 导出 */}
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[11px] tracking-widest text-neutral">cURL · 导入 / 导出</span>
              <button data-testid="curl-export-btn" className="btn btn-xs btn-ghost" onClick={p.onExportCurl}>
                导出 cURL
              </button>
            </div>
            <textarea
              data-testid="curl-import"
              className="h-20 w-full rounded border border-base-300 bg-base-100/60 p-3 font-mono text-[12px] leading-relaxed"
              placeholder="粘贴浏览器 Copy as cURL (bash / cmd)…"
              value={curlText}
              onChange={(e) => setCurlText(e.target.value)}
            />
            <div className="mt-2 flex gap-2">
              <button
                className="btn btn-xs btn-primary"
                onClick={() => {
                  p.onImportCurl(curlText)
                  setCurlText('')
                }}
              >
                解析导入
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

const TAB_LABEL: Record<'params' | 'headers' | 'body' | 'curl', string> = {
  params: 'Params',
  headers: 'Headers',
  body: 'Body',
  curl: 'cURL'
}

function tabClass(active: boolean): string {
  return `btn btn-xs btn-ghost font-mono ${
    active ? 'border-b-2 border-primary text-base-content' : 'text-neutral'
  }`
}

/** 外部 URL 回同步时,按「key 名 + 位置」复用旧行的 id,保持输入框 DOM 稳定 */
function reconcileParams(parsed: KV[], prev: KV[]): KV[] {
  return parsed.map((row, i) => {
    const old = prev[i]
    return old && old.key === row.key ? { ...row, id: old.id } : row
  })
}

function methodColor(m: string): string {
  switch (m) {
    case 'GET':
      return 'text-success'
    case 'POST':
      return 'text-warning'
    case 'PUT':
    case 'PATCH':
      return 'text-info'
    case 'DELETE':
      return 'text-error'
    default:
      return 'text-neutral'
  }
}
