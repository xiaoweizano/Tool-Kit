// src/renderer/src/components/StrengthBar.tsx
const LEVEL_COLOR = { weak: 'progress-error', medium: 'progress-warning', strong: 'progress-success' } as const
export function StrengthBar({ score, level }: { score: number; level: 'weak' | 'medium' | 'strong' }): JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <progress className={`progress ${LEVEL_COLOR[level]} flex-1`} value={score} max={100} />
      <span className="font-mono text-sm">{score}</span>
    </div>
  )
}
