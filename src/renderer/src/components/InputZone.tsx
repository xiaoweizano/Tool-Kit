import { useState } from 'react'

interface Props { value: string; onChange: (v: string) => void; placeholder: string }

const COLLAPSE_AT = 200 * 1024

export function InputZone({ value, onChange, placeholder }: Props): JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const big = value.length > COLLAPSE_AT

  if (big && !expanded) {
    return (
      <div className="border border-base-300 bg-base-200/50 p-6 text-center">
        <p className="font-mono text-sm text-neutral">输入 {(value.length / 1024).toFixed(0)}KB,已折叠以保持流畅</p>
        <button className="btn btn-outline btn-sm mt-2" onClick={() => setExpanded(true)}>展开编辑</button>
      </div>
    )
  }
  return (
    <textarea
      autoFocus spellCheck={false}
      className="h-44 w-full resize-none border-0 bg-transparent p-4 font-mono text-[13px] leading-relaxed outline-none"
      placeholder={placeholder} value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
