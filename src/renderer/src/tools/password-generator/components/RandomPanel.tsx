import { useState } from 'react'
import { CopyButton } from '@components/CopyButton'
import { generatePassword } from '../transform'

export function RandomPanel(): JSX.Element {
  const [len, setLen] = useState('16')
  const [sets, setSets] = useState<{ lower: boolean; upper: boolean; digit: boolean; symbol: boolean }>({ lower: true, upper: true, digit: true, symbol: true })
  const [out, setOut] = useState('')
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-neutral">长度
          <input value={len} onChange={(e) => setLen(e.target.value.replace(/[^0-9]/g, ''))} className="input input-bordered input-sm w-20 font-mono" /></label>
        {(['lower', 'upper', 'digit', 'symbol'] as const).map((k) => (
          <label key={k} className="flex items-center gap-1 text-sm text-neutral">
            <input type="checkbox" checked={sets[k]} onChange={(e) => setSets({ ...sets, [k]: e.target.checked })} />{k === 'lower' ? '小写' : k === 'upper' ? '大写' : k === 'digit' ? '数字' : '符号'}
          </label>
        ))}
        <button className="btn btn-sm btn-primary ml-auto" onClick={() => { const r = generatePassword({ length: Number(len), ...sets }); setOut(r.status === 'ok' ? r.data : r.message) }}>生成</button>
      </div>
      {out && <div className="flex items-center gap-2"><pre className="flex-1 overflow-auto rounded bg-base-100 p-2 font-mono text-sm">{out}</pre><CopyButton getText={() => out} enabled={!!out} /></div>}
    </div>
  )
}
