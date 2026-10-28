import React, { useState, useEffect, useCallback, FormEvent, KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  fetchListings,
  fetchListingById,
  createListing,
  updateListing,
  updateListingStatus,
  deleteListing,
  ListingData,
  EligibilityEvaluationResult,
  OpportunityType,
  WorkArrangement,
  EmploymentType,
  ListingStatus,
  PaginationMeta,
  CreateListingPayload,
} from '../api/listings';
import {
  Briefcase,
  Search,
  Calendar,
  MapPin,
  DollarSign,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Eye,
} from 'lucide-react';

export const ListingsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Data & Pagination state
  const [listings, setListings] = useState<ListingData[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 6,
    totalPages: 1,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search & Filter state
  const [search, setSearch] = useState<string>('');
  const [opportunityType, setOpportunityType] = useState<string>('');
  const [workArrangement, setWorkArrangement] = useState<string>('');
  const [adminStatusTab, setAdminStatusTab] = useState<ListingStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'deadline' | 'createdAt' | 'companyName' | 'minCgpa'>('deadline');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [eligibleOnly, setEligibleOnly] = useState<boolean>(false);

  // Opportunity Detail Modal State
  const [selectedListing, setSelectedListing] = useState<ListingData | null>(null);
  const [selectedEligibility, setSelectedEligibility] = useState<EligibilityEvaluationResult | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  // Create / Edit Modal State (Admin)
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [editingListingId, setEditingListingId] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState<boolean>(false);

  // Form Fields
  const [companyName, setCompanyName] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [formOppType, setFormOppType] = useState<OpportunityType>('full_time');
  const [location, setLocation] = useState<string>('');
  const [formWorkArrangement, setFormWorkArrangement] = useState<WorkArrangement>('on_site');
  const [compensation, setCompensation] = useState<string>('');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('full_time');
  const [skillsRequired, setSkillsRequired] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState<string>('');
  const [minCgpa, setMinCgpa] = useState<string>('0');
  const [eligibleDepartments, setEligibleDepartments] = useState<string>('');
  const [eligibleGraduationYears, setEligibleGraduationYears] = useState<string>('2025, 2026');
  const [additionalCriteria, setAdditionalCriteria] = useState<string>('');
  const [applicationDeadline, setApplicationDeadline] = useState<string>('');
  const [formStatus, setFormStatus] = useState<ListingStatus>('published');
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirmation State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Load listings from backend
  const loadListings = useCallback(async (pageToLoad = 1) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchListings({
        search: search.trim() || undefined,
        opportunityType: (opportunityType as OpportunityType) || undefined,
        workArrangement: (workArrangement as WorkArrangement) || undefined,
        status: isAdmin ? adminStatusTab : undefined,
        sortBy,
        sortOrder,
        page: pageToLoad,
        limit: 6,
      });

      setListings(data.listings);
      setPagination(data.pagination);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load opportunities';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [search, opportunityType, workArrangement, adminStatusTab, sortBy, sortOrder, isAdmin]);

  useEffect(() => {
    loadListings(1);
  }, [loadListings]);

  // Open Listing Detail Modal
  const handleOpenDetail = async (id: string) => {
    setDetailLoading(true);
    setSelectedListing(null);
    setSelectedEligibility(null);
    try {
      const data = await fetchListingById(id);
      setSelectedListing(data.listing);
      setSelectedEligibility(data.eligibility);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load opportunity details';
      setError(msg);
    } finally {
      setDetailLoading(false);
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingListingId(null);
    setCompanyName('');
    setTitle('');
    setDescription('Core engineering opportunity with direct mentorship and campus placement qualification.');
    setFormOppType('full_time');
    setLocation('Bangalore');
    setFormWorkArrangement('on_site');
    setCompensation('15 LPA');
    setEmploymentType('full_time');
    setSkillsRequired(['React', 'Node.js']);
    setSkillInput('');
    setMinCgpa('7.0');
    setEligibleDepartments('Computer Science, Information Technology');
    setEligibleGraduationYears('2025, 2026');
    setAdditionalCriteria('No active academic backlogs');
    // Set default deadline 30 days ahead
    const futureDate = new Date(Date.now() + 30 * 86400000);
    setApplicationDeadline(futureDate.toISOString().slice(0, 10));
    setFormStatus('published');
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: ListingData) => {
    setEditingListingId(item.id);
    setCompanyName(item.companyName);
    setTitle(item.title);
    setDescription(item.description);
    setFormOppType(item.opportunityType);
    setLocation(item.location);
    setFormWorkArrangement(item.workArrangement);
    setCompensation(item.compensation);
    setEmploymentType(item.employmentType);
    setSkillsRequired(item.skillsRequired || []);
    setSkillInput('');
    setMinCgpa(item.eligibility?.minCgpa ? String(item.eligibility.minCgpa) : '0');
    setEligibleDepartments((item.eligibility?.eligibleDepartments || []).join(', '));
    setEligibleGraduationYears((item.eligibility?.eligibleGraduationYears || []).join(', '));
    setAdditionalCriteria(item.eligibility?.additionalCriteria || '');
    setApplicationDeadline(new Date(item.applicationDeadline).toISOString().slice(0, 10));
    setFormStatus(item.status);
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Skills tag handling in modal
  const handleAddSkill = () => {
    const val = skillInput.trim();
    if (!val) return;
    if (!skillsRequired.some((s) => s.toLowerCase() === val.toLowerCase())) {
      setSkillsRequired([...skillsRequired, val]);
    }
    setSkillInput('');
  };

  const handleRemoveSkill = (index: number) => {
    setSkillsRequired(skillsRequired.filter((_, i) => i !== index));
  };

  const handleSkillKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkill();
    }
  };

  // Submit Create or Edit Form
  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (skillsRequired.length === 0) {
      setFormError('Please add at least one required technical skill');
      return;
    }

    const parsedCgpa = parseFloat(minCgpa);
    if (isNaN(parsedCgpa) || parsedCgpa < 0 || parsedCgpa > 10) {
      setFormError('Minimum CGPA must be a valid number between 0.00 and 10.00');
      return;
    }

    const depts = eligibleDepartments
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);

    const gradYears = eligibleGraduationYears
      .split(',')
      .map((y) => parseInt(y.trim(), 10))
      .filter((y) => !isNaN(y) && y >= 2000 && y <= 2040);

    const deadlineDate = new Date(applicationDeadline);
    if (isNaN(deadlineDate.getTime())) {
      setFormError('Please provide a valid application deadline date');
      return;
    }

    setFormSaving(true);

    const payload: CreateListingPayload = {
      companyName: companyName.trim(),
      title: title.trim(),
      description: description.trim(),
      opportunityType: formOppType,
      location: location.trim(),
      workArrangement: formWorkArrangement,
      compensation: compensation.trim(),
      employmentType,
      skillsRequired,
      eligibility: {
        minCgpa: parsedCgpa,
        eligibleDepartments: depts,
        eligibleGraduationYears: gradYears,
        additionalCriteria: additionalCriteria.trim(),
      },
      applicationDeadline: deadlineDate.toISOString(),
      status: formStatus,
    };

    try {
      if (editingListingId) {
        await updateListing(editingListingId, payload);
        setSuccessMessage('Opportunity listing updated successfully');
      } else {
        await createListing(payload);
        setSuccessMessage('Opportunity listing created successfully');
      }

      setIsFormModalOpen(false);
      loadListings(pagination.page);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save opportunity';
      setFormError(msg);
    } finally {
      setFormSaving(false);
    }
  };

  // Quick Status Transition (Publish / Close)
  const handleStatusChange = async (id: string, newStatus: ListingStatus) => {
    try {
      await updateListingStatus(id, newStatus);
      setSuccessMessage(`Listing status updated to ${newStatus}`);
      loadListings(pagination.page);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Status update failed';
      setError(msg);
    }
  };

  // Delete Listing
  const handleDeleteListing = async (id: string) => {
    try {
      await deleteListing(id);
      setSuccessMessage('Listing deleted successfully');
      setDeleteConfirmId(null);
      loadListings(pagination.page);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete listing';
      setError(msg);
    }
  };

  // Filter listings client-side if "Eligible Only" toggle is active
  const displayedListings = eligibleOnly
    ? listings.filter((l) => l.eligibilityPreview?.isEligible)
    : listings;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header & Role Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-sm">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h1
                className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight"
                data-testid="listings-heading"
              >
                Placement &amp; Internship Opportunities
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {isAdmin
                  ? 'Manage recruitment drives, review eligibility parameters, and publish corporate listings.'
                  : 'Explore campus recruitment drives matching your academic profile and skills.'}
              </p>
            </div>
          </div>
        </div>

        {/* Admin Create Opportunity Button */}
        {isAdmin && (
          <div>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md transition"
              data-testid="create-listing-btn"
            >
              <Plus className="w-4 h-4" />
              <span>Post New Opportunity</span>
            </button>
          </div>
        )}
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div
          className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center space-x-3 text-emerald-800 text-sm shadow-sm"
          data-testid="listings-success-alert"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div
          className="mb-6 bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center space-x-3 text-rose-800 text-sm shadow-sm"
          data-testid="listings-error-alert"
        >
          <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Admin Status Tabs */}
      {isAdmin && (
        <div className="flex border-b border-slate-200 mb-6 space-x-6 text-sm font-semibold">
          {(['all', 'published', 'draft', 'closed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setAdminStatusTab(tab)}
              className={`pb-3 capitalize transition border-b-2 flex items-center space-x-1.5 ${
                adminStatusTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
              data-testid={`admin-tab-${tab}`}
            >
              <span>{tab === 'all' ? 'All Drives' : `${tab}s`}</span>
            </button>
          ))}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm mb-8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Search Box */}
          <div className="md:col-span-5 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by company name or role title..."
              className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
              data-testid="search-input"
            />
          </div>

          {/* Opportunity Type Filter */}
          <div className="md:col-span-3">
            <select
              value={opportunityType}
              onChange={(e) => setOpportunityType(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
              data-testid="filter-type"
            >
              <option value="">All Opportunity Types</option>
              <option value="full_time">Full Time Placement</option>
              <option value="internship">Internship Only</option>
              <option value="internship_and_full_time">Internship + PPO / FTE</option>
            </select>
          </div>

          {/* Work Arrangement Filter */}
          <div className="md:col-span-2">
            <select
              value={workArrangement}
              onChange={(e) => setWorkArrangement(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
              data-testid="filter-arrangement"
            >
              <option value="">All Arrangements</option>
              <option value="on_site">On-Site</option>
              <option value="hybrid">Hybrid</option>
              <option value="remote">Remote</option>
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="md:col-span-2">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-');
                setSortBy(sb as 'deadline' | 'createdAt' | 'companyName' | 'minCgpa');
                setSortOrder(so as 'asc' | 'desc');
              }}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
              data-testid="sort-select"
            >
              <option value="deadline-asc">Deadline (Soonest)</option>
              <option value="createdAt-desc">Recently Posted</option>
              <option value="companyName-asc">Company (A-Z)</option>
              <option value="minCgpa-asc">Min CGPA (Lowest)</option>
            </select>
          </div>
        </div>

        {/* Student Specific Toggle: Only Eligible Opportunities */}
        {!isAdmin && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-600">
            <div className="flex items-center space-x-2">
              <label className="flex items-center cursor-pointer space-x-2 select-none">
                <input
                  type="checkbox"
                  checked={eligibleOnly}
                  onChange={(e) => setEligibleOnly(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  data-testid="filter-eligible-only"
                />
                <span className="font-semibold text-slate-800">
                  Show Only Opportunities I am Eligible For
                </span>
              </label>
            </div>
            <span className="text-slate-400">
              Showing {displayedListings.length} of {pagination.total} published drives
            </span>
          </div>
        )}
      </div>

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm animate-pulse space-y-4"
            >
              <div className="h-6 bg-slate-200 rounded w-3/4"></div>
              <div className="h-4 bg-slate-100 rounded w-1/2"></div>
              <div className="h-16 bg-slate-100 rounded"></div>
              <div className="h-8 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && displayedListings.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm max-w-xl mx-auto my-8">
          <div className="w-14 h-14 mx-auto bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
            <Briefcase className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No Opportunities Found</h3>
          <p className="text-xs text-slate-500 mb-6">
            {eligibleOnly
              ? 'None of the current opportunities match your profile parameters. Try disabling the "Eligible Only" filter.'
              : search || opportunityType || workArrangement
              ? 'No listings matched your active filter criteria. Try broadening your search.'
              : 'There are currently no active placement or internship opportunities published.'}
          </p>
          {(search || opportunityType || workArrangement || eligibleOnly) && (
            <button
              onClick={() => {
                setSearch('');
                setOpportunityType('');
                setWorkArrangement('');
                setEligibleOnly(false);
              }}
              className="px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition"
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}

      {/* Listings Grid */}
      {!loading && displayedListings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {displayedListings.map((item, index) => {
            const eligibilityStatus = item.eligibilityPreview?.status;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                data-testid={`listing-card-${index}`}
              >
                <div>
                  {/* Top Bar: Company & Status Badges */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block" data-testid={`listing-company-${index}`}>
                        {item.companyName}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 leading-snug mt-0.5 line-clamp-1" data-testid={`listing-title-${index}`}>
                        {item.title}
                      </h3>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        item.status === 'published' && !item.isExpired
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : item.status === 'draft'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {item.isExpired ? 'Expired' : item.status}
                    </span>
                  </div>

                  {/* Badges: Type, Location, Compensation */}
                  <div className="flex flex-wrap gap-1.5 mb-4 text-[11px] text-slate-600">
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 font-medium capitalize">
                      {item.opportunityType.replace(/_/g, ' ')}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 font-medium capitalize">
                      <MapPin className="w-3 h-3 mr-0.5 text-slate-400" />
                      {item.location} ({item.workArrangement})
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold border border-emerald-100">
                      <DollarSign className="w-3 h-3 mr-0.5 text-emerald-600" />
                      {item.compensation}
                    </span>
                  </div>

                  {/* Skills Chips */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {(item.skillsRequired || []).slice(0, 3).map((skill, sIdx) => (
                      <span
                        key={sIdx}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-100"
                      >
                        {skill}
                      </span>
                    ))}
                    {(item.skillsRequired || []).length > 3 && (
                      <span className="px-1.5 py-0.5 text-[10px] text-slate-400 font-medium">
                        +{item.skillsRequired.length - 3} more
                      </span>
                    )}
                  </div>

                  {/* Student Eligibility Preview Pill */}
                  {!isAdmin && eligibilityStatus && (
                    <div className="mb-4">
                      {eligibilityStatus === 'eligible' && (
                        <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Eligible to Apply</span>
                        </div>
                      )}
                      {eligibilityStatus === 'ineligible' && (
                        <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Not Eligible</span>
                        </div>
                      )}
                      {eligibilityStatus === 'incomplete_profile' && (
                        <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                          <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Incomplete Profile</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Application Deadline */}
                  <div className="flex items-center space-x-1 text-xs text-slate-500 mb-4">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Deadline:{' '}
                      <strong className="text-slate-700 font-medium">
                        {new Date(item.applicationDeadline).toLocaleDateString()}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => handleOpenDetail(item.id)}
                    className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
                    data-testid={`view-detail-btn-${index}`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Details</span>
                  </button>

                  {/* Admin Specific Actions */}
                  {isAdmin && (
                    <div className="flex items-center space-x-2">
                      {item.status === 'draft' && (
                        <button
                          onClick={() => handleStatusChange(item.id, 'published')}
                          className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                          title="Publish Opportunity"
                          data-testid={`admin-publish-btn-${index}`}
                        >
                          Publish
                        </button>
                      )}
                      {item.status === 'published' && (
                        <button
                          onClick={() => handleStatusChange(item.id, 'closed')}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                          title="Close Opportunity"
                          data-testid={`admin-close-btn-${index}`}
                        >
                          Close
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition"
                        title="Edit Opportunity"
                        data-testid={`admin-edit-btn-${index}`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(item.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                        title="Delete Opportunity"
                        data-testid={`admin-delete-btn-${index}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-6">
          <p className="text-xs text-slate-500">
            Page <span className="font-semibold text-slate-800">{pagination.page}</span> of{' '}
            <span className="font-semibold text-slate-800">{pagination.totalPages}</span> &bull; Total{' '}
            <span className="font-semibold text-slate-800">{pagination.total}</span> listings
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => loadListings(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
              data-testid="pagination-prev"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <button
              onClick={() => loadListings(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
              data-testid="pagination-next"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Opportunity Detail & Eligibility Modal */}
      {(selectedListing || detailLoading) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto"
          data-testid="listing-detail-modal"
        >
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 relative">
            {/* Close Button */}
            <button
              onClick={() => {
                setSelectedListing(null);
                setSelectedEligibility(null);
              }}
              className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {detailLoading ? (
              <div className="py-16 text-center animate-pulse">
                <Clock className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-500">Loading opportunity details &amp; eligibility...</p>
              </div>
            ) : selectedListing && (
              <div className="space-y-6">
                {/* Header */}
                <div>
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                    {selectedListing.companyName}
                  </span>
                  <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
                    {selectedListing.title}
                  </h2>
                  <div className="flex flex-wrap gap-2 mt-3 text-xs text-slate-600">
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 font-medium capitalize">
                      {selectedListing.opportunityType.replace(/_/g, ' ')}
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 font-medium capitalize">
                      {selectedListing.workArrangement} &bull; {selectedListing.location}
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 font-semibold border border-emerald-100">
                      {selectedListing.compensation}
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-purple-50 text-purple-800 font-semibold border border-purple-100">
                      Deadline: {new Date(selectedListing.applicationDeadline).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Eligibility Breakdown Card (Student) */}
                {!isAdmin && selectedEligibility && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Candidate Eligibility Evaluation
                      </h4>
                    </div>

                    {/* Overall Status Banner */}
                    {selectedEligibility.status === 'eligible' && (
                      <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-3 text-emerald-900 text-xs" data-testid="eligibility-status-banner">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        <div>
                          <p className="font-bold">You are eligible to apply for this position!</p>
                          <p className="text-emerald-700 mt-0.5">
                            Your academic records, department, and graduation year qualify for this drive.
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedEligibility.status === 'ineligible' && (
                      <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3 text-rose-900 text-xs" data-testid="eligibility-status-banner">
                        <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                        <div>
                          <p className="font-bold">You do not meet one or more required criteria.</p>
                          <p className="text-rose-700 mt-0.5">
                            Review the requirement breakdown below to see which parameters did not meet cutoff.
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedEligibility.status === 'incomplete_profile' && (
                      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-3 text-amber-900 text-xs" data-testid="eligibility-status-banner">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                        <div>
                          <p className="font-bold">Incomplete Student Profile</p>
                          <p className="text-amber-700 mt-0.5">
                            Missing required records: {selectedEligibility.missingProfileFields.join(', ')}.
                          </p>
                          <Link
                            to="/profile"
                            className="inline-flex items-center space-x-1 mt-2 text-xs font-semibold text-amber-900 underline hover:text-amber-950"
                            data-testid="incomplete-profile-link"
                          >
                            <span>Complete Your Profile Now</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* Criteria Checklist */}
                    {selectedEligibility.criteria.length > 0 && (
                      <div className="space-y-2 pt-2" data-testid="eligibility-criteria-list">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                          Criteria Checklist:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selectedEligibility.criteria.map((c, idx) => (
                            <div
                              key={idx}
                              className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                                c.met
                                  ? 'bg-white border-emerald-200 text-slate-800'
                                  : 'bg-white border-rose-200 text-slate-800'
                              }`}
                            >
                              <div>
                                <p className="font-semibold">{c.criterion}</p>
                                <p className="text-[11px] text-slate-500">
                                  Req: <span className="font-mono">{c.required}</span> &bull; You: <span className="font-mono">{c.actual}</span>
                                </p>
                              </div>
                              {c.met ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 ml-2" />
                              ) : (
                                <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 ml-2" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Job Description */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Role Description
                  </h4>
                  <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">
                    {selectedListing.description}
                  </p>
                </div>

                {/* Technical Skills Required */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Required Skills &amp; Proficiencies
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedListing.skillsRequired.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-lg text-xs font-medium bg-purple-50 text-purple-900 border border-purple-200"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Phase 5 Notice for Students */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between">
                  <div>
                    <span className="font-bold">Formal Application Submissions:</span>
                    <p className="text-blue-700 mt-0.5">
                      Direct single-click applications and candidate tracking will be activated in{' '}
                      <strong>Phase 5</strong>.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-white rounded-md text-[10px] font-bold text-blue-800 border border-blue-200 uppercase tracking-wider">
                    Phase 5 Preview
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Create / Edit Modal Form */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 relative">
            <button
              onClick={() => setIsFormModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              aria-label="Close form"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-900">
                {editingListingId ? 'Edit Opportunity Listing' : 'Post New Campus Opportunity'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure corporate job parameters, eligibility cutoffs, and deadlines.
              </p>
            </div>

            {formError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Company Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Microsoft"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    data-testid="input-company-name"
                  />
                </div>

                {/* Job Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Opportunity Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Software Engineer 1"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    data-testid="input-title"
                  />
                </div>

                {/* Opportunity Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Opportunity Type *
                  </label>
                  <select
                    value={formOppType}
                    onChange={(e) => setFormOppType(e.target.value as OpportunityType)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="full_time">Full Time Placement</option>
                    <option value="internship">Internship Only</option>
                    <option value="internship_and_full_time">Internship + FTE Conversion</option>
                  </select>
                </div>

                {/* Work Arrangement */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Work Arrangement *
                  </label>
                  <select
                    value={formWorkArrangement}
                    onChange={(e) => setFormWorkArrangement(e.target.value as WorkArrangement)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="on_site">On-Site</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="remote">Remote</option>
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Bangalore / Hyderabad"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                {/* Compensation */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Compensation / Stipend *
                  </label>
                  <input
                    type="text"
                    required
                    value={compensation}
                    onChange={(e) => setCompensation(e.target.value)}
                    placeholder="e.g. 14 LPA or ₹35,000/mo"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Description *
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Outline the responsibilities, project scope, and expectations..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              {/* Skills Tag Management */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Required Skills *
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleSkillKeyDown}
                    placeholder="Type skill and press Enter"
                    className="flex-1 px-3.5 py-1.5 text-xs rounded-xl border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-3 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-semibold"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 p-2 bg-slate-50 rounded-xl border border-slate-200 min-h-[36px]">
                  {skillsRequired.map((skill, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center space-x-1 px-2 py-0.5 bg-white border border-purple-200 rounded text-xs text-purple-900"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(idx)}
                        className="text-purple-400 hover:text-rose-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Eligibility Parameters */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Eligibility Cutoffs &amp; Criteria
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Min CGPA (0 - 10)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      value={minCgpa}
                      onChange={(e) => setMinCgpa(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                      data-testid="input-min-cgpa"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Eligible Departments
                    </label>
                    <input
                      type="text"
                      value={eligibleDepartments}
                      onChange={(e) => setEligibleDepartments(e.target.value)}
                      placeholder="e.g. Computer Science, IT"
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Eligible Batches (Years)
                    </label>
                    <input
                      type="text"
                      value={eligibleGraduationYears}
                      onChange={(e) => setEligibleGraduationYears(e.target.value)}
                      placeholder="e.g. 2025, 2026"
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Application Deadline & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Application Deadline *
                  </label>
                  <input
                    type="date"
                    required
                    value={applicationDeadline}
                    onChange={(e) => setApplicationDeadline(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                    data-testid="input-deadline"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Initial Status *
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as ListingStatus)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="published">Published (Visible to students)</option>
                    <option value="draft">Draft (Visible only to admins)</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  disabled={formSaving}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition disabled:opacity-50"
                  data-testid="submit-listing-btn"
                >
                  {formSaving ? 'Saving...' : editingListingId ? 'Update Opportunity' : 'Create Opportunity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 text-center">
            <div className="w-12 h-12 mx-auto bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Delete Opportunity?</h3>
            <p className="text-xs text-slate-500 mb-5">
              Are you sure you want to delete this listing? This action cannot be undone.
            </p>
            <div className="flex items-center justify-center space-x-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteListing(deleteConfirmId)}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition"
                data-testid="confirm-delete-btn"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
