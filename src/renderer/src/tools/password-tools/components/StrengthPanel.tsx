// src/renderer/src/tools/password-tools/components/StrengthPanel.tsx
import { useLiveTransform } from '@core/useLiveTransform'
import { StrengthBar } from '@components/StrengthBar'
import { CharsetChecklist } from '@components/CharsetChecklist'
import { TriStateOutput } from '@components/TriStateOutput'
import type { ToolResult } from '@core/types'
import type { StrengthReport } from '@tools/password-strength/types'

const LEVEL_LABEL = { weak: '弱', medium: '中', strong: '强' } as const
const CHARSET_ITEMS = (c: StrengthReport['charsets']) => [
  { label: '小写', hit: c.lower },
  { label: '大写', hit: c.upper },
  { label: '数字', hit: c.digit },
  { label: '符号', hit: c.symbol },
]

export function StrengthPanel(): JSX.Element {
  const { input, setInput, phase, result } = useLiveTransform<string, StrengthReport>('password-tools')
  return (
    <div className="space-y-3">
      <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="粘贴密码,实时分析…" className="textarea textarea-bordered w-full font-mono" rows={3} />
      {result?.status === 'ok' ? (
        <div className="space-y-3 border border-base-300 bg-base-100 p-4">
          <div className="flex items-center gap-3">
            <span className="badge badge-primary">等级:{LEVEL_LABEL[result.data.level]}</span>
            <span className="font-mono text-xs text-neutral">长度 {result.data.length}</span>
          </div>
          <StrengthBar score={result.data.score} level={result.data.level} />
          <div>
            <div className="font-mono text-[11px] tracking-widest text-neutral">字符集</div>
            <CharsetChecklist items={CHARSET_ITEMS(result.data.charsets)} />
          </div>
          <div className="rounded border border-base-300 bg-base-200/50 p-3">
            <div className="font-mono text-[11px] tracking-widest text-neutral">建议</div>
            <ul className="mt-1 list-disc pl-5 text-sm">
              {result.data.suggestions.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        </div>
      ) : (
        <TriStateOutput result={(result?.status === 'error' ? result : null) as ToolResult<string> | null} phase={phase} emptyHint="粘贴密码查看字符集/评分/建议…" />
      )}
    </div>
  )
}
