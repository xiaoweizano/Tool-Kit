import { Suspense } from 'react'
import { createHashRouter, Navigate } from 'react-router-dom'
import { Home } from '@pages/Home'
import { tools } from '@tools/register'
import { AppShell } from './AppShell'

export const router = createHashRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <Home /> },
      ...tools.map((t) => ({
        path: t.route.replace(/^\//, ''),
        element: (
          <Suspense fallback={<div className="p-8 font-mono text-sm text-neutral">加载中…</div>}>
            <t.component />
          </Suspense>
        )
      })),
      { path: 'settings', lazy: async () => ({ Component: (await import('@pages/Settings')).Settings }) },
      { path: '*', element: <Navigate to="/" replace /> }
    ]
  }
])
