import { useLiveTransform } from '@core/useLiveTransform'
import { CopyButton } from '@components/CopyButton'
import { InputZone } from '@components/InputZone'
import { TriStateOutput } from '@components/TriStateOutput'

const FMT_PRESETS = [
  'yyyy-MM-dd', 'yyyy/MM/dd', 'yyyyMMdd', 'yyyy-MM-dd HH:mm:ss', 'yyyyMMddHHmmss',
  'yyyy-MM-dd HH:mm', 'HH:mm:ss', 'yyyy年MM月dd日', 'dd/MM/yyyy', 'MM/dd/yyyy'
]

export default function DateConverterPage(): JSX.Element {
  const { input, setInput, opts, setOpts, phase, result } = useLiveTransform<string, string>('date-converter')
  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">时间戳互转</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">TIMESTAMP · DATE CONVERT</span>
        <CopyButton getText={() => (result?.status === 'ok' ? result.data : '')} enabled={phase === 'done' && result?.status === 'ok'} />
      </header>
      <section className="border border-base-300 bg-base-200/40">
        <span className="ml-3 -mt-2 inline-block bg-base-100 px-1 font-mono text-[11px] tracking-widest text-neutral">INPUT · 时间戳或日期</span>
        <InputZone value={input} onChange={setInput} placeholder="粘贴 unix 秒/毫秒/微秒或日期串,自动识别并互转…" />
      </section>
      <div className="py-3" role="toolbar">
        <div className="flex flex-wrap items-center gap-2">
          <span className="shrink-0 font-mono text-[11px] tracking-[0.25em] text-neutral">FMT · 自定义格式</span>
          <input
            className="input input-bordered input-sm min-w-0 flex-1 font-mono text-[13px]"
            placeholder="输入任意格式,如 yyyy-MM-dd HH:mm:ss(留空仅默认视图)"
            value={(opts.format as string) ?? ''}
            onChange={(e) => setOpts({ format: e.target.value })}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {FMT_PRESETS.map((f) => (
            <button key={f}
              className={`btn btn-xs font-mono ${(opts.format as string) === f ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setOpts({ format: f })}>
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4">
        <TriStateOutput result={result} phase={phase} emptyHint="粘贴时间戳或日期串,立即得到四视图;填写格式后可按 yyyyMMdd 等自定义互转…" />
      </div>
    </div>
  )
}

export { DateConverterPage }
