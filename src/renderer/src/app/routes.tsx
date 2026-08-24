import { createHashRouter, Navigate } from 'react-router-dom'
import { Home } from '@pages/Home'
import { tools } from '@tools/register'

export const router = createHashRouter([
  { path: '/', element: <Home /> },
  ...tools.map((t) => ({ path: t.route.replace(/^\//, ''), element: <t.component /> })),
  { path: '*', element: <Navigate to="/" replace /> }
])
