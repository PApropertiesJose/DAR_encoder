import { createBrowserRouter, RouterProvider } from 'react-router'
import StringRoutes from '~/Constants/StringRoutes'
import DashboardLayout from '~/layouts/DasboardLayout'
import Dashboard from './Pages/Dashboard'
import ProtectedRoutes from './components/Routes'
import Login from './Pages/Auth/Login' 
import ProjectSelection from './Pages/ProjectSelection'
import TaskEntries from './Pages/TaskEntries'
import AdminPage from './Pages/Admin'

const DASHBOARD_ROUTES = [
  {
    path: '',
    Component: Dashboard,
    children: [
      {
        path: StringRoutes.project_selection,
        Component: ProjectSelection
      },
      {
        path: `${StringRoutes.project_selection_task_entries}/:phaseCode?`,
        Component: TaskEntries,
      }
    ]
  }
]

const router = createBrowserRouter([
  {
    element: <ProtectedRoutes />,
    children: [
      {
        path: StringRoutes.dashboard,
        Component: DashboardLayout,
        children: DASHBOARD_ROUTES
      },
    ]
  },
  {
    path: StringRoutes.login,
    Component: Login,
  },
  {
    path: `${StringRoutes.admin}/:username?`,
    Component: AdminPage
  }

],
  {
    future: {
      v7_startTransition: true,
    },
    basename: '/DAR'
  },
)

export default function Router() {
  return <RouterProvider router={router} />
}
