import { createBrowserRouter, RouterProvider } from 'react-router'
import StringRoutes from '~/Constants/StringRoutes'
import DashboardLayout from '~/layouts/DasboardLayout'
import Dashboard from './Pages/Dashboard'
import ProtectedRoutes from './components/Routes'
import Login from './Pages/Auth/Login' 
import ProjectSelection from './Pages/ProjectSelection'
import TaskEntries from './Pages/TaskEntries'
import TaskEntriesOffline from './Pages/TaskEntriesOffline'
import AdminPage from './Pages/Admin'
import TaskEntriesList from './Pages/TaskEntriesOffline/TaskEntriesList'
import TaskEntryForm from './Pages/TaskEntriesOffline/TaskEntryForm'
import PasaPayroll from './Pages/PasaPayroll'
import ManualDAR from './Pages/ManualDAR'
import OfflineGuide from './Pages/Docs/OfflineGuide'

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
        path: `${StringRoutes.project_selection_task_offline}`,
        Component: TaskEntriesOffline,
      },
      {
        path: `${StringRoutes.project_selection_task_offline_list}/:phaseCode?`,
        Component: TaskEntriesList
      },
      {
        path: `${StringRoutes.project_selection_task_offline_list_form}`,
        Component: TaskEntryForm
      },
      {
        path: `${StringRoutes.project_selection_task_entries}/:phaseCode?`,
        Component: TaskEntries,
      },
      {
        path: `${StringRoutes.files_manual_dar}`,
        Component: ManualDAR
      },
      {
        path: StringRoutes.docs_offline_guide,
        Component: OfflineGuide
      },
      {
        path: StringRoutes.management_pasapayroll,
        Component: PasaPayroll
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
