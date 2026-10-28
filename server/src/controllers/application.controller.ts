import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import {
  Application,
  isValidStatusTransition,
} from '../models/application.model';
import { Listing } from '../models/listing.model';
import { StudentProfile } from '../models/profile.model';
import { Resume } from '../models/resume.model';
import { Notification } from '../models/notification.model';
import {
  submitApplicationSchema,
  updateApplicationStatusSchema,
  queryApplicationsSchema,
} from '../validators/application.validator';
import { evaluateEligibility } from '../utils/eligibility';
import { AppError } from '../utils/appError';
import { successResponse } from '../utils/apiResponse';

/**
 * Submit an application to a published recruitment opportunity.
 * Authenticated Student Only.
 */
export const submitApplication = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    if (req.user.role !== 'student') {
      throw new AppError('Only student accounts are eligible to submit applications', 403);
    }

    const { listingId, coverLetter } = submitApplicationSchema.parse(req.body);

    const listing = await Listing.findById(listingId);
    if (!listing) {
      throw new AppError('Opportunity listing not found', 404);
    }

    if (listing.status !== 'published') {
      throw new AppError('This opportunity is not currently open for student applications', 400);
    }

    if (new Date() > new Date(listing.applicationDeadline)) {
      throw new AppError('The application deadline for this opportunity has already passed', 400);
    }

    // Check for prior application submission
    const existingApplication = await Application.findOne({
      student: req.user._id,
      listing: listing._id,
    });
    if (existingApplication) {
      throw new AppError('You have already submitted an application for this opportunity', 409);
    }

    // Verify academic profile eligibility
    const profile = await StudentProfile.findOne({ userId: req.user._id });
    const eligibilityResult = evaluateEligibility(profile, listing);

    if (!eligibilityResult.isEligible) {
      throw new AppError(
        'You do not meet the academic eligibility criteria for this opportunity',
        400,
        {
          eligibility: eligibilityResult,
          missingProfileFields: eligibilityResult.missingProfileFields,
        }
      );
    }

    // Create the application record
    try {
      const application = await Application.create({
        student: req.user._id,
        listing: listing._id,
        coverLetter: coverLetter || '',
        status: 'submitted',
        submittedAt: new Date(),
      });

      res.status(201).json(
        successResponse('Application submitted successfully', {
          application,
        })
      );
    } catch (err: unknown) {
      const mongoErr = err as { code?: number };
      if (mongoErr.code === 11000) {
        throw new AppError('You have already submitted an application for this opportunity', 409);
      }
      throw err;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch all applications submitted by the authenticated student.
 * Authenticated Student Only.
 */
export const getMyApplications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    if (req.user.role !== 'student') {
      throw new AppError('Access forbidden: Only students have personal applications', 403);
    }

    const applications = await Application.find({ student: req.user._id })
      .populate({
        path: 'listing',
        select:
          'companyName title opportunityType location workArrangement compensation status applicationDeadline eligibility',
      })
      .sort({ createdAt: -1 });

    res.status(200).json(
      successResponse('Retrieved student applications successfully', {
        applications,
        count: applications.length,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch a specific application submitted by the authenticated student.
 * Authenticated Student Only.
 */
export const getMyApplicationById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    if (req.user.role !== 'student') {
      throw new AppError('Access forbidden: Only students have personal applications', 403);
    }

    const id = req.params.id;
    if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid application identifier format', 400);
    }

    const application = await Application.findOne({
      _id: id,
      student: req.user._id,
    }).populate({
      path: 'listing',
      select:
        'companyName title description opportunityType location workArrangement compensation skillsRequired status applicationDeadline eligibility',
    });

    if (!application) {
      throw new AppError('Application not found', 404);
    }

    res.status(200).json(
      successResponse('Application details retrieved successfully', {
        application,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Withdraw an eligible application submitted by the authenticated student.
 * Allowed only when in 'submitted' or 'under_review' status.
 */
export const withdrawApplication = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    if (req.user.role !== 'student') {
      throw new AppError('Only students can withdraw their applications', 403);
    }

    const id = req.params.id;
    if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid application identifier format', 400);
    }

    const application = await Application.findOne({
      _id: id,
      student: req.user._id,
    });

    if (!application) {
      throw new AppError('Application not found', 404);
    }

    if (application.status === 'withdrawn') {
      throw new AppError('This application has already been withdrawn', 400);
    }

    if (!application.canWithdraw()) {
      throw new AppError(
        `Cannot withdraw application after it has progressed to '${application.status}' stage. Withdrawals are only allowed while in 'submitted' or 'under_review' status.`,
        400
      );
    }

    application.status = 'withdrawn';
    await application.save();

    res.status(200).json(
      successResponse('Application withdrawn successfully', {
        application,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * List all applicant submissions for a specific listing with pagination and status filtering.
 * Administrator / TPO Only.
 */
export const getListingApplications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    if (req.user.role !== 'admin') {
      throw new AppError('Administrator authorization required to view applicants', 403);
    }

    const listingId = req.params.listingId;
    if (!listingId || typeof listingId !== 'string' || !mongoose.Types.ObjectId.isValid(listingId)) {
      throw new AppError('Invalid listing identifier format', 400);
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
      throw new AppError('Opportunity listing not found', 404);
    }

    const { status, page, limit } = queryApplicationsSchema.parse(req.query);

    const filter: Record<string, unknown> = { listing: listing._id };
    if (status && status !== 'all') {
      filter.status = status;
    }

    const total = await Application.countDocuments(filter);
    const skip = (page - 1) * limit;

    const applications = await Application.find(filter)
      .populate({
        path: 'student',
        select: 'name email role', // Exclude passwordHash and internal auth fields
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Fetch related student profiles for recruitment review
    const studentUserIds = applications.map((app) => {
      const studentObj = app.student as unknown as { _id?: mongoose.Types.ObjectId };
      return studentObj?._id || app.student;
    });

    const studentProfiles = await StudentProfile.find({
      userId: { $in: studentUserIds },
    });

    const activeResumes = await Resume.find({
      student: { $in: studentUserIds },
      isCurrent: true,
    }).select('student originalName fileSize uploadedAt');

    const profileMap = new Map(
      studentProfiles.map((p) => [p.userId.toString(), p])
    );

    const resumeMap = new Map(
      activeResumes.map((r) => [r.student.toString(), r])
    );

    const enrichedApplications = applications.map((app) => {
      const json = app.toJSON();
      const studentObj = app.student as unknown as {
        _id?: mongoose.Types.ObjectId;
        id?: string;
      };
      const studentId = (studentObj?._id || studentObj?.id || app.student)?.toString();
      const prof = studentId ? profileMap.get(studentId) : null;
      const resDoc = studentId ? resumeMap.get(studentId) : null;

      return {
        ...json,
        hasResume: Boolean(resDoc || prof?.resumeStatus === 'uploaded' || prof?.resumeStatus === 'verified'),
        resume: resDoc
          ? {
              originalName: resDoc.originalName,
              fileSize: resDoc.fileSize,
              uploadedAt: resDoc.uploadedAt,
            }
          : null,
        studentProfile: prof
          ? {
              rollNumber: prof.rollNumber,
              department: prof.department,
              degree: prof.degree,
              graduationYear: prof.graduationYear,
              cgpa: prof.cgpa,
              phone: prof.phone,
              skills: prof.skills,
              institution: prof.institution,
              linkedInUrl: prof.linkedInUrl,
              githubUrl: prof.githubUrl,
              portfolioUrl: prof.portfolioUrl,
            }
          : null,
      };
    });

    res.status(200).json(
      successResponse('Retrieved listing applicants successfully', {
        listing: {
          id: listing.id,
          title: listing.title,
          companyName: listing.companyName,
          status: listing.status,
        },
        applications: enrichedApplications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve comprehensive details of an individual application.
 * Administrator / TPO Only.
 */
export const getApplicationById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    if (req.user.role !== 'admin') {
      throw new AppError('Administrator authorization required to inspect application details', 403);
    }

    const id = req.params.id;
    if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid application identifier format', 400);
    }

    const application = await Application.findById(id)
      .populate({
        path: 'student',
        select: 'name email role',
      })
      .populate({
        path: 'listing',
        select:
          'companyName title opportunityType location workArrangement compensation status applicationDeadline eligibility',
      });

    if (!application) {
      throw new AppError('Application not found', 404);
    }

    const studentObj = application.student as unknown as {
      _id?: mongoose.Types.ObjectId;
      id?: string;
    };
    const studentId = (studentObj?._id || studentObj?.id || application.student)?.toString();
    const prof = studentId ? await StudentProfile.findOne({ userId: studentId }) : null;
    const resumeDoc = studentId
      ? await Resume.findOne({ student: studentId, isCurrent: true }).select('originalName fileSize uploadedAt')
      : null;

    res.status(200).json(
      successResponse('Application details retrieved successfully', {
        application: {
          ...application.toJSON(),
          hasResume: Boolean(resumeDoc || prof?.resumeStatus === 'uploaded' || prof?.resumeStatus === 'verified'),
          resume: resumeDoc
            ? {
                originalName: resumeDoc.originalName,
                fileSize: resumeDoc.fileSize,
                uploadedAt: resumeDoc.uploadedAt,
              }
            : null,
          studentProfile: prof
            ? {
                rollNumber: prof.rollNumber,
                department: prof.department,
                degree: prof.degree,
                graduationYear: prof.graduationYear,
                cgpa: prof.cgpa,
                phone: prof.phone,
                skills: prof.skills,
                bio: prof.bio,
                institution: prof.institution,
                linkedInUrl: prof.linkedInUrl,
                githubUrl: prof.githubUrl,
                portfolioUrl: prof.portfolioUrl,
              }
            : null,
        },
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Update candidate application status according to defined lifecycle rules.
 * Administrator / TPO Only.
 */
export const updateApplicationStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    if (req.user.role !== 'admin') {
      throw new AppError('Administrator authorization required to update application status', 403);
    }

    const id = req.params.id;
    if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid application identifier format', 400);
    }

    const { status: targetStatus } = updateApplicationStatusSchema.parse(req.body);

    const application = await Application.findById(id);
    if (!application) {
      throw new AppError('Application not found', 404);
    }

    const previousStatus = application.status;

    if (!isValidStatusTransition(previousStatus, targetStatus)) {
      throw new AppError(
        `Cannot transition application status from '${previousStatus}' to '${targetStatus}'. This status change is not permitted by recruitment lifecycle rules.`,
        400
      );
    }

    if (previousStatus === targetStatus) {
      // Status unchanged: return current record without duplicate notification
      res.status(200).json(
        successResponse(`Application status is already ${targetStatus}`, {
          application,
        })
      );
      return;
    }

    application.status = targetStatus;
    await application.save();

    // Automatically create in-app notification for the applicant
    try {
      const listing = await Listing.findById(application.listing);
      const companyName = listing?.companyName || 'the recruiter';
      const jobTitle = listing?.title || 'the opportunity';

      const statusDisplayNames: Record<string, string> = {
        submitted: 'Submitted',
        under_review: 'Under Review',
        shortlisted: 'Shortlisted',
        interview_scheduled: 'Interview Scheduled',
        selected: 'Selected',
        rejected: 'Rejected',
        withdrawn: 'Withdrawn',
      };
      const readableStatus = statusDisplayNames[targetStatus] || targetStatus;

      await Notification.create({
        recipient: application.student,
        title: `Application Status: ${readableStatus}`,
        message: `Your application for ${jobTitle} at ${companyName} has been updated to "${readableStatus}".`,
        type: 'application_status',
        application: application._id,
        listing: application.listing,
        isRead: false,
      });
    } catch (notifErr) {
      console.error('[Notification] Failed to create status update notification:', notifErr);
    }

    res.status(200).json(
      successResponse(`Application status updated to ${targetStatus}`, {
        application,
      })
    );
  } catch (error) {
    next(error);
  }
};
