import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  fetchMyApplications,
  withdrawApplication,
  StudentApplicationData,
  ApplicationStatus,
} from '../api/applications';
import {
  Briefcase,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Search,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

export const ApplicationsPage: React.FC = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<StudentApplicationData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filtering & search
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Cover letter accordion
  const [expandedCoverLetterId, setExpandedCoverLetterId] = useState<string | null>(null);

  // Withdrawal modal state
  const [appToWithdraw, setAppToWithdraw] = useState<StudentApplicationData | null>(null);
  const [withdrawing, setWithdrawing] = useState<boolean>(false);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyApplications();
      setApplications(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load your applications';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleWithdraw = async () => {
    if (!appToWithdraw) return;
    setWithdrawing(true);
    try {
      await withdrawApplication(appToWithdraw.id);
      setSuccessMessage(`Application for ${appToWithdraw.listing.companyName} withdrawn successfully`);
      setAppToWithdraw(null);
      await loadApplications();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to withdraw application';
      setError(msg);
    } finally {
      setWithdrawing(false);
    }
  };

  // Helper for status styling
  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case 'submitted':
        return {
          label: 'Submitted',
          classes: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-500',
        };
      case 'under_review':
        return {
          label: 'Under Review',
          classes: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
        };
      case 'shortlisted':
        return {
          label: 'Shortlisted',
          classes: 'bg-purple-50 text-purple-700 border-purple-200',
          dot: 'bg-purple-500',
        };
      case 'interview_scheduled':
        return {
          label: 'Interview Scheduled',
          classes: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          dot: 'bg-indigo-500',
        };
      case 'selected':
        return {
          label: 'Selected & Offered',
          classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
        };
      case 'rejected':
        return {
          label: 'Not Selected',
          classes: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
        };
      case 'withdrawn':
        return {
          label: 'Withdrawn',
          classes: 'bg-slate-100 text-slate-600 border-slate-300',
          dot: 'bg-slate-400',
        };
      default:
        return {
          label: status,
          classes: 'bg-slate-100 text-slate-600 border-slate-200',
          dot: 'bg-slate-400',
        };
    }
  };

  // Check if student can withdraw
  const canWithdraw = (status: ApplicationStatus) => {
    return status === 'submitted' || status === 'under_review';
  };

  // Filter applications client-side
  const filteredApplications = applications.filter((app) => {
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      app.listing.companyName.toLowerCase().includes(query) ||
      app.listing.title.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  // KPI counts
  const totalCount = applications.length;
  const inReviewCount = applications.filter((a) =>
    ['submitted', 'under_review'].includes(a.status)
  ).length;
  const shortlistedCount = applications.filter((a) =>
    ['shortlisted', 'interview_scheduled'].includes(a.status)
  ).length;
  const selectedCount = applications.filter((a) => a.status === 'selected').length;

  if (user?.role !== 'student') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 mx-auto bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Student Application Portal</h2>
        <p className="text-sm text-slate-600 mb-6">
          You are signed in with an administrator account. Candidate application management is
          located under the Opportunities section.
        </p>
        <Link
          to="/listings"
          className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition"
        >
          <span>Manage Opportunity Drives</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-sm">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1
                className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight"
                data-testid="applications-heading"
              >
                My Applications
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Track recruitment pipeline progress, interview stages, and manage submissions.
              </p>
            </div>
          </div>
        </div>

        <div>
          <Link
            to="/listings"
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 hover:border-slate-300 transition shadow-sm"
          >
            <Briefcase className="w-4 h-4 text-blue-600" />
            <span>Browse More Opportunities</span>
          </Link>
        </div>
      </div>

      {/* Pipeline Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Applied
            </p>
            <p className="text-2xl font-black text-slate-900 mt-1" data-testid="metric-total">
              {totalCount}
            </p>
          </div>
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              In Review
            </p>
            <p className="text-2xl font-black text-amber-600 mt-1" data-testid="metric-review">
              {inReviewCount}
            </p>
          </div>
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Shortlisted / Rounds
            </p>
            <p className="text-2xl font-black text-purple-600 mt-1" data-testid="metric-shortlisted">
              {shortlistedCount}
            </p>
          </div>
          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Selected Offers
            </p>
            <p className="text-2xl font-black text-emerald-600 mt-1" data-testid="metric-selected">
              {selectedCount}
            </p>
          </div>
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div
          className="mb-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs font-semibold text-emerald-800 flex items-center space-x-2"
          data-testid="applications-success-alert"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div
          className="mb-6 bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs font-semibold text-rose-800 flex items-center justify-between"
          data-testid="applications-error-alert"
        >
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => {
              setError(null);
              loadApplications();
            }}
            className="text-xs underline hover:text-rose-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company or role..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            data-testid="search-applications-input"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All' },
            { id: 'submitted', label: 'Submitted' },
            { id: 'under_review', label: 'Under Review' },
            { id: 'shortlisted', label: 'Shortlisted' },
            { id: 'interview_scheduled', label: 'Interview' },
            { id: 'selected', label: 'Selected' },
            { id: 'rejected', label: 'Not Selected' },
            { id: 'withdrawn', label: 'Withdrawn' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
              data-testid={`filter-status-${tab.id}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse space-y-4 shadow-sm"
            >
              <div className="flex justify-between items-center">
                <div className="h-5 bg-slate-200 rounded w-1/3"></div>
                <div className="h-6 bg-slate-200 rounded-full w-24"></div>
              </div>
              <div className="h-4 bg-slate-100 rounded w-1/2"></div>
              <div className="h-4 bg-slate-100 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      ) : filteredApplications.length === 0 ? (
        <div
          className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm"
          data-testid="empty-applications"
        >
          <div className="w-14 h-14 mx-auto bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mb-4">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No Applications Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
            {search || statusFilter !== 'all'
              ? 'No applications match your active search and filter criteria.'
              : 'You have not submitted any placement or internship applications yet.'}
          </p>
          <Link
            to="/listings"
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 shadow-md transition"
          >
            <Briefcase className="w-4 h-4" />
            <span>Explore Campus Opportunities</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((app) => {
            const badge = getStatusBadge(app.status);
            const isCoverLetterExpanded = expandedCoverLetterId === app.id;
            const withdrawable = canWithdraw(app.status);

            return (
              <div
                key={app.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow transition"
                data-testid={`application-card-${app.id}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center">
                        <Building2 className="w-3.5 h-3.5 mr-1" />
                        {app.listing.companyName}
                      </span>
                      <span className="text-slate-300">&bull;</span>
                      <span className="text-[11px] text-slate-500 capitalize">
                        {app.listing.opportunityType.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                      {app.listing.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 mt-2">
                      <span>Location: {app.listing.location}</span>
                      <span>&bull;</span>
                      <span>Work Mode: {app.listing.workArrangement.replace('_', ' ')}</span>
                      <span>&bull;</span>
                      <span className="font-semibold text-slate-700">
                        Package: {app.listing.compensation}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end gap-2">
                    {/* Status Badge */}
                    <div
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${badge.classes}`}
                      data-testid={`status-badge-${app.id}`}
                    >
                      <span className={`w-2 h-2 rounded-full mr-2 ${badge.dot}`}></span>
                      <span>{badge.label}</span>
                    </div>

                    {/* Submission Date */}
                    <div className="flex items-center text-[11px] text-slate-400">
                      <Calendar className="w-3.5 h-3.5 mr-1" />
                      <span>
                        Applied {new Date(app.submittedAt || app.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions & Optional Cover Letter Toggle */}
                <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-3">
                    {app.coverLetter && (
                      <button
                        onClick={() =>
                          setExpandedCoverLetterId(isCoverLetterExpanded ? null : app.id)
                        }
                        className="inline-flex items-center space-x-1 text-slate-600 hover:text-blue-600 font-medium transition"
                        data-testid={`toggle-statement-${app.id}`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{isCoverLetterExpanded ? 'Hide Statement' : 'View Statement'}</span>
                        {isCoverLetterExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}

                    <Link
                      to="/listings"
                      className="inline-flex items-center space-x-1 text-slate-500 hover:text-slate-800 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Drive Details</span>
                    </Link>
                  </div>

                  <div>
                    {withdrawable ? (
                      <button
                        onClick={() => setAppToWithdraw(app)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                        data-testid={`withdraw-app-btn-${app.id}`}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Withdraw Application</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">
                        {app.status === 'withdrawn'
                          ? 'Application withdrawn'
                          : 'Progressed past withdrawal stage'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expandable Cover Letter */}
                {isCoverLetterExpanded && app.coverLetter && (
                  <div
                    className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700"
                    data-testid={`statement-content-${app.id}`}
                  >
                    <p className="font-bold text-slate-800 mb-1">Your Application Statement:</p>
                    <p className="whitespace-pre-line leading-relaxed">{app.coverLetter}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Withdrawal Confirmation Modal */}
      {appToWithdraw && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          data-testid="withdraw-modal"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 text-center">
            <div className="w-12 h-12 mx-auto bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-3">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Withdraw Application?</h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Are you sure you want to withdraw your application for{' '}
              <strong className="text-slate-800">{appToWithdraw.listing.title}</strong> at{' '}
              <strong className="text-slate-800">{appToWithdraw.listing.companyName}</strong>? Once
              withdrawn, you cannot re-apply to this opportunity.
            </p>
            <div className="flex items-center justify-center space-x-3">
              <button
                type="button"
                onClick={() => setAppToWithdraw(null)}
                disabled={withdrawing}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleWithdraw}
                disabled={withdrawing}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition disabled:opacity-50"
                data-testid="confirm-withdraw-btn"
              >
                {withdrawing ? 'Withdrawing...' : 'Yes, Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationsPage;
