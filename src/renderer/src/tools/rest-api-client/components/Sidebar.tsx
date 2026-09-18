import { useState } from 'react'
import type { GroupNode, HistoryEntry, RequestNode } from '../types'

interface Props {
  environments: { id: string; name: string }[]
  activeEnvId: string
  onSetEnv: (id: string) => void
  collections: GroupNode[]
  onLoadRequest: (node: RequestNode) => void
  history: HistoryEntry[]
  onHistoryLoad: (entry: HistoryEntry) => void
  onNewRequest: () => void
}

export function Sidebar(p: Props): JSX.Element {
  return (
    <aside className="flex w-56 shrink-0 flex-col gap-3 overflow-auto border-r border-base-300 bg-base-200/20 p-3">
      <button data-testid="new-request-btn" className="btn btn-sm btn-primary" onClick={p.onNewRequest}>
        + 新建请求
      </button>

      <div>
        <div className="mb-1 font-mono text-[11px] tracking-widest text-neutral">ENV · 环境</div>
        <select
          className="select select-bordered select-sm w-full font-mono"
          value={p.activeEnvId}
          onChange={(e) => p.onSetEnv(e.target.value)}
          aria-label="活动环境"
        >
          <option value="">(无环境)</option>
          {p.environments.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>

      <div className="min-h-0 flex-1">
        <div className="mb-1 font-mono text-[11px] tracking-widest text-neutral">COLLECTIONS · 集合</div>
        {p.collections.length === 0 && <div className="font-mono text-[11px] text-neutral">暂无集合</div>}
        {p.collections.map((g) => (
          <TreeGroup key={g.id} node={g} onLoadRequest={p.onLoadRequest} />
        ))}
      </div>

      <div className="min-h-0 flex-1">
        <div className="mb-1 font-mono text-[11px] tracking-widest text-neutral">HISTORY · 历史</div>
        {p.history.length === 0 && <div className="font-mono text-[11px] text-neutral">暂无历史</div>}
        <ul className="flex flex-col gap-1">
          {p.history.map((h) => (
            <li key={h.id}>
              <button
                className="btn btn-xs btn-ghost w-full justify-start gap-2 truncate font-mono"
                onClick={() => p.onHistoryLoad(h)}
                title={`${h.response.status} · ${h.request.method} ${h.request.url}`}
              >
                <span className={`font-bold ${h.response.status >= 400 ? 'text-error' : 'text-success'}`}>{h.request.method}</span>
                <span className="min-w-0 flex-1 truncate text-left">{h.request.url}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}

function TreeGroup({ node, onLoadRequest, depth = 0 }: { node: GroupNode; onLoadRequest: (n: RequestNode) => void; depth?: number }): JSX.Element {
  const [open, setOpen] = useState(true)
  return (
    <div>
      <button
        className="btn btn-xs btn-ghost w-full justify-start gap-1 font-mono"
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{open ? '▾' : '▸'}</span>
        <span className="truncate">{node.name}</span>
      </button>
      {open &&
        node.children.map((child) =>
          child.type === 'group' ? (
            <TreeGroup key={child.id} node={child} onLoadRequest={onLoadRequest} depth={depth + 1} />
          ) : (
            <button
              key={child.id}
              className="btn btn-xs btn-ghost w-full justify-start gap-2 truncate font-mono"
              style={{ paddingLeft: `${(depth + 1) * 12 + 4}px` }}
              onClick={() => onLoadRequest(child)}
              title={child.url}
            >
              <span className="font-bold">{child.method}</span>
              <span className="min-w-0 flex-1 truncate text-left">{child.name}</span>
            </button>
          )
        )}
    </div>
  )
}
