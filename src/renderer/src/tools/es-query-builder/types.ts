export type ConditionOp =
  | 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'contains' | 'notContains' | 'match' | 'range'
  | 'in' | 'notIn' | 'exists' | 'notExists'

export type FieldType = 'text' | 'keyword' | 'integer' | 'float' | 'date' | 'boolean'

export type RangeObj = { gte?: string | number; lte?: string | number; gt?: string | number; lt?: string | number }

export interface Condition {
  id: string
  field: string
  op: ConditionOp
  value: string | number | string[] | RangeObj
  fieldType?: FieldType
  children?: Condition[]
  logic?: 'and' | 'or'
  minShouldMatch?: number
  readonly?: boolean
}

export interface EsQueryState {
  rootCondition: Condition
  indexName: string
  from?: number
  size?: number
}

export type LangId = 'java' | 'python' | 'shell' | 'http' | 'go' | 'node'

export const MAX_DEPTH = 10
export const EMPTY_CONDITION: Condition = { id: 'root', field: '', op: 'eq', value: '', children: [], logic: 'and' }
