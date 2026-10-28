import React, { useState } from 'react';
import { 
  Briefcase, 
  GraduationCap, 
  Building2, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Server,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface HealthData {
  status: string;
  uptimeSeconds: number;
  environment: string;
  timestamp: string;
  services: {
    server: string;
    database: {
      status: string;
      readyState: number;
    };
  };
  version: string;
}

export const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/health');
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setHealthData(data.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reach API server';
      setError(message);
      setHealthData(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-grow">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl tracking-tight leading-tight">
          Campus Placement &amp; Internship Management
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          A centralized digital platform connecting undergraduate and postgraduate students, corporate recruiters, and college placement officers.
        </p>

        <div className="mt-8 flex justify-center space-x-4">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center space-x-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md transition"
            >
              <span>Go to Your Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="inline-flex items-center space-x-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md transition"
              >
                <span>Student Registration</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl border border-slate-300 shadow-sm transition"
              >
                Sign In
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Student Opportunities</h3>
          <p className="text-sm text-slate-600">
            Personalized profiles, resume management, eligible drive registrations, and real-time application tracking.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mb-4">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Recruiter Portal</h3>
          <p className="text-sm text-slate-600">
            Drive creation, applicant screening, interview stage scheduling, and digital offer rollout.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-4">
            <Briefcase className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">TPO Administration</h3>
          <p className="text-sm text-slate-600">
            Department-wise analytics, eligibility verification, company onboarding, and compliance reporting.
          </p>
        </div>
      </div>

      {/* System Diagnostics / Backend Health Check Panel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center space-x-2">
            <Server className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">System Diagnostics</h2>
          </div>
          <button
            onClick={checkHealth}
            disabled={isLoading}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-medium rounded-md shadow-sm transition"
            data-testid="health-btn"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Checking...' : 'Check Server Health'}</span>
          </button>
        </div>

        {healthData && (
          <div className="space-y-3" data-testid="health-result">
            <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="font-semibold">Backend Status: Operational</span>
              </div>
              <span className="text-xs bg-emerald-100 px-2 py-0.5 rounded font-mono">
                {healthData.environment}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-500 block">Server Uptime</span>
                <span className="font-semibold text-slate-800">{healthData.uptimeSeconds} seconds</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-500 block">Database Status</span>
                <span className="font-semibold text-slate-800 capitalize">
                  {healthData.services.database.status} (State: {healthData.services.database.readyState})
                </span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start space-x-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-800" data-testid="health-error">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Connection Error</p>
              <p className="text-xs text-rose-600 mt-0.5">{error}</p>
              <p className="text-xs text-rose-500 mt-1">Ensure the backend server is running on port 5001.</p>
            </div>
          </div>
        )}

        {!healthData && !error && (
          <div className="text-center py-6 text-sm text-slate-500">
            <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-pulse" />
            Click the button above to verify API connectivity and database readiness.
          </div>
        )}
      </div>
    </div>
  );
};

