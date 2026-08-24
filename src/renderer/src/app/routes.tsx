import { createHashRouter, Navigate } from 'react-router-dom'
import { Home } from '@pages/Home'
import { tools } from '@tools/register'
import { AppShell } from './AppShell'

export const router = createHashRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <Home /> },
      ...tools.map((t) => ({ path: t.route.replace(/^\//, ''), element: <t.component /> })),
      { path: 'settings', lazy: async () => ({ Component: (await import('@pages/Settings')).Settings }) },
      { path: '*', element: <Navigate to="/" replace /> }
    ]
  }
])
