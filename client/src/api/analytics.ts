import { apiClient } from './client';

export type ApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'shortlisted'
  | 'interview_scheduled'
  | 'selected'
  | 'rejected'
  | 'withdrawn';

export interface DashboardKPIs {
  totalStudents: number;
  activeOpportunities: number;
  totalApplications: number;
  selectedStudents: number;
  totalOffers: number;
  placementRate: number;
  selectionRate: number;
}

export interface StatusDistributionItem {
  status: ApplicationStatus;
  label: string;
  count: number;
  percentage: number;
}

export interface CompanyApplicationItem {
  companyName: string;
  applicationCount: number;
  percentage: number;
}

export interface RecentApplicationItem {
  id: string;
  student: {
    id: string;
    name: string;
    email: string;
  };
  listing: {
    id: string;
    companyName: string;
    title: string;
    opportunityType: string;
    location: string;
  };
  status: ApplicationStatus;
  submittedAt: string;
}

export interface PlacementActivitySummary {
  totalListings: number;
  publishedListings: number;
  draftListings: number;
  closedListings: number;
  opportunitiesByType: {
    internship: number;
    full_time: number;
    internship_and_full_time: number;
  };
  pipelineStages: {
    inReview: number;
    interviewing: number;
    selected: number;
    rejected: number;
    withdrawn: number;
  };
}

export interface DashboardAnalyticsData {
  kpis: DashboardKPIs;
  statusDistribution: StatusDistributionItem[];
  companyApplications: CompanyApplicationItem[];
  recentApplications: RecentApplicationItem[];
  activitySummary: PlacementActivitySummary;
  generatedAt: string;
}

/**
 * Fetch consolidated dashboard analytics data.
 * Requires admin privileges.
 */
export async function getDashboardAnalytics(): Promise<DashboardAnalyticsData> {
  const response = await apiClient.get<{
    success: boolean;
    data: DashboardAnalyticsData;
  }>('/analytics/dashboard');
  return response.data.data;
}

/**
 * Fetch top-level KPI metrics.
 * Requires admin privileges.
 */
export async function getKPIMetrics(): Promise<DashboardKPIs> {
  const response = await apiClient.get<{
    success: boolean;
    data: DashboardKPIs;
  }>('/analytics/kpis');
  return response.data.data;
}
