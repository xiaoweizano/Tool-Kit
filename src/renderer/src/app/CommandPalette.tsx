import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchTools } from '@tools/register'

export function CommandPalette(): JSX.Element | null {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const nav = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
        setQ('')
        setIdx(0)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  if (!open) return null
  const hits = searchTools(q)
  const go = (route: string): void => {
    setOpen(false)
    nav(route)
  }

  return (
    <dialog className="modal modal-open" onClick={() => setOpen(false)}>
      <div className="modal-box bg-base-200" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="input input-bordered w-full font-mono text-sm"
          placeholder="搜索工具(id 或名称)…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setIdx(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') setIdx((i) => Math.min(i + 1, hits.length - 1))
            if (e.key === 'ArrowUp') setIdx((i) => Math.max(i - 1, 0))
            if (e.key === 'Enter' && hits[idx]) go(hits[idx].route)
          }}
        />
        <ul className="menu mt-2">
          {hits.map((t, i) => (
            <li key={t.id}>
              <button className={i === idx ? 'active' : ''} onClick={() => go(t.route)}>
                {t.name}
                <span className="ml-auto font-mono text-[11px] text-neutral">{t.id}</span>
              </button>
            </li>
          ))}
          {hits.length === 0 && <li className="p-3 text-sm text-neutral">无匹配工具</li>}
        </ul>
      </div>
    </dialog>
  )
}
