import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/modules/auth/AuthProvider";
import { canAccessRoute } from "@/lib/panel-role";

export function RoleRoute() {
  const {
    state: { role, isRestoring, isAuthenticated },
  } = useAuth();
  const { pathname } = useLocation();

  if (isRestoring || !isAuthenticated) {
    return null;
  }

  if (!canAccessRoute(role, pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
