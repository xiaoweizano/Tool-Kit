import { useMemo, useState } from 'react'
import { LINUX_ENTRIES, searchLinux } from './data/index'
import { CATEGORIES } from './data/types'

const CAT_LABEL: Record<string, string> = {
  'files-dir': '文件与目录', text: '文本处理', find: '查找与定位', process: '进程与任务',
  network: '网络与远程', 'permission-user': '权限与用户', disk: '磁盘与分区',
  archive: '压缩与打包', system: '系统信息', 'shell-pkg': '软件包与Shell'
}

export default function LinuxManualPage(): JSX.Element {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [open, setOpen] = useState<string | null>(null)
  const hits = useMemo(() => searchLinux(q, cat), [q, cat])

  return (
    <div className="mx-auto max-w-5xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">Linux 命令大全</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">MANUAL · {LINUX_ENTRIES.length} 条</span>
      </header>
      <div className="grid grid-cols-[10rem_1fr] gap-4 max-lg:grid-cols-1">
        <aside className="border border-base-300 bg-base-200/40 p-2">
          <button className={`w-full px-3 py-1.5 text-left text-sm ${cat === 'all' ? 'bg-base-200 font-semibold' : ''}`} onClick={() => setCat('all')}>全部</button>
          {CATEGORIES.map((c) => (
            <button key={c} className={`w-full px-3 py-1.5 text-left text-sm ${cat === c ? 'bg-base-200 font-semibold' : ''}`} onClick={() => setCat(c)}>
              {CAT_LABEL[c]}
            </button>
          ))}
        </aside>
        <div className="min-w-0">
          <input autoFocus className="input input-bordered w-full font-mono text-sm"
            placeholder="搜索命令或说明(如 grep、压缩、查看进程)…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="mt-3">
            {hits.length === 0 && <p className="text-sm text-neutral">无匹配命令</p>}
            {hits.map((e) => (
              <div key={e.id} className="border border-base-300 bg-base-200/40 px-4 py-2">
                <button className="flex w-full items-baseline gap-3 text-left" onClick={() => setOpen(open === e.id ? null : e.id)}>
                  <span className="font-mono text-sm font-semibold text-primary">{e.name}</span>
                  <span className="text-sm text-base-content">{e.desc}</span>
                  <span className="ml-auto font-mono text-[11px] text-neutral">{CAT_LABEL[e.category]}</span>
                </button>
                {open === e.id && (
                  <div className="mt-2 pb-1">
                    {e.options && e.options.length > 0 && (
                      <ul className="space-y-1">
                        {e.options.map((o) => (
                          <li key={o.flag} className="font-mono text-[13px]">
                            <span className="text-success">{o.flag}</span>
                            <span className="ml-2 text-base-content">{o.desc}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {e.examples && e.examples.length > 0 && (
                      <pre className="mt-2 whitespace-pre-wrap rounded bg-base-100 p-2 font-mono text-[12px] text-base-content">{e.examples.join('\n')}</pre>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export { LinuxManualPage }
