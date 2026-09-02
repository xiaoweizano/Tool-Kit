import { useState } from 'react'
import { useLiveTransform } from '@core/useLiveTransform'
import { CopyButton } from '@components/CopyButton'
import { TriStateOutput } from '@components/TriStateOutput'
import { runTransform } from '@core/transform.channel'
import type { ToolResult } from '@core/types'
import type { StrengthReport, Level } from './types'

const LEVEL_UI = { weak: 'error', medium: 'warning', strong: 'success' } as const
const LEVEL_LABEL = { weak: '弱', medium: '中', strong: '强' } as const

export default function PasswordStrengthPage(): JSX.Element {
  const { input, setInput, phase, result } = useLiveTransform<string, StrengthReport>('password-strength')
  const [genOut, setGenOut] = useState('')
  const [target, setTarget] = useState<Level>('medium')

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">密码强度分析</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">SCORE · LEVEL · SUGGEST</span>
        <CopyButton getText={() => genOut} enabled={!!genOut} />
      </header>
      <section className="border border-base-300 bg-base-200/40 p-4">
        <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="粘贴密码,实时分析…" className="textarea textarea-bordered w-full font-mono" rows={3} />
      </section>
      <div className="mt-4">
        {result?.status === 'ok' ? (
          <div className="border border-base-300 bg-base-200/40 p-4">
            <div className={`badge badge-${LEVEL_UI[result.data.level]}`}>评分 {result.data.score} · {LEVEL_LABEL[result.data.level]} · 长度 {result.data.length}</div>
            <ul className="mt-2 list-disc pl-5 text-sm">
              {result.data.suggestions.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        ) : (
          <TriStateOutput
            result={(result?.status === 'error' ? result : null) as ToolResult<string> | null}
            phase={phase}
            emptyHint="粘贴密码查看强度评分与改进建议…"
          />
        )}
      </div>
      <section className="mt-6 border border-base-300 bg-base-200/40 p-4">
        <div className="flex items-center gap-3">
          <label className="text-sm text-neutral">目标强度
            <select className="select select-bordered select-sm ml-1" value={target} onChange={(e) => setTarget(e.target.value as Level)}>
              <option value="weak">弱</option><option value="medium">中</option><option value="strong">强</option>
            </select>
          </label>
          <button className="btn btn-sm btn-primary" disabled={!input} onClick={async () => { const r = await runTransform('password-strength', input, { action: 'generate', targetLevel: target }); if (r.status === 'ok') setGenOut(r.data as string) }}>生成</button>
        </div>
        {genOut && <pre className="mt-2 overflow-auto rounded bg-base-100 p-2 font-mono text-sm">{genOut}</pre>}
      </section>
    </div>
  )
}

export { PasswordStrengthPage }
