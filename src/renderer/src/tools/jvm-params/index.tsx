import { useState } from 'react'
import { CopyButton } from '@components/CopyButton'
import { generateJvmParams } from './transform'
import type { GcStrategy } from './types'

type GcValue = GcStrategy | ''

interface FormState {
  xms: string
  xmx: string
  xmn: string
  metaspace: string
  gc: GcValue
  heapDump: boolean
  heapDumpPath: string
  remoteDebugPort: string
  printGc: boolean
  jmxPort: string
  flightRecorder: boolean
  container: boolean
  extra: string
}

const GC_OPTIONS: { value: GcValue; label: string }[] = [
  { value: '', label: '无' },
  { value: 'g1', label: 'G1' },
  { value: 'zgc', label: 'ZGC' },
  { value: 'shenandoah', label: 'Shenandoah' }
]

export default function JvmParamsPage(): JSX.Element {
  const [f, setF] = useState<FormState>({
    xms: '', xmx: '', xmn: '', metaspace: '', gc: '', heapDump: false, heapDumpPath: '',
    remoteDebugPort: '', printGc: false, jmxPort: '', flightRecorder: false, container: false, extra: ''
  })
  const [out, setOut] = useState('')
  const [err, setErr] = useState('')
  const [genned, setGenned] = useState(false)

  const set = (patch: Partial<FormState>): void => setF({ ...f, ...patch })

  const gen = (): void => {
    setGenned(true)
    const r = generateJvmParams({
      xms: f.xms || undefined,
      xmx: f.xmx || undefined,
      xmn: f.xmn || undefined,
      metaspace: f.metaspace || undefined,
      gc: f.gc || undefined,
      heapDump: f.heapDump,
      heapDumpPath: f.heapDumpPath || undefined,
      remoteDebugPort: f.remoteDebugPort || undefined,
      printGc: f.printGc,
      jmxPort: f.jmxPort || undefined,
      flightRecorder: f.flightRecorder,
      container: f.container,
      extra: f.extra.split('\n')
    })
    if (r.status === 'ok') { setOut(r.data); setErr('') } else { setErr(r.message); setOut('') }
  }

  const field = (label: string, key: keyof FormState): JSX.Element => (
    <label className="flex items-center gap-2 text-sm">{label}<input className="input input-bordered input-sm w-32 font-mono" value={String(f[key])} onChange={(e) => set({ [key]: e.target.value } as Partial<FormState>)} /></label>
  )

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">JVM 参数生成</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">HEAP · GC · DEBUG · MONITOR</span>
      </header>
      <section className="border border-base-300 bg-base-200/40 p-4 space-y-2">
        <div className="flex flex-wrap gap-3">{field('Xms', 'xms')}{field('Xmx', 'xmx')}{field('Xmn', 'xmn')}{field('Metaspace', 'metaspace')}</div>
        <label className="flex items-center gap-2 text-sm">GC<select className="select select-bordered select-sm" value={f.gc} onChange={(e) => set({ gc: e.target.value as GcValue })}>
          {GC_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select></label>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.heapDump} onChange={(e) => set({ heapDump: e.target.checked })} />OOM 堆转储</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.printGc} onChange={(e) => set({ printGc: e.target.checked })} />打印 GC</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.flightRecorder} onChange={(e) => set({ flightRecorder: e.target.checked })} />JFR</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.container} onChange={(e) => set({ container: e.target.checked })} />容器感知</label>
        </div>
        <div className="flex flex-wrap gap-3">{field('HeapDumpPath', 'heapDumpPath')}{field('远程调试端口', 'remoteDebugPort')}{field('JMX 端口', 'jmxPort')}</div>
        <textarea value={f.extra} onChange={(e) => set({ extra: e.target.value })} placeholder="自定义参数(每行一个,如 -Dspring.profiles.active=prod)" className="textarea textarea-bordered textarea-sm w-full font-mono" rows={2} />
        <button className="btn btn-sm btn-primary" onClick={gen}>生成</button>
      </section>
      <div className="mt-4">
        {err ? <div className="text-error text-sm">{err}</div>
          : out ? <div className="flex items-start gap-2"><pre className="flex-1 overflow-auto rounded bg-base-100 p-2 font-mono text-sm">{out}</pre><CopyButton getText={() => out} enabled /></div>
          : genned ? <p className="text-sm text-neutral">请选择至少一个参数后再生成</p>
          : null}
      </div>
    </div>
  )
}
