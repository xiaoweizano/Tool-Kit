import { useState } from 'react'
import type { LangId } from '../types'
import { CopyButton } from '@components/CopyButton'

const LANGS: { id: LangId; label: string }[] = [
  { id: 'java', label: 'Java' }, { id: 'python', label: 'Python' }, { id: 'shell', label: 'Shell' },
  { id: 'http', label: 'HTTP' }, { id: 'go', label: 'Go' }, { id: 'node', label: 'Node' }
]

interface Props { codes: Record<LangId, string> }

export function CodeOutput({ codes }: Props): JSX.Element {
  const [lang, setLang] = useState<LangId>('java')
  const text = codes[lang] ?? ''
  return (
    <section className="border border-base-300 bg-base-200/40">
      <div className="flex items-center gap-1 border-b border-base-300 px-3 py-2">
        <span className="font-mono text-[11px] tracking-widest text-neutral">CODE ·</span>
        {LANGS.map((l) => (
          <button key={l.id} className={`btn btn-xs font-mono ${lang === l.id ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setLang(l.id)}>{l.label}</button>
        ))}
        <CopyButton getText={() => text} enabled={text.length > 0} />
      </div>
      <pre className="max-h-80 overflow-auto p-4 font-mono text-[13px] leading-[22px] whitespace-pre">{text}</pre>
    </section>
  )
}
