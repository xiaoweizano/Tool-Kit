import { useState } from 'react'
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
}

export function RequestPanel(p: Props): JSX.Element {
  const [curlText, setCurlText] = useState('')
  const [formatMsg, setFormatMsg] = useState('')

  const { base, params } = parseQuery(p.draft.url)
  const [newKey, setNewKey] = useState('')
  const [newVal, setNewVal] = useState('')

  const setUrl = (url: string): void => p.onChange({ url })

  const editParam = (i: number, patch: Partial<KV>): void => {
    const rows = params.map((row, idx) => (idx === i ? { ...row, ...patch } : row))
    setUrl(serializeQuery(base, rows))
  }
  const removeParam = (i: number): void => {
    setUrl(serializeQuery(base, params.filter((_, idx) => idx !== i)))
  }
  const addParam = (): void => {
    if (!newKey.trim()) return
    setUrl(serializeQuery(base, [...params, newKv(newKey, newVal)]))
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

  // URL 栏实时 {{var}} 解析提示
  const hint = resolveVars(p.draft.url, p.env?.vars ?? {})

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          className="input input-bordered input-sm min-w-0 flex-1 font-mono"
          placeholder="请求名称"
          value={p.name}
          onChange={(e) => p.onNameChange(e.target.value)}
          aria-label="请求名称"
        />
        <button className="btn btn-sm btn-ghost" onClick={p.onSaveCopy} title="将当前草稿另存为集合副本">
          另存为副本
        </button>
      </div>

      <div className="flex gap-2">
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

      {/* query 参数编辑器(与 URL 文本双向同步,保留 {{var}}) */}
      <div className="border border-base-300 bg-base-200/40 p-3">
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

      {/* headers KV 表 */}
      <div className="border border-base-300 bg-base-200/40 p-3">
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

      {/* body 编辑器 + JSON 格式化 */}
      <div className="border border-base-300 bg-base-200/40 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[11px] tracking-widest text-neutral">BODY · 请求体</span>
          <button className="btn btn-xs btn-ghost" onClick={formatBody}>
            格式化 JSON
          </button>
        </div>
        <textarea
          className="h-32 w-full rounded border border-base-300 bg-base-100/60 p-3 font-mono text-[13px] leading-relaxed"
          placeholder='{"key":"value"}  支持 {{var}}'
          value={p.draft.body}
          onChange={(e) => p.onChange({ body: e.target.value })}
          onKeyDown={onKeyDown}
        />
        {formatMsg && <div className="mt-1 font-mono text-[11px] text-error">{formatMsg}</div>}
      </div>

      {/* cURL 导入 / 导出 */}
      <div className="border border-base-300 bg-base-200/40 p-3">
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
    </section>
  )
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
