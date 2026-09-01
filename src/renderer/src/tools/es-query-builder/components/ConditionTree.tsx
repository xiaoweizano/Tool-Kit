import type { Condition } from '../types'
import { ConditionNode } from './ConditionNode'

interface Props { root: Condition; onChange: (next: Condition) => void }

export function ConditionTree({ root, onChange }: Props): JSX.Element {
  return (
    <ConditionNode
      node={root}
      depth={0}
      onChange={onChange}
      onRemove={() => { /* root 不可删 */ }}
      onMove={() => { /* root 不可移 */ }}
    />
  )
}
