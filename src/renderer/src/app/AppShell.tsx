import { useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { tools } from '@tools/register'
import { pushRecent } from '@core/recent'
import { ToolNavLink } from './NavLink'
import { CommandPalette } from './CommandPalette'

export function AppShell(): JSX.Element {
  const { pathname } = useLocation()

  useEffect(() => {
    const t = tools.find((t) => t.route === pathname)
    if (t) pushRecent(t.id)
  }, [pathname])

  return (
    <div className="grid h-screen max-lg:grid-cols-[3.5rem_1fr] grid-cols-[15rem_1fr]">
      <nav className="circuit-grid flex flex-col border-r border-base-300 bg-base-100/90 py-5">
        <Link
          to="/"
          className="max-lg:px-2 max-lg:text-sm px-5 pb-4 text-xl font-bold tracking-widest"
        >
          ToolKit
          <span className="mt-0.5 block font-mono text-[11px] font-normal tracking-[0.3em] text-neutral max-lg:hidden">
            DEVELOPER TOOLBOX
          </span>
        </Link>
        <div className="flex-1 overflow-y-auto">
          {tools.length === 0 && <p className="px-5 py-3 text-sm text-neutral">待接入…</p>}
          {tools.map((t) => (
            <ToolNavLink key={t.id} tool={t} />
          ))}
        </div>
        <Link
          to="/settings"
          className="flex justify-between border-t border-base-300 px-5 pt-3 text-sm text-neutral max-lg:justify-center max-lg:px-2"
        >
          <span className="max-lg:hidden">设置</span>
          <span className="max-lg:hidden font-mono text-[11px] tracking-widest">THEME</span>
        </Link>
      </nav>
      <main className="circuit-grid min-w-0 overflow-y-auto">
        <Outlet />
      </main>
      <CommandPalette />
    </div>
  )
}
