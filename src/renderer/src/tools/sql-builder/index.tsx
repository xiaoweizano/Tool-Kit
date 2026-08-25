import { useState } from 'react'
import { useMultiFieldTransform } from '@core/useMultiFieldTransform'
import { CopyButton } from '@components/CopyButton'
import { TriStateOutput } from '@components/TriStateOutput'

interface BuilderInput { tenants: string; sqls: string }

// 模块层常量空态判断(Task 1 review:empty 进 hook deps,稳定引用避免每次 render 重建)
const isEmpty = (input: BuilderInput): boolean => !input.tenants.trim() && !input.sqls.trim()

export default function SqlBuilderPage(): JSX.Element {
  const [tenants, setTenants] = useState('')
  const [sqls, setSqls] = useState('')
  const { setField, phase, result } = useMultiFieldTransform<BuilderInput, string>('sql-builder', isEmpty)

  const setBoth = (field: keyof BuilderInput, v: string): void => {
    if (field === 'tenants') setTenants(v); else setSqls(v)
    setField({ [field]: v })
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">租户 SQL 组装</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">TENANT · SQL BULK</span>
        <CopyButton getText={() => (result?.status === 'ok' ? result.data : '')} enabled={phase === 'done' && result?.status === 'ok'} />
      </header>
      <section className="border border-base-300 bg-base-200/40">
        <span className="ml-3 -mt-2 inline-block bg-base-100 px-1 font-mono text-[11px] tracking-widest text-neutral">租户 · 数据库名(逗号或换行分隔)</span>
        <textarea className="h-20 w-full resize-none border-0 bg-transparent p-4 font-mono text-[13px] leading-relaxed outline-none" placeholder="lsd, zqkj, 或每行一个" value={tenants} onChange={(e) => setBoth('tenants', e.target.value)} />
      </section>
      <section className="mt-3 border border-base-300 bg-base-200/40">
        <span className="ml-3 -mt-2 inline-block bg-base-100 px-1 font-mono text-[11px] tracking-widest text-neutral">SQL(每条一行)</span>
        <textarea className="h-40 w-full resize-none border-0 bg-transparent p-4 font-mono text-[13px] leading-relaxed outline-none" placeholder="粘贴 SQL(每条一行),缺分号自动补" value={sqls} onChange={(e) => setBoth('sqls', e.target.value)} />
      </section>
      <div className="mt-4">
        <TriStateOutput result={result} phase={phase} emptyHint="填租户与 SQL,自动为每个租户组装可批量执行的 SQL…" />
      </div>
    </div>
  )
}

export { SqlBuilderPage }