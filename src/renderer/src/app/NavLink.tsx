import { Link, useLocation } from 'react-router-dom'
import type { ToolDescriptor } from '@core/types'

export function ToolNavLink({ tool }: { tool: ToolDescriptor }): JSX.Element {
  const { pathname } = useLocation()
  const active = pathname === tool.route
  return (
    <Link
      to={tool.route}
      className={`relative flex items-center gap-2.5 px-5 py-2.5 text-sm
        ${active ? 'text-base-content' : 'text-neutral hover:text-base-content'}`}
      aria-current={active ? 'page' : undefined}
    >
      <span
        style={{ borderWidth: 2 }}
        className={`h-2 w-2 border ${active
          ? 'border-primary bg-primary shadow-[0_0_8px_var(--color-primary)]'
          : 'border-neutral bg-base-100'}`}
      />
      <span className="max-lg:hidden whitespace-nowrap">{tool.name}</span>
      {tool.capability.network ? (
        <span className="badge badge-warning badge-xs ml-auto max-lg:hidden font-mono text-[11px]">NET</span>
      ) : null}
      {active && (
        <span
          className="absolute top-full left-[23px] h-[calc(100%-0px)] w-0.5 bg-primary
            shadow-[0_0_6px_var(--color-primary)]"
          aria-hidden
        />
      )}
    </Link>
  )
}
