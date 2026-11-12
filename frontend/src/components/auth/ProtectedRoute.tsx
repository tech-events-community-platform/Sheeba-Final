import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types/user';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  requireScannerAccess?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, requireScannerAccess }) => {
  const { user, isAuthenticated, role, isLoading } = useAuth();
  const location = useLocation();

  // 1. Wait for session hydration from storage / backend to avoid premature redirect
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F5]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#63474D]/20 border-t-[#63474D] rounded-full animate-spin" />
          <span className="text-xs font-bold text-[#756366]">Loading Sheeba...</span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated: Redirect to login while safely preserving the intended destination
  if (!isAuthenticated || !user || !role) {
    if (allowedRoles && allowedRoles.includes('SPONSOR')) {
      return <Navigate to="/sponsor/auth" replace />;
    }
    const currentPath = location.pathname + location.search;
    const redirectUrl = `/login?redirect=${encodeURIComponent(currentPath)}`;
    return <Navigate to={redirectUrl} replace state={{ from: location }} />;
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

  // Enforce active scanner assignment permission (Specification v2.1)
  // Admins and Organizers have innate gate scanning capability; Attendees require an active assignment.
  if (requireScannerAccess) {
    const isPrivileged = role === 'ADMIN' || role === 'ORGANIZER';
    if (!isPrivileged && !user.hasActiveScannerEvents) {
      return (
        <Navigate
          to="/app"
          replace
          state={{ error: 'You do not have an active scanner assignment for any event.' }}
        />
      );
    }
  }

  return <Outlet />;
};
