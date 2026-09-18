import { useState } from 'react'
import { useRestStore } from '../store'
import type { CollectionNode, Env, GroupNode, HistoryEntry, RequestNode } from '../types'

interface Props {
  environments: Env[]
  activeEnvId: string
  onSetEnv: (id: string) => void
  collections: GroupNode[]
  onLoadRequest: (node: RequestNode) => void
  history: HistoryEntry[]
  onHistoryLoad: (entry: HistoryEntry) => void
  onNewRequest: () => void
}

interface MoveTarget {
  id: string
  name: string
}

export function Sidebar(p: Props): JSX.Element {
  const [selectedParentId, setSelectedParentId] = useState('')
  const [newKey, setNewKey] = useState('')
  const [newVal, setNewVal] = useState('')

  // 移动目标 = 树中所有分组(递归展平),排除当前正在移动的行由 select 逻辑兜底
  const moveTargets = collectGroups(p.collections)
  const activeEnv = p.environments.find((e) => e.id === p.activeEnvId)

  const onAddGroup = (): void => {
    const name = window.prompt('新分组名称')
    if (name && name.trim()) useRestStore.getState().addGroup(selectedParentId, name.trim())
  }
  const onAddRequest = (): void => {
    const name = window.prompt('新请求名称')
    if (!name || !name.trim()) return
    useRestStore.getState().addRequest(selectedParentId, {
      id: crypto.randomUUID(),
      name: name.trim(),
      method: 'GET',
      url: '',
      headers: [],
      body: ''
    })
  }
  const onAddEnv = (): void => {
    const name = window.prompt('新环境名称')
    if (name && name.trim()) useRestStore.getState().addEnv(name.trim())
  }
  const onAddEnvVar = (): void => {
    if (!activeEnv || !newKey.trim()) return
    useRestStore.getState().setEnvVars(activeEnv.id, { ...activeEnv.vars, [newKey.trim()]: newVal })
    setNewKey('')
    setNewVal('')
  }
  const onRemoveEnvVar = (key: string): void => {
    if (!activeEnv) return
    const rest = { ...activeEnv.vars }
    delete rest[key]
    useRestStore.getState().setEnvVars(activeEnv.id, rest)
  }

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
        <button data-testid="env-add-btn" className="btn btn-xs btn-ghost mt-1" onClick={onAddEnv}>
          + 环境
        </button>

        <ul className="mt-1 flex flex-col gap-1">
          {p.environments.map((e) => {
            const varCount = Object.keys(e.vars).length
            return (
              <li key={e.id} className="group flex items-center gap-1 font-mono text-[11px]">
                <span className={`min-w-0 flex-1 truncate ${e.id === p.activeEnvId ? 'font-bold text-primary' : 'text-neutral'}`}>
                  {e.name}
                  {e.id === p.activeEnvId && <span className="ml-1 opacity-70">· 活动</span>}
                </span>
                <button
                  className="btn btn-xs btn-ghost opacity-0 group-hover:opacity-100"
                  title="重命名环境"
                  onClick={() => {
                    const name = window.prompt('环境名称', e.name)
                    if (name && name.trim()) useRestStore.getState().renameEnv(e.id, name.trim())
                  }}
                >
                  重命名
                </button>
                <button
                  data-testid={`env-delete-btn-${e.id}`}
                  className="btn btn-xs btn-ghost text-error opacity-0 group-hover:opacity-100"
                  title="删除环境"
                  onClick={() => {
                    if (varCount > 0 && !window.confirm(`环境「${e.name}」含 ${varCount} 个变量,确定删除?`)) return
                    useRestStore.getState().deleteEnv(e.id)
                  }}
                >
                  删除
                </button>
              </li>
            )
          })}
        </ul>

        {activeEnv && (
          <div className="mt-2 border border-base-300 bg-base-100/60 p-2">
            <div className="mb-1 font-mono text-[11px] text-neutral">变量 · {activeEnv.name}</div>
            {Object.keys(activeEnv.vars).length === 0 && (
              <div className="mb-1 font-mono text-[11px] text-neutral">无变量</div>
            )}
            <ul className="flex flex-col gap-1">
              {Object.entries(activeEnv.vars).map(([k, v]) => (
                <li key={k} className="flex items-center gap-1 font-mono text-[11px]">
                  <span className="shrink-0 font-bold">{k}</span>
                  <span className="min-w-0 flex-1 truncate text-neutral">{v}</span>
                  <button
                    className="btn btn-xs btn-ghost text-error"
                    title="删除变量"
                    onClick={() => onRemoveEnvVar(k)}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-1 flex gap-1">
              <input
                data-testid="env-var-key"
                className="input input-bordered input-xs w-1/3 font-mono"
                placeholder="key"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
              />
              <input
                data-testid="env-var-value"
                className="input input-bordered input-xs flex-1 font-mono"
                placeholder="value(支持 {{var}})"
                value={newVal}
                onChange={(e) => setNewVal(e.target.value)}
              />
              <button data-testid="env-var-add-btn" className="btn btn-xs btn-ghost" onClick={onAddEnvVar}>
                +
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1">
        <div className="mb-1 font-mono text-[11px] tracking-widest text-neutral">COLLECTIONS · 集合</div>
        <div className="mb-1 flex gap-1">
          <button data-testid="add-group-btn" className="btn btn-xs btn-ghost" onClick={onAddGroup}>
            + 分组
          </button>
          <button data-testid="add-request-btn" className="btn btn-xs btn-ghost" onClick={onAddRequest}>
            + 请求
          </button>
          {selectedParentId && (
            <button className="btn btn-xs btn-ghost text-neutral" onClick={() => setSelectedParentId('')}>
              移至根
            </button>
          )}
        </div>
        {p.collections.length === 0 && <div className="font-mono text-[11px] text-neutral">暂无集合</div>}
        {p.collections.map((g) => (
          <TreeNode
            key={g.id}
            node={g}
            depth={0}
            moveTargets={moveTargets}
            selectedParentId={selectedParentId}
            onSelectParent={setSelectedParentId}
            onLoadRequest={p.onLoadRequest}
          />
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

function collectGroups(nodes: CollectionNode[], acc: MoveTarget[] = []): MoveTarget[] {
  for (const nd of nodes) {
    if (nd.type === 'group') {
      acc.push({ id: nd.id, name: nd.name })
      collectGroups(nd.children, acc)
    }
  }
  return acc
}

function onRename(node: CollectionNode): void {
  const name = window.prompt('重命名', node.name)
  if (name && name.trim()) useRestStore.getState().rename(node.id, name.trim())
}

function onDelete(node: CollectionNode): void {
  const childCount = node.type === 'group' ? node.children.length : 0
  if (childCount > 0 && !window.confirm(`分组「${node.name}」含 ${childCount} 个子项,确定删除整棵子树?`)) return
  useRestStore.getState().remove(node.id)
}

function onMove(node: CollectionNode, dest: string): void {
  if (!dest || dest === node.id) return
  useRestStore.getState().move(node.id, dest)
}

interface NodeProps {
  node: CollectionNode
  depth: number
  moveTargets: MoveTarget[]
  selectedParentId: string
  onSelectParent: (id: string) => void
  onLoadRequest: (n: RequestNode) => void
}

function NodeActions({ node, moveTargets }: { node: CollectionNode; moveTargets: MoveTarget[] }): JSX.Element {
  return (
    <span className="ml-auto flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100">
      <button data-testid={`rename-btn-${node.id}`} className="btn btn-xs btn-ghost" title="重命名" onClick={() => onRename(node)}>
        重命名
      </button>
      <select
        data-testid={`move-select-${node.id}`}
        className="select select-xs select-bordered w-16 font-mono"
        value=""
        aria-label="移动到"
        onChange={(e) => onMove(node, e.target.value)}
      >
        <option value="">移动…</option>
        {moveTargets
          .filter((t) => t.id !== node.id)
          .map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
      </select>
      <button
        data-testid={`delete-btn-${node.id}`}
        className="btn btn-xs btn-ghost text-error"
        title="删除"
        onClick={() => onDelete(node)}
      >
        删除
      </button>
    </span>
  )
}

function TreeNode(p: NodeProps): JSX.Element {
  const [open, setOpen] = useState(true)
  const { node, depth, moveTargets } = p
  const pad = { paddingLeft: `${depth * 12 + 4}px` }

  if (node.type === 'request') {
    return (
      <div className="group flex items-center gap-1" style={pad}>
        <button
          className="btn btn-xs btn-ghost min-w-0 flex-1 justify-start gap-2 truncate font-mono"
          onClick={() => p.onLoadRequest(node)}
          title={node.url}
        >
          <span className="font-bold">{node.method}</span>
          <span className="min-w-0 flex-1 truncate text-left">{node.name}</span>
        </button>
        <NodeActions node={node} moveTargets={moveTargets} />
      </div>
    )
  }

  return (
    <div>
      <div className="group flex items-center gap-1" style={pad}>
        <button
          className="btn btn-xs btn-justify btn-ghost min-w-0 flex-1 justify-start gap-1 font-mono"
          onClick={() => {
            setOpen((o) => !o)
            p.onSelectParent(node.id)
          }}
          title="设为新建父节点"
        >
          <span>{open ? '▾' : '▸'}</span>
          <span className="truncate">{node.name}</span>
        </button>
        {p.selectedParentId === node.id && <span className="badge badge-xs badge-primary">父</span>}
        <NodeActions node={node} moveTargets={moveTargets} />
      </div>
      {open && node.children.map((child) => <TreeNode key={child.id} {...p} node={child} depth={depth + 1} />)}
    </div>
  )
}
