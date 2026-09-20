import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { storageGetRaw, storageRemove, storageSetChecked } from '@core/storage'
import type { CollectionNode, Env, GroupNode, HistoryEntry, HistoryEntryInput, HistoryRequest, RequestModel, RequestNode } from './types'

export const HISTORY_CAP = 50
export const HISTORY_BODY_CAP = 10 * 1024
export const BUNDLE_VERSION = 1

const uid = (): string => crypto.randomUUID()

/** 新建请求:`type` 由 store 决定;允许调用方传入具名 RequestNode(type 可选)而不报多余属性 */
type NewRequest = Omit<RequestNode, 'type'> & { type?: 'request' }

// ---- 集合树:全部纯函数,只重建路径上的节点,绝不就地改写 ----

/** 在 id 为 parentId 的 group 下插入 child(返回新数组) */
function insertChild(children: CollectionNode[], parentId: string, child: CollectionNode): CollectionNode[] {
  return children.map((nd) => {
    if (nd.type !== 'group') return nd
    if (nd.id === parentId) return { ...nd, children: [...nd.children, child] }
    return { ...nd, children: insertChild(nd.children, parentId, child) }
  })
}

/**
 * 插入到集合树;parentId 为空表示根层(根层只接受 group)。
 * 返回 ok 让调用方感知"被拒"(根层落请求 / 父不存在),不再静默丢弃。
 */
function insert(collections: GroupNode[], parentId: string, child: CollectionNode): { collections: GroupNode[]; ok: boolean } {
  if (!parentId) {
    return child.type === 'group' ? { collections: [...collections, child], ok: true } : { collections, ok: false }
  }
  const parent = findIn(collections, parentId)
  if (!parent || parent.type !== 'group') return { collections, ok: false }
  return {
    collections: collections.map((g) =>
      g.id === parentId ? { ...g, children: [...g.children, child] } : { ...g, children: insertChild(g.children, parentId, child) }
    ),
    ok: true
  }
}

function removeChild(children: CollectionNode[], id: string): CollectionNode[] {
  return children
    .filter((nd) => nd.id !== id)
    .map((nd) => (nd.type === 'group' ? { ...nd, children: removeChild(nd.children, id) } : nd))
}

function remove(collections: GroupNode[], id: string): GroupNode[] {
  return collections.filter((g) => g.id !== id).map((g) => ({ ...g, children: removeChild(g.children, id) }))
}

function findIn(nodes: CollectionNode[], id: string): CollectionNode | undefined {
  for (const nd of nodes) {
    if (nd.id === id) return nd
    if (nd.type === 'group') {
      const hit = findIn(nd.children, id)
      if (hit) return hit
    }
  }
  return undefined
}

function renameChild(children: CollectionNode[], id: string, name: string): CollectionNode[] {
  return children.map((nd) => {
    if (nd.id === id) return { ...nd, name }
    if (nd.type === 'group') return { ...nd, children: renameChild(nd.children, id, name) }
    return nd
  })
}

function rename(collections: GroupNode[], id: string, name: string): GroupNode[] {
  return collections.map((g) => (g.id === id ? { ...g, name } : { ...g, children: renameChild(g.children, id, name) }))
}

function containsId(children: CollectionNode[], id: string): boolean {
  for (const nd of children) {
    if (nd.id === id) return true
    if (nd.type === 'group' && containsId(nd.children, id)) return true
  }
  return false
}

/** 历史快照只存请求模板,body 超限截断(不存响应体);截断 MUST 标记 truncated,回放时与完整 body 可区分 */
function truncate(m: RequestModel): HistoryRequest {
  return m.body.length > HISTORY_BODY_CAP
    ? { ...m, body: m.body.slice(0, HISTORY_BODY_CAP), truncated: true }
    : { ...m, truncated: false }
}

interface RestState {
  collections: GroupNode[]
  environments: Env[]
  activeEnvId: string
  history: HistoryEntry[]
  writeFailed: boolean
  addGroup: (parentId: string, name: string) => boolean
  addRequest: (parentId: string, req: NewRequest) => boolean
  rename: (id: string, name: string) => void
  move: (id: string, destParentId: string) => void
  remove: (id: string) => void
  addEnv: (name: string) => void
  renameEnv: (id: string, name: string) => void
  setEnvVars: (id: string, vars: Record<string, string>) => void
  deleteEnv: (id: string) => void
  setActiveEnv: (id: string) => void
  pushHistory: (entry: HistoryEntryInput) => void
  markWriteFailed: () => void
}

/** 重入保护:写失败 -> markWriteFailed -> set -> persist 再写,避免无限递归 */
let reportingFailure = false

export const useRestStore = create<RestState>()(
  persist(
    (set) => ({
      collections: [],
      environments: [],
      activeEnvId: '',
      history: [],
      writeFailed: false,

      addGroup: (parentId, name) => {
        let ok = false
        set((s) => {
          const r = insert(s.collections, parentId, { id: uid(), type: 'group', name, children: [] })
          ok = r.ok
          return { collections: r.collections }
        })
        return ok
      },

      addRequest: (parentId, req) => {
        let ok = false
        set((s) => {
          const r = insert(s.collections, parentId, { ...req, type: 'request' })
          ok = r.ok
          return { collections: r.collections }
        })
        return ok
      },

      rename: (id, name) => set((s) => ({ collections: rename(s.collections, id, name) })),

      move: (id, destParentId) =>
        set((s) => {
          const node = findIn(s.collections, id)
          if (!node || destParentId === id) return s
          if (destParentId) {
            const dest = findIn(s.collections, destParentId)
            // 目标不存在/非 group/是自身子孙 => 拒绝,避免丢节点或成环
            if (!dest || dest.type !== 'group') return s
            if (node.type === 'group' && containsId(node.children, destParentId)) return s
          } else if (node.type !== 'group') {
            return s // 根层只允许 group
          }
          return { collections: insert(remove(s.collections, id), destParentId, node).collections }
        }),

      remove: (id) => set((s) => ({ collections: remove(s.collections, id) })),

      addEnv: (name) =>
        set((s) => {
          const env: Env = { id: uid(), name, vars: {} }
          return { environments: [...s.environments, env], activeEnvId: s.activeEnvId || env.id }
        }),

      renameEnv: (id, name) =>
        set((s) => ({ environments: s.environments.map((e) => (e.id === id ? { ...e, name } : e)) })),

      setEnvVars: (id, vars) =>
        set((s) => ({ environments: s.environments.map((e) => (e.id === id ? { ...e, vars } : e)) })),

      deleteEnv: (id) =>
        set((s) => {
          const environments = s.environments.filter((e) => e.id !== id)
          return { environments, activeEnvId: s.activeEnvId === id ? (environments[0]?.id ?? '') : s.activeEnvId }
        }),

      setActiveEnv: (id) => set({ activeEnvId: id }),

      pushHistory: (entry) =>
        set((s) => ({ history: [{ ...entry, request: truncate(entry.request) }, ...s.history].slice(0, HISTORY_CAP) })),

      markWriteFailed: () => set({ writeFailed: true })
    }),
    {
      name: 'toolkit.rest-client',
      // 排除 writeFailed:会话级失败标记绝不跨重启存活(避免陈旧横幅误导用户)
      partialize: (s) => ({
        collections: s.collections,
        environments: s.environments,
        activeEnvId: s.activeEnvId,
        history: s.history
      }),
      storage: createJSONStorage(() => ({
        getItem: (k) => storageGetRaw(k),
        setItem: (k, v) => {
          // 用带返回值的写入,失败时把状态置为 writeFailed 让 UI 可见
          if (storageSetChecked(k, JSON.parse(v)).ok || reportingFailure) return
          reportingFailure = true
          try {
            useRestStore.getState().markWriteFailed()
          } finally {
            reportingFailure = false
          }
        },
        removeItem: (k) => storageRemove(k)
      }))
    }
  )
)

// ---- 导入/导出:整体校验后原子提交 ----

/** 导出当前集合与环境为 JSON 文本;不含历史(避免把响应内容带出) */
export function exportBundle(): string {
  const s = useRestStore.getState()
  return JSON.stringify({
    version: BUNDLE_VERSION,
    exportedAt: new Date().toISOString(),
    collections: s.collections,
    environments: s.environments
  })
}

/** 校验失败不改状态;成功时按 id 合并(已存在同 id 跳过,新 id 追加) */
export function importBundle(json: string): { ok: true } | { ok: false; reason: string } {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return { ok: false, reason: 'invalid JSON' }
  }
  if (typeof data !== 'object' || data === null) return { ok: false, reason: 'bundle is not an object' }
  const b = data as { version?: unknown; collections?: unknown; environments?: unknown }
  if (b.version !== BUNDLE_VERSION) return { ok: false, reason: `unsupported bundle version: ${String(b.version)}` }
  if (!Array.isArray(b.collections) || !Array.isArray(b.environments)) {
    return { ok: false, reason: 'collections/environments must be arrays' }
  }
  const incoming = { collections: b.collections as GroupNode[], environments: b.environments as Env[] }
  // 只有整体校验通过后才 set,且只 set 一次 => 原子
  useRestStore.setState((s) => ({
    collections: [...s.collections, ...incoming.collections.filter((c) => !findIn(s.collections, c.id))],
    environments: [...s.environments, ...incoming.environments.filter((e) => !s.environments.some((x) => x.id === e.id))]
  }))
  return { ok: true }
}

/** 任一环境存在非空变量值即为真(用于导入前提示可能含密钥) */
export function bundleHasSecrets(): boolean {
  return useRestStore.getState().environments.some((e) => Object.values(e.vars).some((v) => v !== ''))
}
