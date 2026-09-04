// src/renderer/src/tools/password-tools/components/StrengthPanel.tsx
import { useLiveTransform } from '@core/useLiveTransform'
import { StrengthBar } from '@components/StrengthBar'
import { TriStateOutput } from '@components/TriStateOutput'
import type { ToolResult } from '@core/types'
import type { StrengthReport } from '@tools/password-strength/types'

const LEVEL_LABEL = { weak: '弱', medium: '中', strong: '强' } as const
const LEVEL_BADGE = { weak: 'badge-error', medium: 'badge-warning', strong: 'badge-success' } as const

const CheckIcon = (): JSX.Element => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
)
const CrossStatus = (): JSX.Element => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
)

const CHARSET_ITEMS: { key: keyof StrengthReport['charsets']; label: string }[] = [
  { key: 'lower', label: '小写' },
  { key: 'upper', label: '大写' },
  { key: 'digit', label: '数字' },
  { key: 'symbol', label: '特殊字符' },
]

function CheckRow({ passed, label }: { passed: boolean; label: string }): JSX.Element {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5">
      <span className={`shrink-0 ${passed ? 'text-success' : 'text-warning'}`}>{passed ? <CheckIcon /> : <CrossStatus />}</span>
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function StrengthPanel(): JSX.Element {
  const { input, setInput, phase, result } = useLiveTransform<string, StrengthReport>('password-tools')
  return (
    <div className="space-y-3">
      <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="粘贴密码,实时分析…" className="textarea textarea-bordered w-full font-mono" rows={3} />
      {result?.status === 'ok' ? (
        <div className="space-y-3 border border-base-300 bg-base-100 p-4">
          <div className="flex items-center gap-3">
            <span className={`badge ${LEVEL_BADGE[result.data.level]}`}>等级 · {LEVEL_LABEL[result.data.level]}</span>
            <span className="ml-auto font-mono text-xs text-neutral">长度 {result.data.length}</span>
          </div>
          <StrengthBar score={result.data.score} level={result.data.level} />
          <div className="rounded border border-base-300">
            <div className="flex flex-wrap items-center gap-2 border-b border-base-300 px-3 py-2">
              <span className="font-mono text-[11px] tracking-widest text-neutral">安全检查</span>
              <span className="ml-auto flex flex-wrap gap-1.5">
                {CHARSET_ITEMS.map((it) => (
                  <span key={it.key} className={`badge badge-xs font-mono text-[11px] ${result.data.charsets[it.key] ? 'badge-success badge-outline' : 'badge-ghost'}`}>{it.label}</span>
                ))}
              </span>
            </div>
            <div className="py-1">
              {result.data.checks.map((c) => <CheckRow key={c.id} passed={c.passed} label={c.label} />)}
            </div>
          </div>
          <div className="rounded border border-base-300 bg-base-200/50 p-3">
            <div className="font-mono text-[11px] tracking-widest text-neutral">改进建议</div>
            <ul className="mt-1.5 space-y-1.5 text-sm">
              {result.data.suggestions.map((s, i) => <li key={i} className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-base-content/40" />{s}</li>)}
            </ul>
          </div>
        </div>
      ) : (
        <TriStateOutput result={(result?.status === 'error' ? result : null) as ToolResult<string> | null} phase={phase} emptyHint="粘贴密码查看字符集/评分/建议…" />
      )}
    </div>
  )
}
