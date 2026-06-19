import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { routes } from '../app/routes';

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to={routes.login} replace />;
  }

  return <Outlet />;
}