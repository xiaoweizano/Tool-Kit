import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { storageGetRaw, storageRemove, storageSetChecked } from '@core/storage'
import type { CollectionNode, Env, GroupNode, HistoryEntry, RequestModel, RequestNode } from './types'

export const HISTORY_CAP = 50
export const HISTORY_BODY_CAP = 10 * 1024

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

/** 插入到集合树;parentId 为空表示根层(根层只接受 group) */
function insert(collections: GroupNode[], parentId: string, child: CollectionNode): GroupNode[] {
  if (!parentId) return child.type === 'group' ? [...collections, child] : collections
  return collections.map((g) =>
    g.id === parentId ? { ...g, children: [...g.children, child] } : { ...g, children: insertChild(g.children, parentId, child) }
  )
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

/** 历史快照只存请求模板,body 超限截断(不存响应体) */
function truncate(m: RequestModel): RequestModel {
  return m.body.length > HISTORY_BODY_CAP ? { ...m, body: m.body.slice(0, HISTORY_BODY_CAP) } : m
}

interface RestState {
  collections: GroupNode[]
  environments: Env[]
  activeEnvId: string
  history: HistoryEntry[]
  writeFailed: boolean
  addGroup: (parentId: string, name: string) => void
  addRequest: (parentId: string, req: NewRequest) => void
  rename: (id: string, name: string) => void
  move: (id: string, destParentId: string) => void
  remove: (id: string) => void
  addEnv: (name: string) => void
  setEnvVars: (id: string, vars: Record<string, string>) => void
  deleteEnv: (id: string) => void
  setActiveEnv: (id: string) => void
  pushHistory: (entry: HistoryEntry) => void
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

      addGroup: (parentId, name) =>
        set((s) => ({ collections: insert(s.collections, parentId, { id: uid(), type: 'group', name, children: [] }) })),

      addRequest: (parentId, req) =>
        set((s) => ({ collections: insert(s.collections, parentId, { ...req, type: 'request' }) })),

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
          return { collections: insert(remove(s.collections, id), destParentId, node) }
        }),

      remove: (id) => set((s) => ({ collections: remove(s.collections, id) })),

      addEnv: (name) =>
        set((s) => {
          const env: Env = { id: uid(), name, vars: {} }
          return { environments: [...s.environments, env], activeEnvId: s.activeEnvId || env.id }
        }),

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
