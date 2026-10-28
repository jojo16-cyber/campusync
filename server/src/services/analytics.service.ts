import { User } from '../models/user.model';
import { Listing } from '../models/listing.model';
import { Application, APPLICATION_STATUSES, ApplicationStatus } from '../models/application.model';

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
  submittedAt: Date;
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

export interface DashboardAnalyticsPayload {
  kpis: DashboardKPIs;
  statusDistribution: StatusDistributionItem[];
  companyApplications: CompanyApplicationItem[];
  recentApplications: RecentApplicationItem[];
  activitySummary: PlacementActivitySummary;
  generatedAt: string;
}

/**
 * Format raw ApplicationStatus into human-readable label.
 */
export function formatStatusLabel(status: ApplicationStatus): string {
  switch (status) {
    case 'submitted':
      return 'Submitted';
    case 'under_review':
      return 'Under Review';
    case 'shortlisted':
      return 'Shortlisted';
    case 'interview_scheduled':
      return 'Interview Scheduled';
    case 'selected':
      return 'Selected / Offered';
    case 'rejected':
      return 'Rejected';
    case 'withdrawn':
      return 'Withdrawn';
    default:
      return status;
  }
}

/**
 * Calculate KPI metrics:
 * - totalStudents: Registered users with role = 'student'
 * - activeOpportunities: Listings with status = 'published' AND applicationDeadline >= now
 * - totalApplications: All application records
 * - selectedStudents: Unique students who received at least one offer (status = 'selected')
 * - totalOffers: Total application records with status = 'selected'
 * - placementRate: (selectedStudents / totalStudents) * 100 (0.0% if totalStudents is 0)
 * - selectionRate: (totalOffers / totalApplications) * 100 (0.0% if totalApplications is 0)
 */
export async function getKPIMetrics(): Promise<DashboardKPIs> {
  const now = new Date();

  const [
    totalStudents,
    activeOpportunities,
    totalApplications,
    distinctSelectedStudents,
    totalOffers,
  ] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    Listing.countDocuments({
      status: 'published',
      applicationDeadline: { $gte: now },
    }),
    Application.countDocuments(),
    Application.distinct('student', { status: 'selected' }),
    Application.countDocuments({ status: 'selected' }),
  ]);

  const selectedStudentsCount = Array.isArray(distinctSelectedStudents)
    ? distinctSelectedStudents.length
    : 0;

  const placementRate =
    totalStudents > 0
      ? Number(((selectedStudentsCount / totalStudents) * 100).toFixed(1))
      : 0;

  const selectionRate =
    totalApplications > 0
      ? Number(((totalOffers / totalApplications) * 100).toFixed(1))
      : 0;

  return {
    totalStudents,
    activeOpportunities,
    totalApplications,
    selectedStudents: selectedStudentsCount,
    totalOffers,
    placementRate,
    selectionRate,
  };
}

/**
 * Calculate application status distribution across all 7 statuses.
 * Handles empty datasets by returning all statuses with count = 0 and percentage = 0.
 */
export async function getStatusDistribution(
  totalApplications: number
): Promise<StatusDistributionItem[]> {
  const statusCounts = await Promise.all(
    APPLICATION_STATUSES.map(async (status) => {
      const count = await Application.countDocuments({ status });
      const percentage =
        totalApplications > 0
          ? Number(((count / totalApplications) * 100).toFixed(1))
          : 0;

      return {
        status,
        label: formatStatusLabel(status),
        count,
        percentage,
      };
    })
  );

  return statusCounts;
}

/**
 * Calculate company-wise application counts sorted by descending volume.
 * Aggregates applications grouped by company name from associated listings.
 */
export async function getCompanyApplicationCounts(
  totalApplications: number
): Promise<CompanyApplicationItem[]> {
  // If Application.aggregate is available (e.g. standard Mongoose model)
  if (typeof Application.aggregate === 'function') {
    try {
      const aggResults = await Application.aggregate([
        {
          $lookup: {
            from: 'listings',
            localField: 'listing',
            foreignField: '_id',
            as: 'listingData',
          },
        },
        { $unwind: '$listingData' },
        {
          $group: {
            _id: '$listingData.companyName',
            applicationCount: { $sum: 1 },
          },
        },
        { $sort: { applicationCount: -1, _id: 1 } },
        { $limit: 10 },
      ]);

      if (Array.isArray(aggResults) && aggResults.length > 0) {
        return aggResults.map((item) => ({
          companyName: (item._id as string) || 'Unknown Company',
          applicationCount: item.applicationCount as number,
          percentage:
            totalApplications > 0
              ? Number(
                  (((item.applicationCount as number) / totalApplications) * 100).toFixed(1)
                )
              : 0,
        }));
      }
    } catch {
      // In case aggregation pipeline fails or in-memory fallback is needed
    }
  }

  // Robust fallback via populate
  const applications = await Application.find({}, 'listing')
    .populate({ path: 'listing', select: 'companyName' })
    .lean();

  const companyMap = new Map<string, number>();

  for (const app of applications) {
    const listing = app.listing as unknown as { companyName?: string };
    if (listing && listing.companyName) {
      const name = listing.companyName.trim();
      companyMap.set(name, (companyMap.get(name) || 0) + 1);
    }
  }

  const sorted = Array.from(companyMap.entries())
    .map(([companyName, applicationCount]) => ({
      companyName,
      applicationCount,
      percentage:
        totalApplications > 0
          ? Number(((applicationCount / totalApplications) * 100).toFixed(1))
          : 0,
    }))
    .sort(
      (a, b) =>
        b.applicationCount - a.applicationCount ||
        a.companyName.localeCompare(b.companyName)
    )
    .slice(0, 10);

  return sorted;
}

/**
 * Retrieve the latest submitted applications with student and listing summaries.
 */
export async function getRecentApplications(
  limit = 10
): Promise<RecentApplicationItem[]> {
  const applications = await Application.find()
    .sort({ submittedAt: -1, createdAt: -1 })
    .limit(limit)
    .populate({
      path: 'student',
      select: 'name email',
    })
    .populate({
      path: 'listing',
      select: 'companyName title opportunityType location',
    });

  return applications.map((app) => {
    const studentObj = app.student as unknown as {
      _id?: { toString(): string };
      id?: string;
      name?: string;
      email?: string;
    };
    const listingObj = app.listing as unknown as {
      _id?: { toString(): string };
      id?: string;
      companyName?: string;
      title?: string;
      opportunityType?: string;
      location?: string;
    };

    const studentId = studentObj?.id || studentObj?._id?.toString() || '';
    const listingId = listingObj?.id || listingObj?._id?.toString() || '';

    return {
      id: app.id || app._id.toString(),
      student: {
        id: studentId,
        name: studentObj?.name || 'Unknown Student',
        email: studentObj?.email || '',
      },
      listing: {
        id: listingId,
        companyName: listingObj?.companyName || 'Unknown Company',
        title: listingObj?.title || 'Unknown Role',
        opportunityType: listingObj?.opportunityType || 'full_time',
        location: listingObj?.location || 'Not Specified',
      },
      status: app.status,
      submittedAt: app.submittedAt || app.createdAt,
    };
  });
}

/**
 * Generate placement activity and pipeline summary.
 */
export async function getPlacementActivitySummary(): Promise<PlacementActivitySummary> {
  const [
    totalListings,
    publishedListings,
    draftListings,
    closedListings,
    internshipCount,
    fullTimeCount,
    dualCount,
    inReviewSubmitted,
    inReviewUnderReview,
    shortlisted,
    interviewing,
    selected,
    rejected,
    withdrawn,
  ] = await Promise.all([
    Listing.countDocuments(),
    Listing.countDocuments({ status: 'published' }),
    Listing.countDocuments({ status: 'draft' }),
    Listing.countDocuments({ status: 'closed' }),
    Listing.countDocuments({ opportunityType: 'internship' }),
    Listing.countDocuments({ opportunityType: 'full_time' }),
    Listing.countDocuments({ opportunityType: 'internship_and_full_time' }),
    Application.countDocuments({ status: 'submitted' }),
    Application.countDocuments({ status: 'under_review' }),
    Application.countDocuments({ status: 'shortlisted' }),
    Application.countDocuments({ status: 'interview_scheduled' }),
    Application.countDocuments({ status: 'selected' }),
    Application.countDocuments({ status: 'rejected' }),
    Application.countDocuments({ status: 'withdrawn' }),
  ]);

  return {
    totalListings,
    publishedListings,
    draftListings,
    closedListings,
    opportunitiesByType: {
      internship: internshipCount,
      full_time: fullTimeCount,
      internship_and_full_time: dualCount,
    },
    pipelineStages: {
      inReview: inReviewSubmitted + inReviewUnderReview,
      interviewing: shortlisted + interviewing,
      selected,
      rejected,
      withdrawn,
    },
  };
}

/**
 * Consolidated dashboard analytics service aggregator.
 */
export async function getCompleteDashboardAnalytics(): Promise<DashboardAnalyticsPayload> {
  const kpis = await getKPIMetrics();

  const [
    statusDistribution,
    companyApplications,
    recentApplications,
    activitySummary,
  ] = await Promise.all([
    getStatusDistribution(kpis.totalApplications),
    getCompanyApplicationCounts(kpis.totalApplications),
    getRecentApplications(10),
    getPlacementActivitySummary(),
  ]);

  return {
    kpis,
    statusDistribution,
    companyApplications,
    recentApplications,
    activitySummary,
    generatedAt: new Date().toISOString(),
  };
}
