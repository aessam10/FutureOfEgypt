import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { routes } from '../app/routes';

function canAccessDashboard(roles: string[]) {
  return roles.some((role) => {
    const normalizedRole = role.toLowerCase();

    return normalizedRole === 'admin' || normalizedRole === 'manager';
  });
}

export function ProtectedRoute() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to={routes.login} replace />;
  }

  if (!canAccessDashboard(user.roles)) {
    void logout();
    return <Navigate to={routes.login} replace />;
  }

  return <Outlet />;
}