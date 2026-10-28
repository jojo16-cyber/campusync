import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, LogOut, User as UserIcon, LayoutDashboard, Shield, Briefcase, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './NotificationBell';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="p-2 bg-blue-600 rounded-lg text-white shadow-md group-hover:bg-blue-700 transition">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">CampuSync</span>
            <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
              Placement & Internship Portal
            </span>
          </div>
        </Link>

        {/* Navigation & Auth Actions */}
        <nav className="flex items-center space-x-4">
          <Link
            to="/"
            className="text-sm font-medium text-slate-600 hover:text-blue-600 transition"
          >
            Home
          </Link>

          {isAuthenticated && user ? (
            <>
              <Link
                to="/dashboard"
                className="inline-flex items-center space-x-1.5 text-sm font-medium text-slate-700 hover:text-blue-600 transition"
                data-testid="nav-dashboard-link"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>

              <Link
                to="/profile"
                className="inline-flex items-center space-x-1.5 text-sm font-medium text-slate-700 hover:text-blue-600 transition"
                data-testid="nav-profile-link"
              >
                <UserIcon className="w-4 h-4" />
                <span>Profile</span>
              </Link>

              <Link
                to="/listings"
                className="inline-flex items-center space-x-1.5 text-sm font-medium text-slate-700 hover:text-blue-600 transition"
                data-testid="nav-listings-link"
              >
                <Briefcase className="w-4 h-4" />
                <span>Opportunities</span>
              </Link>

              {user.role === 'student' && (
                <Link
                  to="/applications"
                  className="inline-flex items-center space-x-1.5 text-sm font-medium text-slate-700 hover:text-blue-600 transition"
                  data-testid="nav-applications-link"
                >
                  <FileText className="w-4 h-4" />
                  <span>My Applications</span>
                </Link>
              )}

              {/* Notification Bell */}
              <NotificationBell />

              <div className="hidden md:flex items-center space-x-2 pl-3 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div className="text-left text-xs">
                  <p className="font-semibold text-slate-800 leading-tight">{user.name}</p>
                  <span
                    className={`inline-flex items-center font-medium capitalize px-1.5 py-0.2 rounded text-[10px] ${
                      user.role === 'admin'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}
                  >
                    {user.role === 'admin' && <Shield className="w-2.5 h-2.5 mr-0.5" />}
                    {user.role}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg transition"
                data-testid="logout-btn"
                title="Sign out of account"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                to="/login"
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 border border-slate-200 hover:border-blue-300 rounded-lg transition"
                data-testid="nav-login-link"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
                data-testid="nav-register-link"
              >
                Register
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

