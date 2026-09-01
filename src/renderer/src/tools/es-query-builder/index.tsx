import { useEffect, useMemo, useState } from 'react'
import type { Condition, LangId } from './types'
import { EMPTY_CONDITION } from './types'
import { buildQueryDsl, generateAllCodes, parseQueryDsl } from './transform'
import { ConditionTree } from './components/ConditionTree'
import { CodeOutput } from './components/CodeOutput'
import { CopyButton } from '@components/CopyButton'
import { highlightLine } from '@components/highlight'
import type { ToolResult } from '@core/types'

export default function EsQueryBuilderPage(): JSX.Element {
  const [tree, setTree] = useState<Condition>(EMPTY_CONDITION)
  const [indexName, setIndexName] = useState('products')
  const [from, setFrom] = useState('0')
  const [size, setSize] = useState('10')
  const [pasteText, setPasteText] = useState('')
  const [dsl, setDsl] = useState<ToolResult<string> | null>(null)
  const [codes, setCodes] = useState<Record<LangId, string> | null>(null)

  // build 走纯函数即时计算:空树(无子条件)是合法中间态,不触发 ERROR
  const built = useMemo(() => {
    const hasAny = (c: Condition): boolean =>
      !!c.field.trim() || (c.children !== undefined && c.children.some(hasAny))
    if (!hasAny(tree)) return null
    return buildQueryDsl({ rootCondition: tree, indexName, from: Number(from) || 0, size: Number(size) || 10 })
  }, [tree, indexName, from, size])
  useEffect(() => {
    if (!built) { setDsl(null); setCodes(null); return }
    if (built.status === 'ok') {
      setDsl(built)
      setCodes(generateAllCodes(built.data))
    } else {
      setDsl(built)
      setCodes(null)
    }
  }, [built])

  const parseText = (): void => {
    if (!pasteText.trim()) return
    const r = parseQueryDsl(pasteText)
    if (r.status === 'ok') {
      setTree(r.data.rootCondition)
    } else {
      setDsl(r)
      setCodes(null)
    }
  }

  const reset = (): void => { setTree(EMPTY_CONDITION); setPasteText('') }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">ES 查询构造</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">ELASTICSEARCH · QUERY BUILDER</span>
      </header>
      <section className="border border-base-300 bg-base-200/40">
        <span className="ml-3 -mt-2 inline-block bg-base-100 px-1 font-mono text-[11px] tracking-widest text-neutral">INPUT · 条件树</span>
        <div className="p-4">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <input className="input input-bordered input-xs w-40 font-mono" placeholder="索引名" value={indexName} onChange={(e) => setIndexName(e.target.value)} />
            <label className="flex items-center gap-1 font-mono text-sm text-neutral">from<input className="input input-bordered input-xs w-16 font-mono" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
            <label className="flex items-center gap-1 font-mono text-sm text-neutral">size<input className="input input-bordered input-xs w-16 font-mono" value={size} onChange={(e) => setSize(e.target.value)} /></label>
            <button className="btn btn-ghost btn-xs ml-auto" onClick={reset}>重置</button>
          </div>
          <ConditionTree root={tree} onChange={setTree} />
        </div>
      </section>
      <section className="mt-3 border border-base-300 bg-base-200/40">
        <span className="ml-3 -mt-2 inline-block bg-base-100 px-1 font-mono text-[11px] tracking-widest text-neutral">DSL · 粘贴解析回填</span>
        <div className="p-4">
          <textarea className="w-full h-32 border border-base-300 bg-base-100/60 p-3 font-mono text-[13px] leading-relaxed"
            placeholder="粘贴已有 DSL JSON,点下方解析回填上方条件树…" value={pasteText} onChange={(e) => setPasteText(e.target.value)} />
          <div className="mt-2 flex gap-2">
            <button className="btn btn-sm btn-primary" onClick={parseText}>解析回填</button>
          </div>
        </div>
      </section>
      <div className="py-3">
        <span className="font-mono text-[11px] tracking-widest text-neutral">OUTPUT · JSON DSL</span>
        <div className="relative mt-2">
          <div className="max-h-96 overflow-auto border border-base-300 bg-base-200/40 p-4 font-mono text-[13px] leading-[22px] whitespace-pre">
            {dsl?.status === 'ok'
              ? dsl.data.split('\n').map((ln, i) => (
                  <div key={i} className="whitespace-pre" dangerouslySetInnerHTML={{ __html: highlightLine(ln, 'json') || '&nbsp;' }} />
                ))
              : (dsl ? `✕ ${dsl.message}` : '在上方添加条件,DSL 即实时生成')}
          </div>
          {dsl?.status === 'ok' && (
            <div className="absolute right-3 top-3"><CopyButton getText={() => dsl.data} enabled /></div>
          )}
        </div>
      </div>
      {codes && <CodeOutput codes={codes} />}
    </div>
  )
}

export { EsQueryBuilderPage }
