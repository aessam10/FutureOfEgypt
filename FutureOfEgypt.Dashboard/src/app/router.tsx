import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { LoginPage } from '../pages/LoginPage';
import { OverviewPage } from '../pages/OverviewPage';
import { EngineersPage } from '../pages/EngineersPage';
import { DevicesPage } from '../pages/DevicesPage';
import { AssignmentsPage } from '../pages/AssignmentsPage';
import { DeviceRequestsPage } from '../pages/DeviceRequestsPage';
import { LiveMapPage } from '../pages/LiveMapPage';
import { ChatPage } from '../pages/ChatPage';
import { AuditLogsPage } from '../pages/AuditLogsPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { routes } from './routes';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to={routes.dashboard} replace />,
  },
  {
    path: routes.login,
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          {
            path: routes.dashboard,
            element: <OverviewPage />,
          },
          {
            path: routes.engineers,
            element: <EngineersPage />,
          },
          {
            path: routes.devices,
            element: <DevicesPage />,
          },
          {
            path: routes.assignments,
            element: <AssignmentsPage />,
          },
          {
            path: routes.deviceRequests,
            element: <DeviceRequestsPage />,
          },
          {
            path: routes.liveMap,
            element: <LiveMapPage />,
          },
          {
            path: routes.chat,
            element: <ChatPage />,
          },
          {
            path: routes.auditLogs,
            element: <AuditLogsPage />,
          },
          {
            path: '*',
            element: <NotFoundPage />,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to={routes.dashboard} replace />,
  },
]);