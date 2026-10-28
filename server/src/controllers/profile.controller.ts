import { Request, Response, NextFunction } from 'express';
import { StudentProfile, calculateProfileCompletion } from '../models/profile.model';
import { updateProfileSchema } from '../validators/profile.validator';
import { AppError } from '../utils/appError';
import { successResponse } from '../utils/apiResponse';

export const getMyProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    let profile = await StudentProfile.findOne({ userId: req.user._id });

    // Initialize profile if not yet created for this user
    if (!profile) {
      profile = await StudentProfile.create({
        userId: req.user._id,
      });
    }

    const completion = calculateProfileCompletion(profile, req.user.name);

    const mergedData = {
      id: profile._id.toString(),
      userId: req.user._id.toString(),
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      phone: profile.phone || '',
      avatarUrl: profile.avatarUrl || '',
      institution: profile.institution || '',
      department: profile.department || '',
      degree: profile.degree || '',
      graduationYear: profile.graduationYear,
      cgpa: profile.cgpa,
      rollNumber: profile.rollNumber || '',
      skills: profile.skills || [],
      bio: profile.bio || '',
      linkedInUrl: profile.linkedInUrl || '',
      githubUrl: profile.githubUrl || '',
      portfolioUrl: profile.portfolioUrl || '',
      resumeStatus: profile.resumeStatus,
      resumeUrl: profile.resumeUrl || '',
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };

    res.status(200).json(
      successResponse('Student profile retrieved successfully', {
        profile: mergedData,
        completion,
      })
    );
  } catch (error) {
    next(error);
  }
};

export const updateMyProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    // Validate body (and guard against mass assignment of sensitive fields)
    const validated = updateProfileSchema.parse(req.body);

    // If student updated full name, update corresponding User document
    if (validated.name && validated.name !== req.user.name) {
      req.user.name = validated.name;
      await req.user.save();
    }

    // Explicitly pick and set only safe profile attributes
    const safeUpdateData = {
      phone: validated.phone ?? '',
      avatarUrl: validated.avatarUrl ?? '',
      institution: validated.institution ?? '',
      department: validated.department ?? '',
      degree: validated.degree ?? '',
      graduationYear: validated.graduationYear ?? null,
      cgpa: validated.cgpa ?? null,
      rollNumber: validated.rollNumber ?? '',
      skills: validated.skills ?? [],
      bio: validated.bio ?? '',
      linkedInUrl: validated.linkedInUrl ?? '',
      githubUrl: validated.githubUrl ?? '',
      portfolioUrl: validated.portfolioUrl ?? '',
    };

    const profile = await StudentProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: safeUpdateData },
      { new: true, upsert: true, runValidators: true }
    );

    const completion = calculateProfileCompletion(profile, req.user.name);

    const mergedData = {
      id: profile._id.toString(),
      userId: req.user._id.toString(),
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      phone: profile.phone || '',
      avatarUrl: profile.avatarUrl || '',
      institution: profile.institution || '',
      department: profile.department || '',
      degree: profile.degree || '',
      graduationYear: profile.graduationYear,
      cgpa: profile.cgpa,
      rollNumber: profile.rollNumber || '',
      skills: profile.skills || [],
      bio: profile.bio || '',
      linkedInUrl: profile.linkedInUrl || '',
      githubUrl: profile.githubUrl || '',
      portfolioUrl: profile.portfolioUrl || '',
      resumeStatus: profile.resumeStatus,
      resumeUrl: profile.resumeUrl || '',
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };

    res.status(200).json(
      successResponse('Student profile updated successfully', {
        profile: mergedData,
        completion,
      })
    );
  } catch (error) {
    next(error);
  }
};
