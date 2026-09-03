import { highlightLine } from './highlight'
export function JsonView({ value }: { value: unknown }): JSX.Element {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  return (
    <pre className="overflow-auto rounded bg-base-100 p-2 font-mono text-xs">
      {text.split('\n').map((ln, i) => (
        <div key={i} className="whitespace-pre" dangerouslySetInnerHTML={{ __html: highlightLine(ln, 'json') || '&nbsp;' }} />
      ))}
    </pre>
  )
}
