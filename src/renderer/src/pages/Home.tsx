import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { searchTools, tools } from '@tools/register'
import { getRecent } from '@core/recent'

export function Home(): JSX.Element {
  const [q, setQ] = useState('')
  const nav = useNavigate()
  const hits = useMemo(() => searchTools(q), [q])
  const recent = getRecent()
    .map((id) => tools.find((t) => t.id === id)!)
    .filter(Boolean)

  return (
    <div className="mx-auto max-w-4xl p-8">
      <input
        autoFocus
        className="input input-bordered w-full font-mono text-sm"
        placeholder="搜索工具,回车进入第一个结果…(Ctrl+K 全局)"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && hits[0]) nav(hits[0].route)
        }}
      />
      {recent.length > 0 && (
        <section className="mt-8">
          <h2 className="font-mono text-[11px] tracking-[0.3em] text-neutral">RECENT · 最近使用</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {recent.map((t) => (
              <Link key={t.id} to={t.route} className="btn btn-sm btn-outline">
                {t.name}
              </Link>
            ))}
          </div>
        </section>
      )}
      <section className="mt-8">
        <h2 className="font-mono text-[11px] tracking-[0.3em] text-neutral">TOOLS · 工具节点图</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
          {hits.map((t) => (
            <Link
              key={t.id}
              to={t.route}
              className="circuit-grid border border-base-300 bg-base-200/60 p-4 transition hover:border-primary"
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 border-1.5 border-neutral bg-base-100" />
                <span className="text-sm">{t.name}</span>
                {t.capability.network && (
                  <span className="badge badge-xs badge-warning font-mono text-[11px]">NET</span>
                )}
              </div>
              <span className="mt-1 block font-mono text-[11px] text-neutral">{t.id}</span>
            </Link>
          ))}
          {tools.length === 0 && (
            <p className="text-sm text-neutral">工具尚未接入——注册后此处成为节点图</p>
          )}
        </div>
      </section>
    </div>
  )
}
