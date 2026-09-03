import { useState } from 'react'
import { CopyButton } from '@components/CopyButton'
import { generatePassword } from '../transform'

const SET_LABEL: Record<string, string> = { lower: '小写', upper: '大写', digit: '数字', symbol: '符号' }

export function RandomPanel(): JSX.Element {
  const [len, setLen] = useState('16')
  const [sets, setSets] = useState({ lower: true, upper: true, digit: true, symbol: true })
  const [custom, setCustom] = useState('')
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false)
  const [count, setCount] = useState('1')
  const [out, setOut] = useState('')

  const gen = (): void => {
    const r = generatePassword({ length: Number(len), ...sets, customChars: custom || undefined, excludeAmbiguous, count: Number(count) || 1 })
    setOut(r.status === 'ok' ? (Array.isArray(r.data) ? r.data.join('\n') : r.data) : r.message)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-neutral">长度
          <input value={len} onChange={(e) => setLen(e.target.value.replace(/[^0-9]/g, ''))} className="input input-bordered input-sm w-20 font-mono" /></label>
        <label className="flex items-center gap-2 text-sm text-neutral">数量
          <input value={count} onChange={(e) => setCount(e.target.value.replace(/[^0-9]/g, ''))} className="input input-bordered input-sm w-16 font-mono" /></label>
        {Object.keys(sets).map((k) => (
          <label key={k} className="flex items-center gap-1 text-sm text-neutral">
            <input type="checkbox" checked={sets[k as keyof typeof sets]} onChange={(e) => setSets({ ...sets, [k]: e.target.checked })} />{SET_LABEL[k]}
          </label>
        ))}
        <label className="flex items-center gap-1 text-sm text-neutral">
          <input type="checkbox" checked={excludeAmbiguous} onChange={(e) => setExcludeAmbiguous(e.target.checked)} />排除易混(0/O/1/l/I)
        </label>
        <button className="btn btn-sm btn-primary ml-auto" onClick={gen}>生成</button>
      </div>
      <label className="flex items-center gap-2 text-sm text-neutral">自定义字符(可选)
        <input value={custom} onChange={(e) => setCustom(e.target.value)} className="input input-bordered input-sm flex-1 font-mono" /></label>
      {out && <div className="flex items-center gap-2"><pre className="flex-1 overflow-auto rounded bg-base-100 p-2 font-mono text-sm">{out}</pre><CopyButton getText={() => out} enabled={!!out} /></div>}
    </div>
  )
}
