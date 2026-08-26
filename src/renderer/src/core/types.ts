import type { ComponentType, LazyExoticComponent } from 'react'

export interface ToolCapability {
  offline: boolean
  network?: false | 'search' | 'ai' | 'translate'
  async?: boolean
}

export interface ToolDescriptor {
  id: string
  name: string
  icon: ComponentType
  route: string
  component: LazyExoticComponent<ComponentType>
  capability: ToolCapability
}

export type ToolResult<T> =
  | { status: 'ok'; data: T }
  | { status: 'error'; kind: 'invalid-input'; message: string; position?: number }
  | { status: 'error'; kind: 'partial'; message: string; failedItems?: number[] }
  | { status: 'error'; kind: 'unsupported'; structure: string; message: string }

export interface TransformOpts { [key: string]: string | number | boolean }

export type Transform<I, O, Opts extends TransformOpts = TransformOpts> =
  (input: I, opts?: Opts) => ToolResult<O>
