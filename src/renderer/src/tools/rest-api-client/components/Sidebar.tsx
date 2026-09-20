import { useEffect, useMemo, useRef, useState } from 'react'
import { bundleHasSecrets, exportBundle, importBundle, useRestStore } from '../store'
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
  const [bundleMsg, setBundleMsg] = useState('')
  const importInputRef = useRef<HTMLInputElement>(null)

  // 移动目标 = 树中所有分组(递归展平),排除当前正在移动的行由 select 逻辑兜底
  const moveTargets = collectGroups(p.collections)
  const activeEnv = p.environments.find((e) => e.id === p.activeEnvId)

  // 现存分组 id 集合:用于校验 selectedParentId 是否仍指向活节点
  const groupIds = useMemo(() => new Set(moveTargets.map((g) => g.id)), [moveTargets])

  // I1:选中的父分组被删除后,清空陈旧 selectedParentId,避免后续 insert 落到不存在的父节点被静默丢弃
  useEffect(() => {
    if (selectedParentId && !groupIds.has(selectedParentId)) setSelectedParentId('')
  }, [selectedParentId, groupIds])

  const onAddGroup = (): void => {
    const name = window.prompt('新分组名称')
    if (!name || !name.trim()) return
    // 陈旧父(已删)在 useEffect 清理前也可能命中,这里以活动树为准:非法父回退到根
    const parentId = groupIds.has(selectedParentId) ? selectedParentId : ''
    useRestStore.getState().addGroup(parentId, name.trim())
  }
  const onAddRequest = (): void => {
    const name = window.prompt('新请求名称')
    if (!name || !name.trim()) return
    // C1:确定性地解析一个合法父分组,绝不产生静默丢弃。
    //   1) 选中的分组仍存活 → 落它;
    //   2) 未选/选中已失效但树里有分组 → 落首个顶层分组并选中(让结果可见);
    //   3) 完全没有分组 → 先建默认分组再落入(消除 no-op)。
    let parentId = groupIds.has(selectedParentId) ? selectedParentId : ''
    if (!parentId) {
      const firstTop = p.collections[0]
      if (firstTop) {
        parentId = firstTop.id
      } else {
        // 完全没有分组:先建默认分组再落入(消除首次使用的静默 no-op)
        useRestStore.getState().addGroup('', '默认分组')
        parentId = useRestStore.getState().collections[0]?.id ?? ''
      }
      setSelectedParentId(parentId)
    }
    if (!parentId) return
    const ok = useRestStore.getState().addRequest(parentId, {
      id: crypto.randomUUID(),
      name: name.trim(),
      method: 'GET',
      url: '',
      headers: [],
      body: ''
    })
    if (!ok) window.alert('新建请求失败:目标分组不存在')
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

  // 导出前必查明文密钥:有则显式警告(可取消),绝不静默把 token 带出文件
  const onBundleExport = (): void => {
    if (bundleHasSecrets() && !window.confirm('导出文件含明文 token(环境变量值),请妥善保管。仍要导出吗?')) return
    const blob = new Blob([exportBundle()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `toolkit-rest-client-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const onBundleFile = async (f: File): Promise<void> => {
    const text = await f.text()
    const r = importBundle(text)
    // 校验失败必须把原因展示给用户,不静默;成功给一行确认
    setBundleMsg(r.ok ? '导入成功:集合与环境已按 id 合并' : `导入失败:${r.reason}`)
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

      <div>
        <div className="mb-1 font-mono text-[11px] tracking-widest text-neutral">BUNDLE · 导入 / 导出</div>
        <div className="flex gap-1">
          <button
            data-testid="bundle-export-btn"
            className="btn btn-xs btn-ghost"
            title="导出集合与环境为 JSON 文件(含环境变量明文值)"
            onClick={onBundleExport}
          >
            导出
          </button>
          <button
            data-testid="bundle-import-btn"
            className="btn btn-xs btn-ghost"
            title="从 JSON 文件导入集合与环境(按 id 合并)"
            onClick={() => importInputRef.current?.click()}
          >
            导入
          </button>
          <input
            ref={importInputRef}
            data-testid="bundle-import-input"
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onBundleFile(f)
              e.target.value = '' // 允许重复选择同一文件再次触发 change
            }}
          />
        </div>
        {bundleMsg && (
          <div data-testid="bundle-import-notice" className="mt-1 break-all font-mono text-[11px] text-info">
            {bundleMsg}
          </div>
        )}
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
                {h.request.truncated && (
                  <span className="badge badge-warning badge-xs shrink-0" title="该历史 body 已截断至 10KB,回发前请核对完整内容">
                    已截断
                  </span>
                )}
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
          data-testid={`group-node-${node.id}`}
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
