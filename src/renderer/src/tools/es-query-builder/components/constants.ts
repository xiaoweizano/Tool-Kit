import type { ConditionOp, FieldType } from '../types'

export const OPS: { id: ConditionOp; label: string }[] = [
  { id: 'eq', label: '=' }, { id: 'ne', label: '≠' }, { id: 'gt', label: '>' }, { id: 'gte', label: '≥' },
  { id: 'lt', label: '<' }, { id: 'lte', label: '≤' }, { id: 'contains', label: '包含' }, { id: 'notContains', label: '不包含' },
  { id: 'match', label: '匹配' }, { id: 'range', label: '范围' }, { id: 'in', label: '在列表' }, { id: 'notIn', label: '不在列表' },
  { id: 'exists', label: '存在' }, { id: 'notExists', label: '不存在' }
]

export const FIELD_TYPES: FieldType[] = ['text', 'keyword', 'integer', 'float', 'date', 'boolean']
