import { useRef, useState } from 'react'
import { TriStateOutput } from '@components/TriStateOutput'
import { analyzeLog, splitContextLines } from './transform'
import type { LogAnalysisResult } from './types'

const ID_FIELDS: { key: 'traceIds' | 'requestIds' | 'ips'; label: string }[] = [
  { key: 'traceIds', label: 'TraceId' },
  { key: 'requestIds', label: 'RequestId' },
  { key: 'ips', label: 'IP' }
]

export default function LogAnalyzerPage(): JSX.Element {
  const [raw, setRaw] = useState('')
  const [res, setRes] = useState<LogAnalysisResult | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [ctx, setCtx] = useState<string[] | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const runAnalyze = async (text: string): Promise<void> => {
    setBusy(true)
    setErr(null)
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    const r = analyzeLog(text)
    setBusy(false)
    if (r.status === 'ok') { setRes(r.data); setCtx(null) } else { setRes(null); setErr(r.message) }
  }

  const onFile = (f: File): void => {
    const reader = new FileReader()
    reader.onload = () => { const t = String(reader.result ?? ''); setRaw(t); void runAnalyze(t) }
    reader.readAsText(f)
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">日志分析</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">LEVEL · TIMELINE · CLUSTER · TRACE · IP</span>
      </header>
      <section className="border border-base-300 bg-base-200/40 p-4">
        <div className="flex items-center gap-3">
          <button className="btn btn-sm btn-outline" onClick={() => fileRef.current?.click()}>选择日志文件</button>
          <input ref={fileRef} type="file" accept=".log,.txt,.out" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
          <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => void runAnalyze(raw)}>{busy ? '分析中…' : '分析'}</button>
        </div>
        <textarea value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="粘贴日志文本,或上传 .log 文件…" className="textarea textarea-bordered mt-3 w-full font-mono" rows={10} />
      </section>
      <div className="mt-4">
        {err && <TriStateOutput result={{ status: 'error', kind: 'invalid-input', message: err }} phase="done" emptyHint="" />}
        {res && <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">共 {res.totalLines} 行</span>
          </div>
          <StatsPanel res={res} raw={raw} onContext={(lines) => setCtx(lines)} />
        </div>}
        {!res && !err && <TriStateOutput result={null} phase="idle" emptyHint="上传或粘贴日志,自动分析…" />}
        {ctx && <ContextPanel lines={ctx} onClose={() => setCtx(null)} />}
      </div>
    </div>
  )
}

function StatsPanel({ res, raw, onContext }: { res: LogAnalysisResult; raw: string; onContext: (lines: string[]) => void }): JSX.Element {
  const maxTimeline = Math.max(1, ...res.timeline.map((t) => t.count))
  const barColor = (error: number | undefined, count: number): string => {
    if (!error || count === 0) return 'bg-success/60'
    const ratio = error / count
    if (ratio >= 0.3) return 'bg-error'
    if (ratio > 0) return 'bg-warning'
    return 'bg-success/60'
  }
  return (
    <div className="space-y-3">
      <div className="card border border-base-300 bg-base-100"><div className="card-body p-3"><div className="card-title text-sm">级别统计</div>
        <div className="flex flex-wrap gap-2">{res.levelStats.map((l) => (
          <span key={l.level} className={`badge ${l.level === 'ERROR' ? 'badge-error' : l.level === 'WARN' ? 'badge-warning' : 'badge-info'} ${l.isHigh ? ' badge-error' : ''}`}>
            {l.level}:{l.count} 条({l.pct}%){l.isHigh ? ' 高' : ''}
          </span>
        ))}</div>
      </div></div>
      <div className="card border border-base-300 bg-base-100"><div className="card-body p-3"><div className="card-title text-sm">时间线</div>
        {res.timeline.length === 0 ? <p className="text-sm text-neutral">无时间戳,已跳过</p> : (
          <div className="space-y-1">{res.timeline.map((t) => (
            <div key={t.ts} className="flex items-center gap-2 text-sm font-mono">
              <span className="text-neutral">{t.ts}</span>
              <span className={`inline-block h-2 rounded ${barColor(t.error, t.count)}`} style={{ width: `${Math.min(100, (t.count / maxTimeline) * 100)}%` }} />
              <span>{t.count} 条{t.error ? `(错误 ${t.error})` : ''}</span>
            </div>
          ))}</div>
        )}
      </div></div>
      <div className="card border border-base-300 bg-base-100"><div className="card-body p-3"><div className="card-title text-sm">异常聚类</div>
        {res.exceptions.length === 0 ? <p className="text-sm text-neutral">无</p> : res.exceptions.map((e) => (
          <button key={e.stackHash} className="block w-full text-left text-sm hover:bg-base-200" onClick={() => onContext(splitContextLines(raw, e.sampleLine, 3))}><code>{e.type}</code>×{e.count} <span className="text-neutral">{e.message}</span></button>
        ))}
      </div></div>
      <div className="card border border-base-300 bg-base-100"><div className="card-body p-3"><div className="card-title text-sm">TraceId / RequestId / IP</div>
        <div className="grid gap-2 sm:grid-cols-3">{ID_FIELDS.map((f) => (
          <div key={f.key}><div className="text-xs text-neutral">{f.label}</div>
            {res[f.key].length === 0 ? <div className="text-sm text-neutral">无</div> : res[f.key].map((h) => <div key={h.id} className="text-sm font-mono">{h.id} <span className="text-neutral">×{h.lineCount}</span></div>)}
          </div>
        ))}</div>
      </div></div>
      <div className="card border border-base-300 bg-base-100"><div className="card-body p-3"><div className="card-title text-sm">接口异常聚合</div>
        {res.endpoints.length === 0 ? <p className="text-sm text-neutral">无</p> : res.endpoints.map((e) => (
          <div key={e.path} className="text-sm"><code>{e.path}</code>{e.errors.map((er) => <span key={er.type} className="badge badge-error ml-2">{er.type}:{er.count}</span>)}</div>
        ))}
      </div></div>
    </div>
  )
}

function ContextPanel({ lines, onClose }: { lines: string[]; onClose: () => void }): JSX.Element {
  return <div className="card border border-base-300 bg-base-100"><div className="card-body p-3"><div className="flex items-center justify-between"><div className="card-title text-sm">上下文</div><button className="btn btn-xs" onClick={onClose}>关闭</button></div><pre className="overflow-auto bg-base-200 p-2 font-mono text-xs">{lines.join('\n')}</pre></div></div>
}
