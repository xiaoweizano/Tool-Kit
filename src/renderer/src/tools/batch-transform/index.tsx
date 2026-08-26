import { useState } from 'react'
import { useMultiFieldTransform } from '@core/useMultiFieldTransform'
import { CopyButton } from '@components/CopyButton'
import { TriStateOutput } from '@components/TriStateOutput'
import { type Operation, type OperationId } from './transform'

interface BtInput { raw: string; opsJson: string; format: string; customSep: string }

// raw 缺键(先点操作/格式后输入文本)时按空输入处理,避免 undefined.trim 崩溃
const isEmpty = (i: BtInput): boolean => !(i.raw ?? '').trim()

const OP_CATALOG: { id: OperationId; label: string; params?: { key: string; label: string; placeholder?: string }[] }[] = [
  { id: 'wrap-squote', label: '单引号包裹' }, { id: 'wrap-dquote', label: '双引号包裹' },
  { id: 'wrap-backtick', label: '反引号包裹' }, { id: 'wrap-paren', label: '圆括号包裹' },
  { id: 'wrap-bracket', label: '方括号包裹' },
  { id: 'affix', label: '前后缀', params: [{ key: 'prefix', label: '前缀' }, { key: 'suffix', label: '后缀' }] },
  { id: 'strip-special', label: '去特殊字符', params: [{ key: 'keep', label: '额外保留', placeholder: '如 #._' }] },
  { id: 'truncate', label: '截取长度', params: [{ key: 'len', label: '长度' }, { key: 'from', label: '方向', placeholder: '前(默认)/end' }] },
  { id: 'trim', label: 'trim 去首尾空白' }, { id: 'drop-empty', label: '去空行/空值' },
  { id: 'dedupe', label: '去重' }, { id: 'sort-dict', label: '排序(字典)' }, { id: 'sort-num', label: '排序(数字)' },
  { id: 'upper', label: '全大写' }, { id: 'lower', label: '全小写' }, { id: 'width-normalize', label: '全角转半角' },
  { id: 'numbering', label: '加编号', params: [{ key: 'sep', label: '分隔', placeholder: '. (默认)/、' }] },
  { id: 'url-encode', label: 'URL 编码' }, { id: 'b64-encode', label: 'Base64 编码' }, { id: 'b64-decode', label: 'Base64 解码' }
]

const FORMATS: { id: string; label: string }[] = [
  { id: 'comma', label: '逗号拼接' }, { id: 'json', label: 'JSON 数组' }, { id: 'sql-in', label: 'SQL IN' },
  { id: 'newline', label: '换行' }, { id: 'custom', label: '自定义分隔' }
]

export default function BatchTransformPage(): JSX.Element {
  const [ops, setOps] = useState<Operation[]>([])
  const [format, setFormat] = useState('comma')
  const [customSep, setCustomSep] = useState('')
  const { setField, phase, result } = useMultiFieldTransform<BtInput, string>('batch-transform', isEmpty)

  // setField 是 patch 合并:sync 不带 raw 键(带 undefined 键会覆盖掉已输入文本)
  const sync = (nextOps: Operation[], nextFormat = format, nextSep = customSep): void => {
    setField({ opsJson: JSON.stringify(nextOps), format: nextFormat, customSep: nextSep })
  }
  // raw 单独同步:合并进上一字段(opsJson 等已在 hook input 中)
  const onRaw = (v: string): void => { setField({ raw: v }) }
  const addOp = (id: OperationId): void => { const next = [...ops, { id }]; setOps(next); sync(next) }
  const removeOp = (i: number): void => { const next = ops.filter((_, j) => j !== i); setOps(next); sync(next) }
  const moveOp = (i: number, dir: -1 | 1): void => {
    const j = i + dir
    if (j < 0 || j >= ops.length) return
    const next = [...ops]; [next[i], next[j]] = [next[j], next[i]]
    setOps(next); sync(next)
  }
  const setParam = (i: number, key: string, v: string): void => {
    const next = ops.map((op, j) => (j === i ? { ...op, params: { ...(op.params ?? {}), [key]: v } } : op))
    setOps(next); sync(next)
  }
  const onFormat = (f: string): void => { setFormat(f); sync(ops, f) }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">批处理值转换</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">BATCH · VALUES PIPELINE</span>
        <CopyButton getText={() => (result?.status === 'ok' ? result.data : '')} enabled={phase === 'done' && result?.status === 'ok'} />
      </header>
      <section className="border border-base-300 bg-base-200/40">
        <span className="ml-3 -mt-2 inline-block bg-base-100 px-1 font-mono text-[11px] tracking-widest text-neutral">INPUT · 一批值(每行一个或逗号分隔)</span>
        <textarea className="h-36 w-full resize-none border-0 bg-transparent p-4 font-mono text-[13px] leading-relaxed outline-none"
          placeholder="粘贴一批值(如 id 列表),添加操作并按序处理…" onChange={(e) => onRaw(e.target.value)} />
      </section>
      <section className="mt-3 border border-base-300 bg-base-200/40">
        <span className="ml-3 -mt-2 inline-block bg-base-100 px-1 font-mono text-[11px] tracking-widest text-neutral">OPS · 处理管线(顺序即应用顺序)</span>
        <div className="p-4">
          <select className="select select-bordered select-sm font-mono" value="" onChange={(e) => { if (e.target.value) addOp(e.target.value as OperationId); e.target.value = '' }}>
            <option value="">+ 添加操作…</option>
            {OP_CATALOG.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          {ops.length > 0 && (
            <ul className="mt-3 space-y-2">
              {ops.map((op, i) => {
                const cat = OP_CATALOG.find((c) => c.id === op.id)!
                return (
                  <li key={i} className="flex flex-wrap items-center gap-2 border border-base-300 bg-base-100/60 px-3 py-2">
                    <span className="font-mono text-[11px] text-neutral">{i + 1}</span>
                    <span className="text-sm">{cat.label}</span>
                    {cat.params?.map((pm) => (
                      <input key={pm.key} className="input input-bordered input-xs w-28 font-mono" placeholder={pm.placeholder ?? pm.label}
                        value={String(op.params?.[pm.key] ?? '')} onChange={(e) => setParam(i, pm.key, e.target.value)} />
                    ))}
                    <span className="ml-auto flex gap-1">
                      <button className="btn btn-ghost btn-xs" onClick={() => moveOp(i, -1)}>↑</button>
                      <button className="btn btn-ghost btn-xs" onClick={() => moveOp(i, 1)}>↓</button>
                      <button className="btn btn-ghost btn-xs text-error" onClick={() => removeOp(i)}>✕</button>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>
      <div className="flex flex-wrap items-center gap-2 py-3" role="toolbar">
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">OUTPUT · 格式</span>
        {FORMATS.map((f) => (
          <button key={f.id} className={`btn btn-xs font-mono ${format === f.id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onFormat(f.id)}>{f.label}</button>
        ))}
        {format === 'custom' && (
          <input className="input input-bordered input-xs w-24 font-mono" placeholder="分隔符" value={customSep}
            onChange={(e) => { setCustomSep(e.target.value); sync(ops, format, e.target.value) }} />
        )}
      </div>
      <TriStateOutput result={result} phase={phase} emptyHint="粘贴一批值,添加操作(可多个、可排序),选择输出格式…" />
    </div>
  )
}

export { BatchTransformPage }
