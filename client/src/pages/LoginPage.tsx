import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, AlertCircle, ArrowRight, Loader2, GraduationCap } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Retrieve origin route from location state
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      let msg = 'Authentication failed. Please verify credentials.';
      if (err && typeof err === 'object' && 'response' in err) {
        const responseData = (err as { response?: { data?: { message?: string } } }).response?.data;
        if (responseData?.message) {
          msg = responseData.message;
        }
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-2">
          <div className="p-3 bg-blue-600 rounded-xl text-white shadow-md">
            <GraduationCap className="w-8 h-8" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Welcome to CampuSync
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Sign in to access your placement &amp; internship dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-slate-200 sm:rounded-2xl sm:px-10">
          {errorMessage && (
            <div
              className="mb-5 flex items-start space-x-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-800"
              data-testid="login-error"
            >
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-xs">Authentication Error</p>
                <p className="text-xs text-rose-700 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                College / Corporate Email
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@college.edu"
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400 transition"
                  data-testid="login-email-input"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
                >
                  Password
                </label>
              </div>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400 transition"
                  data-testid="login-password-input"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 transition"
                data-testid="login-submit-btn"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200 text-center text-xs text-slate-600">
            <span>Don't have an account yet? </span>
            <Link
              to="/register"
              className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            >
              Register as Student
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
