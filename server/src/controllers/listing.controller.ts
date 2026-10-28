import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Listing, IListing } from '../models/listing.model';
import { StudentProfile } from '../models/profile.model';
import {
  createListingSchema,
  updateListingSchema,
  updateListingStatusSchema,
  queryListingsSchema,
} from '../validators/listing.validator';
import { evaluateEligibility } from '../utils/eligibility';
import { AppError } from '../utils/appError';
import { successResponse } from '../utils/apiResponse';

export const createListing = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const validated = createListingSchema.parse(req.body);

    const listing = await Listing.create({
      ...validated,
      createdBy: req.user._id,
    });

    res.status(201).json(
      successResponse('Opportunity listing created successfully', {
        listing,
      })
    );
  } catch (error) {
    next(error);
  }
};

export const getListings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const query = queryListingsSchema.parse(req.query);
    const filter: Record<string, unknown> = {};

    // Role-based visibility
    if (req.user.role === 'student') {
      // Students can browse published listings (and view closed/expired listings if requested, but NEVER drafts)
      if (query.status === 'closed') {
        filter.status = 'closed';
      } else {
        filter.status = 'published';
      }
    } else if (req.user.role === 'admin') {
      // Admin can filter by status or view all
      if (query.status && query.status !== 'all') {
        filter.status = query.status;
      }
    }

    // Search by title or company
    if (query.search) {
      const searchRegex = new RegExp(query.search, 'i');
      filter.$or = [
        { companyName: { $regex: searchRegex } },
        { title: { $regex: searchRegex } },
      ];
    }

    // Filter by opportunity type
    if (query.opportunityType) {
      filter.opportunityType = query.opportunityType;
    }

    // Filter by work arrangement
    if (query.workArrangement) {
      filter.workArrangement = query.workArrangement;
    }

    // Filter by department
    if (query.department) {
      const deptRegex = new RegExp(`^${query.department}$`, 'i');
      filter.$and = filter.$and || [];
      (filter.$and as Array<Record<string, unknown>>).push({
        $or: [
          { 'eligibility.eligibleDepartments': { $size: 0 } },
          { 'eligibility.eligibleDepartments': { $regex: deptRegex } },
        ],
      });
    }

    // Filter by graduation year
    if (query.graduationYear) {
      filter.$and = filter.$and || [];
      (filter.$and as Array<Record<string, unknown>>).push({
        $or: [
          { 'eligibility.eligibleGraduationYears': { $size: 0 } },
          { 'eligibility.eligibleGraduationYears': query.graduationYear },
        ],
      });
    }

    // Sorting
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    let sortOptions: Record<string, 1 | -1> = { applicationDeadline: sortOrder };

    if (query.sortBy === 'createdAt') {
      sortOptions = { createdAt: sortOrder };
    } else if (query.sortBy === 'companyName') {
      sortOptions = { companyName: sortOrder };
    } else if (query.sortBy === 'minCgpa') {
      sortOptions = { 'eligibility.minCgpa': sortOrder };
    }

    const total = await Listing.countDocuments(filter);
    const totalPages = Math.ceil(total / query.limit) || 1;
    const skip = (query.page - 1) * query.limit;

    const listings = await Listing.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(query.limit);

    // If requester is a student, attach lightweight eligibility summary to each listing
    let studentProfile = null;
    if (req.user.role === 'student') {
      studentProfile = await StudentProfile.findOne({ userId: req.user._id });
    }

    const formattedListings = listings.map((listingDoc: IListing) => {
      const listingObj = listingDoc.toJSON();
      const isExpired = new Date() > new Date(listingDoc.applicationDeadline);
      const isOpen =
        listingDoc.status === 'published' &&
        !isExpired &&
        new Date() >= new Date(listingDoc.applicationOpenDate);

      let eligibilityPreview = null;
      if (req.user?.role === 'student') {
        const evalResult = evaluateEligibility(studentProfile, listingDoc);
        eligibilityPreview = {
          isEligible: evalResult.isEligible,
          status: evalResult.status,
          summary: evalResult.summary,
        };
      }

      return {
        ...listingObj,
        isExpired,
        isOpen,
        eligibilityPreview,
      };
    });

    res.status(200).json(
      successResponse('Opportunity listings retrieved successfully', {
        listings: formattedListings,
        pagination: {
          total,
          page: query.page,
          limit: query.limit,
          totalPages,
        },
      })
    );
  } catch (error) {
    next(error);
  }
};

export const getListingById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const id = req.params.id;
    if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid opportunity listing ID', 400);
    }

    const listing = await Listing.findById(id);
    if (!listing) {
      throw new AppError('Opportunity listing not found', 404);
    }

    // Students are not permitted to inspect draft listings
    if (listing.status === 'draft' && req.user.role !== 'admin') {
      throw new AppError('Opportunity listing not found', 404);
    }

    const isExpired = new Date() > new Date(listing.applicationDeadline);
    const isOpen =
      listing.status === 'published' &&
      !isExpired &&
      new Date() >= new Date(listing.applicationOpenDate);

    // If student, compute thorough eligibility evaluation
    let eligibilityEvaluation = null;
    if (req.user.role === 'student') {
      const studentProfile = await StudentProfile.findOne({ userId: req.user._id });
      eligibilityEvaluation = evaluateEligibility(studentProfile, listing);
    }

    res.status(200).json(
      successResponse('Opportunity details retrieved successfully', {
        listing: {
          ...listing.toJSON(),
          isExpired,
          isOpen,
        },
        eligibility: eligibilityEvaluation,
      })
    );
  } catch (error) {
    next(error);
  }
};

export const updateListing = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const id = req.params.id;
    if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid opportunity listing ID', 400);
    }

    const validated = updateListingSchema.parse(req.body);

    const listing = await Listing.findByIdAndUpdate(
      id,
      { $set: validated },
      { new: true, runValidators: true }
    );

    if (!listing) {
      throw new AppError('Opportunity listing not found', 404);
    }

    res.status(200).json(
      successResponse('Opportunity listing updated successfully', {
        listing,
      })
    );
  } catch (error) {
    next(error);
  }
};

export const updateListingStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const id = req.params.id;
    if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid opportunity listing ID', 400);
    }

    const { status } = updateListingStatusSchema.parse(req.body);

    const listing = await Listing.findById(id);
    if (!listing) {
      throw new AppError('Opportunity listing not found', 404);
    }

    // Validate status transition
    if (status === 'published' && new Date() > new Date(listing.applicationDeadline)) {
      throw new AppError(
        'Cannot publish listing because application deadline has already passed. Please update the deadline first.',
        400
      );
    }

    listing.status = status;
    await listing.save();

    res.status(200).json(
      successResponse(`Opportunity status transitioned to ${status}`, {
        listing,
      })
    );
  } catch (error) {
    next(error);
  }
};

export const deleteListing = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const id = req.params.id;
    if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid opportunity listing ID', 400);
    }

    const listing = await Listing.findByIdAndDelete(id);
    if (!listing) {
      throw new AppError('Opportunity listing not found', 404);
    }

    res.status(200).json(
      successResponse('Opportunity listing deleted successfully', {
        id,
      })
    );
  } catch (error) {
    next(error);
  }
};
