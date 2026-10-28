import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  GraduationCap, 
  ShieldCheck, 
  FileText, 
  Briefcase, 
  CheckCircle, 
  Building2, 
  BarChart3, 
  Users,
  ArrowRight
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  const isAdmin = user.role === 'admin';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Welcome Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className={`p-3.5 rounded-2xl text-white shadow-md ${
              isAdmin ? 'bg-purple-600' : 'bg-blue-600'
            }`}>
              {isAdmin ? <ShieldCheck className="w-8 h-8" /> : <GraduationCap className="w-8 h-8" />}
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-2xl font-bold text-slate-900" data-testid="dashboard-welcome">
                  Welcome back, {user.name}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize tracking-wide ${
                    isAdmin
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}
                  data-testid="user-role-badge"
                >
                  {user.role}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Account Email: <span className="font-mono text-slate-700">{user.email}</span> &bull; Role Authorization: <span className="font-medium text-slate-700 capitalize">{user.role}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-500 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Secure JWT Bearer Session Active</span>
          </div>
        </div>
      </div>

      {/* Role-Specific Portal Content */}
      {isAdmin ? (
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-purple-600" />
            <span>Training &amp; Placement Office (TPO) Administration</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">Student Verification</h3>
              <p className="text-xs text-slate-600">
                Review and approve academic records, CGPA submissions, and backlogs for eligible students.
              </p>
              <span className="inline-block mt-4 text-xs font-semibold text-purple-600">
                Phase 3 Module Preview
              </span>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mb-4">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">Company Onboarding &amp; Drives</h3>
                <p className="text-xs text-slate-600">
                  Manage corporate recruiters, publish placement drives, and configure cutoffs.
                </p>
              </div>
              <Link
                to="/listings"
                className="mt-4 inline-flex items-center space-x-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition group"
                data-testid="admin-manage-listings-link"
              >
                <span>Manage Recruitment Drives</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">Placement Statistics</h3>
              <p className="text-xs text-slate-600">
                Export department-wise placement metrics, average package breakdowns, and annual reports.
              </p>
              <span className="inline-block mt-4 text-xs font-semibold text-emerald-600">
                Phase 5 Module Preview
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            <span>Student Placement Workspace</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">Academic Profile &amp; Resume</h3>
                <p className="text-xs text-slate-600">
                  Update verified CGPA, department records, technical skill tags, and placement details.
                </p>
              </div>
              <Link
                to="/profile"
                className="mt-4 inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition group"
                data-testid="dashboard-profile-link"
              >
                <span>Manage Student Profile</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mb-4">
                  <Briefcase className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">Eligible Drives</h3>
                <p className="text-xs text-slate-600">
                  View open recruitment drives matching your department, graduation year, and CGPA criteria.
                </p>
              </div>
              <Link
                to="/listings"
                className="mt-4 inline-flex items-center space-x-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition group"
                data-testid="dashboard-listings-link"
              >
                <span>Browse Opportunities</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">Application Pipeline</h3>
              <p className="text-xs text-slate-600">
                Track interview round stages: online test, technical interview, HR discussion, and offer rollout.
              </p>
              <span className="inline-block mt-4 text-xs font-semibold text-emerald-600">
                Phase 4 Module Preview
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

