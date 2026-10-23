import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types/user';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user || !role) {
    if (allowedRoles && allowedRoles.includes('SPONSOR')) {
      return <Navigate to="/sponsor/auth" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  // Enforce mandatory password change for newly registered accounts with temporary initial password
  if (user.mustChangePassword) {
    const isChangePasswordRoute = location.pathname.includes('/change-password');
    if (!isChangePasswordRoute) {
      return <Navigate to="/app/change-password" replace />;
    }
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect wrong role to their own dashboard
    if (role === 'ORGANIZER') {
      return <Navigate to="/organizer" replace />;
    } else if (role === 'ADMIN') {
      return <Navigate to="/admin" replace />;
    } else if (role === 'SPONSOR') {
      return <Navigate to="/sponsor" replace />;
    } else {
      return <Navigate to="/app" replace />;
    }
  }

  return <Outlet />;
};
