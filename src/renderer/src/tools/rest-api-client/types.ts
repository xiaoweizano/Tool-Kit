import type { NetFetchOk } from '@core/net-channel'

export interface KV {
  id: string
  key: string
  value: string
}

export interface RequestModel {
  method: string
  url: string
  headers: KV[]
  body: string
}

export interface Env {
  id: string
  name: string
  vars: Record<string, string>
}

export interface GroupNode {
  id: string
  type: 'group'
  name: string
  children: CollectionNode[]
}

export interface RequestNode {
  id: string
  type: 'request'
  name: string
  method: string
  url: string
  headers: KV[]
  body: string
}

export type CollectionNode = GroupNode | RequestNode

/** 历史里的请求快照:body 超 10KB 被截断时 truncated=true(回放时与完整 body 可区分,绝不静默混淆) */
export type HistoryRequest = RequestModel & { truncated: boolean }

/** pushHistory 的入参:请求快照用原始 RequestModel,truncated 由 store 依据 body 大小统一打标 */
export type HistoryEntryInput = Omit<HistoryEntry, 'request'> & { request: RequestModel }

export interface HistoryEntry {
  id: string
  request: HistoryRequest
  response: {
    status: number
    statusText: string
    durationMs: number
    sizeBytes: number
    finalUrl: string
  }
  envName: string
  at: number
}

/** 响应区错误横幅:title 区分「请求失败」与「导入失败」(cURL 解析失败不是请求失败) */
export interface UiError {
  title: string
  message: string
}

export type ResponseModel = NetFetchOk & {
  durationMs: number
  undefinedVars: string[]
  kind?: string
}
