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

export interface HistoryEntry {
  id: string
  request: RequestModel
  response: {
    status: number
    statusText: string
    durationMs: number
    sizeBytes: number
    finalUrl: string
    truncatedBody?: string
  }
  envName: string
  at: number
}

export type ResponseModel = NetFetchOk & {
  durationMs: number
  undefinedVars: string[]
  kind?: string
}
