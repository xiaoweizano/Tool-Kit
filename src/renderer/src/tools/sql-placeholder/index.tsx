import { useState } from 'react'
import { useMultiFieldTransform } from '@core/useMultiFieldTransform'
import { CopyButton } from '@components/CopyButton'
import { TriStateOutput } from '@components/TriStateOutput'
import type { ToolResult } from '@core/types'
import { autoFillDefaults, formatSql, unfillLiterals } from './transform'

interface SqlInput { sql: string; params: string }

// 模块层常量空态判断(Task 1 review:empty 进 hook deps,稳定引用避免每次 render 重建)
const isEmpty = (input: SqlInput): boolean => !input.sql.trim()

export default function SqlPlaceholderPage(): JSX.Element {
  const [sql, setSql] = useState('')
  const [params, setParams] = useState('')
  const [notice, setNotice] = useState('')
  const { input, setField, phase, result } = useMultiFieldTransform<SqlInput, string>('sql-placeholder', isEmpty)

  const setBoth = (field: keyof SqlInput, v: string): void => {
    if (field === 'sql') setSql(v); else setParams(v)
    setField({ [field]: v })
  }
  const applyTransform = (fn: (sql: string) => ToolResult<string>, label: string): void => {
    const r = fn(sql)
    if (r.status === 'ok') {
      setBoth('sql', r.data)
      setNotice('')
    } else {
      // 无静默失败:显示短错误,不执行替换
      setNotice(`${label} 失败:${r.message}`)
    }
  }
  const list = input?.params ? input.params.split('\n') : params.split('\n')

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">SQL 占位符</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">PLACEHOLDER · REPLACE</span>
        <CopyButton getText={() => (result?.status === 'ok' ? result.data : '')} enabled={phase === 'done' && result?.status === 'ok'} />
      </header>
      <section className="border border-base-300 bg-base-200/40">
        <span className="ml-3 -mt-2 inline-block bg-base-100 px-1 font-mono text-[11px] tracking-widest text-neutral">SQL</span>
        <textarea className="h-40 w-full resize-none border-0 bg-transparent p-4 font-mono text-[13px] leading-relaxed outline-none" placeholder="粘贴 SQL,? 占位符按序替换" value={sql} onChange={(e) => setBoth('sql', e.target.value)} />
      </section>
      <section className="mt-3 border border-base-300 bg-base-200/40">
        <span className="ml-3 -mt-2 inline-block bg-base-100 px-1 font-mono text-[11px] tracking-widest text-neutral">PARAMS · 参数(每行一个)</span>
        <textarea className="h-24 w-full resize-none border-0 bg-transparent p-4 font-mono text-[13px] leading-relaxed outline-none" placeholder="每行一个参数,或点击「一键默认值」自动填充" value={params} onChange={(e) => setBoth('params', e.target.value)} />
      </section>
      <div className="mt-3 flex items-center gap-2">
        <button className="btn btn-outline btn-xs" onClick={() => { setBoth('params', autoFillDefaults(sql).join('\n')) }}>一键默认值</button>
        <button className="btn btn-outline btn-xs" onClick={() => applyTransform(formatSql, '格式化')}>格式化</button>
        <button className="btn btn-outline btn-xs" onClick={() => applyTransform(unfillLiterals, '反向替换')}>反向替换</button>
        <span className="font-mono text-[11px] text-neutral">{list.length} 个 ?</span>
      </div>
      {notice && <p className="mt-1 font-mono text-[11px] text-error">{notice}</p>}
      <div className="mt-4">
        <TriStateOutput result={result} phase={phase} emptyHint="填写 SQL 与参数,自动替换 ? 即刻点亮…" />
      </div>
    </div>
  )
}

export { SqlPlaceholderPage }
