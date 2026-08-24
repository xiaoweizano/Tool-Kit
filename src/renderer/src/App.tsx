import { RouterProvider } from 'react-router-dom'
import { router } from './app/routes'
export function App(): JSX.Element {
  return <RouterProvider router={router} />
}
