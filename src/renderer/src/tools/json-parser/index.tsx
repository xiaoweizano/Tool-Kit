import { useLiveTransform } from '@core/useLiveTransform'
import { CopyButton } from '@components/CopyButton'
import { InputZone } from '@components/InputZone'
import { TriStateOutput } from '@components/TriStateOutput'
import { posToLineCol } from './transform'

export default function JsonParserPage(): JSX.Element {
  const { input, setInput, opts, setOpts, phase, result } = useLiveTransform<string, string>('json-parser')

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">JSON 解析</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">PARSE · VALIDATE · FORMAT</span>
        <span className="ml-auto font-mono text-[11px] text-neutral" data-testid="phase-badge">
          {phase === 'done' && result?.status === 'ok' && <span className="text-success">● VALID</span>}
          {phase === 'done' && result?.status === 'error' && <span className="text-error">✕ ERROR</span>}
          {phase === 'running' && <span className="text-warning">◐ …</span>}
        </span>
        <CopyButton
          getText={() => (result?.status === 'ok' ? result.data : '')}
          enabled={phase === 'done' && result?.status === 'ok'}
        />
      </header>

      <section className="border border-base-300 bg-base-200/40">
        <span className="ml-3 -mt-2 inline-block bg-base-100 px-1 font-mono text-[11px] tracking-widest text-neutral">INPUT · 输入</span>
        <InputZone value={input} onChange={setInput} placeholder="粘贴 JSON 到此处,结果即刻点亮…" />
      </section>

      <div className="flex items-center gap-2 py-3" role="toolbar">
        <span className={`h-0.5 flex-1 ${phase === 'running' ? 'bg-warning animate-pulse' : result?.status === 'ok' ? 'bg-success' : result?.status === 'error' ? 'bg-error' : 'bg-base-300'}`} />
        {(['2', '4', 'tab', 'min'] as const).map((ind) => (
          <button key={ind}
            className={`btn btn-xs font-mono ${(opts.indent ?? '2') === ind ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setOpts({ indent: ind })}>
            {ind === 'min' ? '压缩' : ind === 'tab' ? 'TAB' : ind}
          </button>
        ))}
        <span className="h-0.5 flex-1 bg-base-300" />
      </div>

      <TriStateOutput result={result} phase={phase} emptyHint="粘贴内容到上方,结果即刻点亮" />
      {result?.status === 'error' && 'position' in result && typeof result.position === 'number' && (
        <p className="mt-1 font-mono text-[11px] text-neutral">
          定位:第 {posToLineCol(input, result.position).line} 行 第 {posToLineCol(input, result.position).col} 列
        </p>
      )}
    </div>
  )
}

export { JsonParserPage }
