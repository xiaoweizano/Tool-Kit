import { useState } from 'react'
import { CopyButton } from '@components/CopyButton'
import { generateJvmParams, JVM_PRESETS } from './transform'
import type { GcStrategy, JvmOptions } from './types'

type GcValue = GcStrategy | ''
const GC_OPTIONS: { value: GcValue; label: string }[] = [{ value: '', label: '无' }, { value: 'g1', label: 'G1' }, { value: 'zgc', label: 'ZGC' }, { value: 'shenandoah', label: 'Shenandoah' }]

export default function JvmParamsPage(): JSX.Element {
  const [f, setF] = useState<JvmOptions>({ extra: [] })
  const [extraStr, setExtraStr] = useState('')
  const [out, setOut] = useState('')

  const set = (patch: Partial<JvmOptions>): void => setF({ ...f, ...patch })
  const applyPreset = (id: string): void => {
    const p = JVM_PRESETS.find((x) => x.id === id)
    if (p) setF({ ...f, ...p.options })
  }
  const num = (label: string, key: keyof JvmOptions): JSX.Element => (
    <label className="flex items-center gap-2 text-sm">{label}
      <input className="input input-bordered input-sm w-24 font-mono" value={String(f[key] ?? '')} onChange={(e) => set({ [key]: e.target.value } as Partial<JvmOptions>)} placeholder="512m" /></label>
  )
  const box = (label: string, key: keyof JvmOptions): JSX.Element => (
    <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={!!f[key]} onChange={(e) => set({ [key]: e.target.checked } as Partial<JvmOptions>)} />{label}</label>
  )
  const gen = (): void => {
    const r = generateJvmParams({ ...f, extra: extraStr.split('\n').filter(Boolean) })
    if (r.status === 'ok') setOut(r.data)
  }
  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">JVM 参数生成</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">HEAP · GC · DEBUG · MONITOR</span>
      </header>
      <section className="space-y-3 border border-base-300 bg-base-200/40 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-neutral">场景预设:</span>
          {JVM_PRESETS.map((p) => <button key={p.id} className="btn btn-sm btn-ghost" onClick={() => applyPreset(p.id)}>{p.label}</button>)}
        </div>
        <div className="flex flex-wrap gap-3">{num('Xms', 'xms')}{num('Xmx', 'xmx')}{num('Xmn', 'xmn')}{num('Xss', 'xss')}{num('Metaspace', 'metaspace')}{num('MaxMetaspace', 'maxMetaspace')}{num('MaxDirectMemory', 'maxDirectMemory')}</div>
        <label className="flex items-center gap-2 text-sm">GC<select className="select select-bordered select-sm" value={f.gc ?? ''} onChange={(e) => set({ gc: (e.target.value || undefined) as GcStrategy | undefined })}>{GC_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
        <div className="flex flex-wrap gap-3">
          {box('服务器模式 -server', 'server')}
          {box('OOM 堆转储', 'heapDump')}
          {box('打印 GC', 'printGc')}
          {box('统一 GC 日志', 'gcLog')}
          {box('JFR', 'flightRecorder')}
          {box('容器感知', 'container')}
          {box('OOM 退出', 'oomExit')}
          {box('压缩指针', 'compressedOops')}
          {box('UTF-8 编码', 'encoding')}
        </div>
        <div className="flex flex-wrap gap-3">{num('HeapDumpPath', 'heapDumpPath')}{num('远程调试端口', 'remoteDebugPort')}{num('JMX 端口', 'jmxPort')}</div>
        <textarea value={extraStr} onChange={(e) => setExtraStr(e.target.value)} placeholder="自定义参数(每行一个,如 -Dspring.profiles.active=prod)" className="textarea textarea-bordered textarea-sm w-full font-mono" rows={2} />
        <button className="btn btn-sm btn-primary" onClick={gen}>生成</button>
      </section>
      <div className="mt-4">
        {out ? <div className="flex items-start gap-2"><pre className="flex-1 overflow-auto rounded bg-base-100 p-2 font-mono text-sm">{out}</pre><CopyButton getText={() => out} enabled /></div> : <p className="text-sm text-neutral">选择参数后生成…</p>}
      </div>
    </div>
  )
}
