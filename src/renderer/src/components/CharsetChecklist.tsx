// src/renderer/src/components/CharsetChecklist.tsx
export function CharsetChecklist({ items }: { items: { label: string; hit: boolean }[] }): JSX.Element {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => (
        <span key={it.label} className={`badge badge-sm ${it.hit ? 'badge-success' : 'badge-ghost'}`}>
          {it.hit ? '✓' : '✗'} {it.label}
        </span>
      ))}
    </div>
  )
}
