import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '../context/AuthContext';
import { ShieldAlert, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Verifying authentication session...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 bg-white border border-rose-200 rounded-xl shadow-sm text-center">
        <div className="w-12 h-12 mx-auto bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-sm text-slate-600 mb-6">
          Your current account role (<span className="font-semibold">{user.role}</span>) does not have authorization to view this resource.
        </p>
        <a
          href="/dashboard"
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
        >
          Return to Dashboard
        </a>
      </div>
    );
  }

  return <>{children}</>;
};
