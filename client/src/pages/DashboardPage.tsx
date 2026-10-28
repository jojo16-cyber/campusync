import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getDashboardAnalytics,
  DashboardAnalyticsData,
  ApplicationStatus,
} from '../api/analytics';
import {
  GraduationCap,
  ShieldCheck,
  FileText,
  Briefcase,
  CheckCircle,
  Building2,
  BarChart3,
  Users,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  PieChart,
  Layers,
  ChevronRight,
  Clock,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Analytics state for admin
  const [analytics, setAnalytics] = useState<DashboardAnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(isAdmin);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (isManualRefresh = false) => {
    if (!isAdmin) return;

    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await getDashboardAnalytics();
      setAnalytics(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load placement analytics';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchAnalytics();
    }
  }, [isAdmin, fetchAnalytics]);

  if (!user) return null;

  // Format Opportunity Type
  const formatOpportunityType = (type: string) => {
    switch (type) {
      case 'internship':
        return 'Internship';
      case 'full_time':
        return 'Full Time';
      case 'internship_and_full_time':
        return 'Internship + FTE';
      default:
        return type.replace('_', ' ');
    }
  };

  // Helper for Status Badge Styling
  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case 'submitted':
        return {
          label: 'Submitted',
          classes: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-500',
          barColor: 'bg-blue-500',
        };
      case 'under_review':
        return {
          label: 'Under Review',
          classes: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
          barColor: 'bg-amber-500',
        };
      case 'shortlisted':
        return {
          label: 'Shortlisted',
          classes: 'bg-purple-50 text-purple-700 border-purple-200',
          dot: 'bg-purple-500',
          barColor: 'bg-purple-500',
        };
      case 'interview_scheduled':
        return {
          label: 'Interview Scheduled',
          classes: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          dot: 'bg-indigo-500',
          barColor: 'bg-indigo-500',
        };
      case 'selected':
        return {
          label: 'Selected & Offered',
          classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          barColor: 'bg-emerald-500',
        };
      case 'rejected':
        return {
          label: 'Not Selected',
          classes: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
          barColor: 'bg-rose-500',
        };
      case 'withdrawn':
        return {
          label: 'Withdrawn',
          classes: 'bg-slate-100 text-slate-700 border-slate-300',
          dot: 'bg-slate-400',
          barColor: 'bg-slate-400',
        };
      default:
        return {
          label: status,
          classes: 'bg-slate-100 text-slate-700 border-slate-300',
          dot: 'bg-slate-400',
          barColor: 'bg-slate-400',
        };
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Welcome Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div
              className={`p-3.5 rounded-2xl text-white shadow-md ${
                isAdmin ? 'bg-purple-600' : 'bg-blue-600'
              }`}
            >
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
                Account Email: <span className="font-mono text-slate-700">{user.email}</span> &bull; Role Authorization:{' '}
                <span className="font-medium text-slate-700 capitalize">{user.role}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {isAdmin && (
              <button
                onClick={() => fetchAnalytics(true)}
                disabled={loading || refreshing}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl border border-purple-200 transition disabled:opacity-50"
                title="Refresh dashboard metrics"
                data-testid="admin-refresh-analytics-btn"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
              </button>
            )}

            <div className="flex items-center space-x-2 text-xs text-slate-500 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Secure JWT Bearer Session Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Role-Specific Portal Content */}
      {isAdmin ? (
        <div className="space-y-8" data-testid="admin-dashboard-container">
          {/* Header Title with Subtext */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                <BarChart3 className="w-6 h-6 text-purple-600" />
                <span>Placement Intelligence &amp; TPO Analytics</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Live recruitment telemetry, student eligibility progression, and institutional hiring metrics.
              </p>
            </div>
            {analytics?.generatedAt && (
              <span className="text-[11px] text-slate-400" data-testid="analytics-timestamp">
                Last updated: {new Date(analytics.generatedAt).toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* Loading Skeleton */}
          {loading && (
            <div className="space-y-6" data-testid="analytics-loading">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm animate-pulse">
                    <div className="w-10 h-10 bg-slate-200 rounded-xl mb-3"></div>
                    <div className="h-4 bg-slate-200 rounded w-2/3 mb-2"></div>
                    <div className="h-7 bg-slate-200 rounded w-1/3"></div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-pulse h-64"></div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-pulse h-64"></div>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div
              className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-800 flex items-start space-x-3 shadow-sm"
              data-testid="analytics-error"
            >
              <AlertCircle className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-rose-900">Failed to Load Placement Analytics</h3>
                <p className="text-xs text-rose-700 mt-1">{error}</p>
                <button
                  onClick={() => fetchAnalytics()}
                  className="mt-3 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition"
                  data-testid="analytics-retry-btn"
                >
                  Retry Loading
                </button>
              </div>
            </div>
          )}

          {/* Analytics Content */}
          {!loading && !error && analytics && (
            <>
              {/* 1. KPI Cards Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" data-testid="kpi-cards-grid">
                {/* KPI 1: Total Registered Students */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-blue-300 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Total Students
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-900" data-testid="kpi-total-students">
                      {analytics.kpis.totalStudents}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1">
                      <span>Registered candidate pool</span>
                    </p>
                  </div>
                </div>

                {/* KPI 2: Active Opportunities */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Active Drives
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Briefcase className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-900" data-testid="kpi-active-opportunities">
                      {analytics.kpis.activeOpportunities}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1">
                      <span>Open recruitment drives</span>
                    </p>
                  </div>
                </div>

                {/* KPI 3: Total Applications */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-amber-300 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Applications
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-900" data-testid="kpi-total-applications">
                      {analytics.kpis.totalApplications}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1">
                      <span>Submitted across all drives</span>
                    </p>
                  </div>
                </div>

                {/* KPI 4: Selected Students */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-emerald-300 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Selected Students
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-900" data-testid="kpi-selected-students">
                      {analytics.kpis.selectedStudents}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1">
                      <span className="font-semibold text-emerald-700">{analytics.kpis.totalOffers}</span>
                      <span>total job offers</span>
                    </p>
                  </div>
                </div>

                {/* KPI 5: Placement & Selection Rate */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-purple-300 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Placement Rate
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-purple-700" data-testid="kpi-placement-rate">
                      {analytics.kpis.placementRate}%
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1">
                      <span>Selection rate:</span>
                      <span className="font-semibold text-slate-700" data-testid="kpi-selection-rate">
                        {analytics.kpis.selectionRate}%
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Visual Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart 1: Application Status Distribution */}
                <div
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between"
                  data-testid="status-distribution-chart"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                          <PieChart className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">Application Status Distribution</h3>
                          <p className="text-[11px] text-slate-500">Pipeline progression across all candidate submissions</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">
                        {analytics.kpis.totalApplications} Total
                      </span>
                    </div>

                    {/* Stacked Progress Bar */}
                    {analytics.kpis.totalApplications > 0 && (
                      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex mb-5 shadow-inner">
                        {analytics.statusDistribution.map((item) => {
                          if (item.count === 0) return null;
                          const badge = getStatusBadge(item.status);
                          return (
                            <div
                              key={item.status}
                              style={{ width: `${item.percentage}%` }}
                              className={`${badge.barColor} transition-all duration-500`}
                              title={`${item.label}: ${item.count} (${item.percentage}%)`}
                            />
                          );
                        })}
                      </div>
                    )}

                    {/* Status List Breakdown */}
                    <div className="space-y-2.5">
                      {analytics.statusDistribution.map((item) => {
                        const badge = getStatusBadge(item.status);
                        return (
                          <div
                            key={item.status}
                            className="flex items-center justify-between text-xs p-2 rounded-xl hover:bg-slate-50 transition"
                            data-testid={`status-item-${item.status}`}
                          >
                            <div className="flex items-center space-x-2.5 min-w-[140px]">
                              <span className={`w-2.5 h-2.5 rounded-full ${badge.dot}`}></span>
                              <span className="font-medium text-slate-700">{item.label}</span>
                            </div>

                            {/* Proportional visual bar */}
                            <div className="flex-1 mx-4 hidden sm:block">
                              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${badge.barColor} rounded-full transition-all duration-300`}
                                  style={{ width: `${Math.min(item.percentage, 100)}%` }}
                                ></div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 text-right">
                              <span className="font-bold text-slate-900 min-w-[28px]" data-testid={`status-count-${item.status}`}>
                                {item.count}
                              </span>
                              <span className="text-[11px] text-slate-400 min-w-[42px]">
                                ({item.percentage}%)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {analytics.kpis.totalApplications === 0 && (
                    <div className="mt-4 p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      No student applications submitted yet.
                    </div>
                  )}
                </div>

                {/* Chart 2: Company-wise Application Volume */}
                <div
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between"
                  data-testid="company-applications-chart"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">Top Companies by Applications</h3>
                          <p className="text-[11px] text-slate-500">Recruiters attracting the highest student interest</p>
                        </div>
                      </div>
                      <Link
                        to="/listings"
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition"
                        data-testid="admin-manage-listings-link"
                      >
                        All Drives &rarr;
                      </Link>
                    </div>

                    {analytics.companyApplications.length > 0 ? (
                      <div className="space-y-3">
                        {analytics.companyApplications.map((company, index) => {
                          const maxCount = analytics.companyApplications[0]?.applicationCount || 1;
                          const barWidth = Math.max(
                            Math.round((company.applicationCount / maxCount) * 100),
                            4
                          );

                          return (
                            <div
                              key={company.companyName}
                              className="p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition"
                              data-testid={`company-item-${index}`}
                            >
                              <div className="flex items-center justify-between text-xs mb-1.5">
                                <div className="flex items-center space-x-2 font-medium text-slate-800">
                                  <span className="w-5 h-5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-600 flex items-center justify-center">
                                    #{index + 1}
                                  </span>
                                  <span className="font-semibold text-slate-900">{company.companyName}</span>
                                </div>
                                <div className="flex items-center space-x-1.5">
                                  <span className="font-bold text-indigo-600">
                                    {company.applicationCount}
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    {company.applicationCount === 1 ? 'app' : 'apps'} ({company.percentage}%)
                                  </span>
                                </div>
                              </div>

                              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
                                  style={{ width: `${barWidth}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-12 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-medium text-slate-700">No company application data available</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Applications will appear here once candidates apply to active listings.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Recent Applications & Activity Summaries */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Applications Feed (2 Columns) */}
                <div
                  className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6"
                  data-testid="recent-applications-feed"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">Recent Applications</h3>
                        <p className="text-[11px] text-slate-500">Latest student submissions across active and archived drives</p>
                      </div>
                    </div>
                  </div>

                  {analytics.recentApplications.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                            <th className="pb-2.5">Candidate</th>
                            <th className="pb-2.5">Opportunity</th>
                            <th className="pb-2.5">Status</th>
                            <th className="pb-2.5 text-right">Applied</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {analytics.recentApplications.map((app) => {
                            const badge = getStatusBadge(app.status);
                            return (
                              <tr key={app.id} className="hover:bg-slate-50/80 transition" data-testid={`recent-app-row-${app.id}`}>
                                <td className="py-3 pr-3">
                                  <p className="font-semibold text-slate-900 leading-tight">{app.student.name}</p>
                                  <p className="text-[11px] text-slate-400 font-mono">{app.student.email}</p>
                                </td>
                                <td className="py-3 pr-3">
                                  <div className="flex items-center space-x-1.5">
                                    <span className="font-medium text-slate-800">{app.listing.companyName}</span>
                                    <span className="text-slate-400">&bull;</span>
                                    <span className="text-slate-600">{app.listing.title}</span>
                                  </div>
                                  <span className="inline-block mt-0.5 text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                    {formatOpportunityType(app.listing.opportunityType)}
                                  </span>
                                </td>
                                <td className="py-3 pr-3">
                                  <span
                                    className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badge.classes}`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                                    <span>{badge.label}</span>
                                  </span>
                                </td>
                                <td className="py-3 text-right text-slate-500 text-[11px]">
                                  {new Date(app.submittedAt).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-medium text-slate-700">No applications on record</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        When students apply for published roles, they will appear in this timeline.
                      </p>
                    </div>
                  )}
                </div>

                {/* Placement Activity & Drive Summary (1 Column) */}
                <div
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between"
                  data-testid="activity-summary-panel"
                >
                  <div>
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">Placement Activity</h3>
                        <p className="text-[11px] text-slate-500">Campus drives &amp; pipeline overview</p>
                      </div>
                    </div>

                    {/* Breakdown by Opportunity Type */}
                    <div className="mb-6">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
                        Drive Types Breakdown
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-xl">
                          <span className="text-slate-600 font-medium">Internship Drives</span>
                          <span className="font-bold text-slate-900" data-testid="summary-type-internship">
                            {analytics.activitySummary.opportunitiesByType.internship}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-xl">
                          <span className="text-slate-600 font-medium">Full-Time (FTE) Roles</span>
                          <span className="font-bold text-slate-900" data-testid="summary-type-fulltime">
                            {analytics.activitySummary.opportunitiesByType.full_time}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-xl">
                          <span className="text-slate-600 font-medium">Dual (Intern + FTE)</span>
                          <span className="font-bold text-slate-900" data-testid="summary-type-dual">
                            {analytics.activitySummary.opportunitiesByType.internship_and_full_time}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Pipeline Stage Health */}
                    <div>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
                        Hiring Pipeline Velocity
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs p-2 bg-blue-50/60 rounded-xl border border-blue-100">
                          <span className="text-blue-900 font-medium">In Initial Review</span>
                          <span className="font-bold text-blue-800" data-testid="summary-stage-in-review">
                            {analytics.activitySummary.pipelineStages.inReview}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs p-2 bg-purple-50/60 rounded-xl border border-purple-100">
                          <span className="text-purple-900 font-medium">Active Interviewing</span>
                          <span className="font-bold text-purple-800" data-testid="summary-stage-interviewing">
                            {analytics.activitySummary.pipelineStages.interviewing}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs p-2 bg-emerald-50/60 rounded-xl border border-emerald-100">
                          <span className="text-emerald-900 font-medium">Offers Issued</span>
                          <span className="font-bold text-emerald-800" data-testid="summary-stage-selected">
                            {analytics.activitySummary.pipelineStages.selected}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fast Action Links */}
                  <div className="pt-6 border-t border-slate-100 mt-6">
                    <Link
                      to="/listings"
                      className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 shadow-sm transition"
                      data-testid="admin-manage-listings-cta"
                    >
                      <Briefcase className="w-4 h-4" />
                      <span>Manage Corporate Drives</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        /* Student Workspace (Preserved from Phases 1–7) */
        <div data-testid="student-dashboard-container">
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

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-4">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">Application Pipeline</h3>
                <p className="text-xs text-slate-600">
                  Track interview round stages, shortlisted statuses, offers, and manage withdrawals.
                </p>
              </div>
              <Link
                to="/applications"
                className="mt-4 inline-flex items-center space-x-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition group"
                data-testid="dashboard-applications-link"
              >
                <span>View My Applications</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
