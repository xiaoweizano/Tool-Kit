import type { Condition, ConditionOp, FieldType, RangeObj } from '../types'
import { OPS, FIELD_TYPES } from './constants'

interface Props {
  node: Condition
  depth: number
  onChange: (next: Condition) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
}

const isGroup = (c: Condition): boolean => c.children !== undefined

const genId = (): string => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `c${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)

// value 的字符串形式(单值/数组逗号)供输入框展示
const valueToStr = (v: Condition['value']): string =>
  Array.isArray(v) ? v.join(',') : typeof v === 'object' ? '' : String(v)

function LeafRow({ node, onChange, onRemove, onMove }: Omit<Props, 'depth'>): JSX.Element {
  const isMultiValue = node.op === 'in' || node.op === 'notIn'

  const setValue = (s: string): void => {
    onChange({ ...node, value: isMultiValue ? s.split(/[,，]/).map((x) => x.trim()).filter(Boolean) : s })
  }

  return (
    <div className="circuit-grid flex flex-wrap items-center gap-2 border border-base-300 bg-base-100/60 px-3 py-2">
      <input
        className="input input-bordered input-xs w-48 font-mono"
        placeholder="字段"
        value={node.field}
        onChange={(e) => onChange({ ...node, field: e.target.value })}
      />
      <select
        className="select select-bordered select-xs font-mono"
        value={node.op}
        onChange={(e) => onChange({ ...node, op: e.target.value as ConditionOp })}
      >
        {OPS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      {node.op !== 'exists' && node.op !== 'notExists' && node.op !== 'range' && (
        <input
          className="input input-bordered input-xs w-40 font-mono"
          placeholder={isMultiValue ? '值,逗号分隔' : '值'}
          value={valueToStr(node.value)}
          onChange={(e) => setValue(e.target.value)}
        />
      )}
      {node.op === 'range' && typeof node.value === 'object' && (
        <>
          {(Object.keys(node.value as object) as (keyof RangeObj)[]).map((bound) => (
            <input
              key={bound}
              className="input input-bordered input-xs w-20 font-mono"
              placeholder={{ gt: '>', gte: '≥', lt: '<', lte: '≤' }[bound]}
              value={String((node.value as RangeObj)[bound] ?? '')}
              onChange={(e) => onChange({ ...node, value: { ...(node.value as RangeObj), [bound]: e.target.value } })}
            />
          ))}
        </>
      )}
      {node.op !== 'exists' && node.op !== 'notExists' && (
        <select
          className="select select-bordered select-xs font-mono"
          value={node.fieldType ?? ''}
          onChange={(e) => onChange({ ...node, fieldType: (e.target.value || undefined) as FieldType | undefined })}
        >
          <option value="">类型</option>
          {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      )}
      <span className="ml-auto flex gap-1">
        <button className="btn btn-ghost btn-xs" onClick={() => onMove(-1)} title="上移">↑</button>
        <button className="btn btn-ghost btn-xs" onClick={() => onMove(1)} title="下移">↓</button>
        <button className="btn btn-ghost btn-xs text-error" onClick={onRemove} title="删除">✕</button>
      </span>
    </div>
  )
}

// 分组面板:带边框的嵌套容器,有自己的 AND/OR 逻辑,子条件可有 ↑↓✕
function GroupPanel({ node, depth, onChange, onRemove, onMove }: Props): JSX.Element {
  const children = node.children ?? []
  const updateChild = (i: number, child: Condition): void => {
    onChange({ ...node, children: children.map((c, j) => (j === i ? child : c)) })
  }
  const removeChild = (i: number): void => {
    onChange({ ...node, children: children.filter((_, j) => j !== i) })
  }
  const moveChild = (i: number, dir: -1 | 1): void => {
    const j = i + dir
    if (j < 0 || j >= children.length) return
    const next = [...children]; [next[i], next[j]] = [next[j], next[i]]
    onChange({ ...node, children: next })
  }
  const addChild = (): void => {
    onChange({ ...node, children: [...children, { id: genId(), field: '', op: 'eq' as ConditionOp, value: '' }] })
  }
  const addGroup = (): void => {
    onChange({ ...node, children: [...children, { id: genId(), field: '', op: 'eq' as ConditionOp, value: '', logic: 'and', children: [] }] })
  }

  return (
    <div className="border border-base-300 bg-base-200/30 p-3" style={{ marginLeft: depth > 0 ? 20 : 0 }}>
      <div className="mb-2 flex items-center gap-2">
        <select
          className="select select-bordered select-xs w-20 font-mono text-neutral"
          value={node.logic ?? 'and'}
          onChange={(e) => onChange({ ...node, logic: e.target.value as 'and' | 'or' })}
        >
          <option value="and">AND</option>
          <option value="or">OR</option>
        </select>
        <span className="ml-auto flex gap-1">
          <button className="btn btn-ghost btn-xs" onClick={() => onMove(-1)} title="上移">↑</button>
          <button className="btn btn-ghost btn-xs" onClick={() => onMove(1)} title="下移">↓</button>
          <button className="btn btn-ghost btn-xs text-error" onClick={onRemove} title="删除">✕</button>
        </span>
      </div>
      {children.length === 0 ? (
        <p className="px-1 py-2 font-mono text-[11px] text-neutral">尚无条件——点「+ 条件」添加一个</p>
      ) : (
        children.map((child, i) => (
          <ConditionNode
            key={child.id}
            node={child}
            depth={depth + 1}
            onChange={(c) => updateChild(i, c)}
            onRemove={() => removeChild(i)}
            onMove={(dir) => moveChild(i, dir)}
          />
        ))
      )}
      <div className="mt-2 flex gap-2">
        <button className="btn btn-ghost btn-xs" onClick={addChild}>+ 条件</button>
        <button className="btn btn-ghost btn-xs" onClick={addGroup}>+ 分组</button>
      </div>
    </div>
  )
}

// 根容器:顶层平铺,不包一眼分组边框。逻辑下拉 + 子项(条件/分组并列) + 底部按钮
function RootContainer({ node, onChange }: { node: Condition; onChange: (next: Condition) => void }): JSX.Element {
  const children = node.children ?? []
  const updateChild = (i: number, child: Condition): void => {
    onChange({ ...node, children: children.map((c, j) => (j === i ? child : c)) })
  }
  const removeChild = (i: number): void => {
    onChange({ ...node, children: children.filter((_, j) => j !== i) })
  }
  const moveChild = (i: number, dir: -1 | 1): void => {
    const j = i + dir
    if (j < 0 || j >= children.length) return
    const next = [...children]; [next[i], next[j]] = [next[j], next[i]]
    onChange({ ...node, children: next })
  }
  const addChild = (): void => {
    onChange({ ...node, children: [...children, { id: genId(), field: '', op: 'eq' as ConditionOp, value: '' }] })
  }
  const addGroup = (): void => {
    onChange({ ...node, children: [...children, { id: genId(), field: '', op: 'eq' as ConditionOp, value: '', logic: 'and', children: [] }] })
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="font-mono text-[11px] tracking-widest text-neutral">顶层逻辑</span>
        <select
          className="select select-bordered select-xs w-24 font-mono"
          value={node.logic ?? 'and'}
          onChange={(e) => onChange({ ...node, logic: e.target.value as 'and' | 'or' })}
        >
          <option value="and">AND</option>
          <option value="or">OR</option>
        </select>
      </div>
      {children.length === 0 ? (
        <p className="px-1 py-3 font-mono text-[11px] text-neutral">尚无条件——点「+ 条件」或「+ 分组」开始</p>
      ) : (
        <div className="space-y-2">
          {children.map((child, i) => (
            <ConditionNode
              key={child.id}
              node={child}
              depth={1}
              onChange={(c) => updateChild(i, c)}
              onRemove={() => removeChild(i)}
              onMove={(dir) => moveChild(i, dir)}
            />
          ))}
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <button className="btn btn-ghost btn-xs" onClick={addChild}>+ 条件</button>
        <button className="btn btn-ghost btn-xs" onClick={addGroup}>+ 分组</button>
      </div>
    </div>
  )
}

export function ConditionNode({ node, depth, onChange, onRemove, onMove }: Props): JSX.Element {
  if (depth === 0) return <RootContainer node={node} onChange={onChange} />
  if (isGroup(node)) return <GroupPanel node={node} depth={depth} onChange={onChange} onRemove={onRemove} onMove={onMove} />
  return <LeafRow node={node} onChange={onChange} onRemove={onRemove} onMove={onMove} />
}
