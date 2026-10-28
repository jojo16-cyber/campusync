import { apiClient } from './client';

export type OpportunityType = 'internship' | 'full_time' | 'internship_and_full_time';
export type WorkArrangement = 'on_site' | 'remote' | 'hybrid';
export type EmploymentType = 'full_time' | 'internship' | 'contract';
export type ListingStatus = 'draft' | 'published' | 'closed';

export interface ListingEligibility {
  minCgpa: number;
  eligibleDepartments: string[];
  eligibleGraduationYears: number[];
  additionalCriteria?: string;
}

export interface EligibilityCriterionResult {
  criterion: string;
  required: string;
  actual: string;
  met: boolean;
}

export interface EligibilityEvaluationResult {
  isEligible: boolean;
  status: 'eligible' | 'ineligible' | 'incomplete_profile';
  summary: string;
  criteria: EligibilityCriterionResult[];
  missingProfileFields: string[];
}

export interface ListingData {
  id: string;
  companyName: string;
  title: string;
  description: string;
  opportunityType: OpportunityType;
  location: string;
  workArrangement: WorkArrangement;
  compensation: string;
  employmentType: EmploymentType;
  skillsRequired: string[];
  responsibilities: string[];
  eligibility: ListingEligibility;
  applicationOpenDate: string;
  applicationDeadline: string;
  status: ListingStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isExpired?: boolean;
  isOpen?: boolean;
  eligibilityPreview?: {
    isEligible: boolean;
    status: 'eligible' | 'ineligible' | 'incomplete_profile';
    summary: string;
  } | null;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListingsQuery {
  search?: string;
  opportunityType?: OpportunityType;
  workArrangement?: WorkArrangement;
  department?: string;
  graduationYear?: number;
  status?: ListingStatus | 'all';
  sortBy?: 'deadline' | 'createdAt' | 'companyName' | 'minCgpa';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ListingsResponseData {
  listings: ListingData[];
  pagination: PaginationMeta;
}

export interface ListingDetailResponseData {
  listing: ListingData;
  eligibility: EligibilityEvaluationResult | null;
}

export interface CreateListingPayload {
  companyName: string;
  title: string;
  description: string;
  opportunityType: OpportunityType;
  location: string;
  workArrangement: WorkArrangement;
  compensation: string;
  employmentType: EmploymentType;
  skillsRequired: string[];
  responsibilities?: string[];
  eligibility: ListingEligibility;
  applicationOpenDate?: string;
  applicationDeadline: string;
  status?: ListingStatus;
}

/**
 * Fetch listings with search, filters, sorting, and pagination
 */
export const fetchListings = async (
  query: ListingsQuery = {}
): Promise<ListingsResponseData> => {
  const response = await apiClient.get('/listings', { params: query });
  if (response.data?.success && response.data?.data) {
    return response.data.data;
  }
  throw new Error(response.data?.message || 'Failed to fetch listings');
};

/**
 * Fetch a single opportunity detail with student eligibility evaluation
 */
export const fetchListingById = async (
  id: string
): Promise<ListingDetailResponseData> => {
  const response = await apiClient.get(`/listings/${id}`);
  if (response.data?.success && response.data?.data) {
    return response.data.data;
  }
  throw new Error(response.data?.message || 'Failed to fetch opportunity details');
};

/**
 * Create a new opportunity (Admin only)
 */
export const createListing = async (
  payload: CreateListingPayload
): Promise<ListingData> => {
  const response = await apiClient.post('/listings', payload);
  if (response.data?.success && response.data?.data?.listing) {
    return response.data.data.listing;
  }
  throw new Error(response.data?.message || 'Failed to create opportunity listing');
};

/**
 * Update an existing opportunity (Admin only)
 */
export const updateListing = async (
  id: string,
  payload: Partial<CreateListingPayload>
): Promise<ListingData> => {
  const response = await apiClient.put(`/listings/${id}`, payload);
  if (response.data?.success && response.data?.data?.listing) {
    return response.data.data.listing;
  }
  throw new Error(response.data?.message || 'Failed to update opportunity listing');
};

/**
 * Transition listing status (draft -> published -> closed) (Admin only)
 */
export const updateListingStatus = async (
  id: string,
  status: ListingStatus
): Promise<ListingData> => {
  const response = await apiClient.patch(`/listings/${id}/status`, { status });
  if (response.data?.success && response.data?.data?.listing) {
    return response.data.data.listing;
  }
  throw new Error(response.data?.message || 'Failed to update listing status');
};

/**
 * Delete an opportunity listing (Admin only)
 */
export const deleteListing = async (id: string): Promise<void> => {
  const response = await apiClient.delete(`/listings/${id}`);
  if (!response.data?.success) {
    throw new Error(response.data?.message || 'Failed to delete listing');
  }
};
