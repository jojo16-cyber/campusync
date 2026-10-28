import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type ResumeStatus = 'not_uploaded' | 'uploaded' | 'verified';

export interface IStudentProfile extends Document {
  userId: Types.ObjectId;
  phone: string;
  avatarUrl: string;
  institution: string;
  department: string;
  degree: string;
  graduationYear: number | null;
  cgpa: number | null;
  rollNumber: string;
  skills: string[];
  bio: string;
  linkedInUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  resumeStatus: ResumeStatus;
  resumeUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileCompletionResult {
  percentage: number;
  completedFields: string[];
  missingFields: string[];
  isComplete: boolean;
}

const studentProfileSchema = new Schema<IStudentProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    avatarUrl: {
      type: String,
      trim: true,
      default: '',
    },
    institution: {
      type: String,
      trim: true,
      default: '',
    },
    department: {
      type: String,
      trim: true,
      default: '',
    },
    degree: {
      type: String,
      trim: true,
      default: '',
    },
    graduationYear: {
      type: Number,
      default: null,
    },
    cgpa: {
      type: Number,
      min: [0.0, 'CGPA cannot be negative'],
      max: [10.0, 'CGPA cannot exceed 10.0'],
      default: null,
    },
    rollNumber: {
      type: String,
      trim: true,
      default: '',
    },
    skills: {
      type: [String],
      default: [],
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [1000, 'Bio cannot exceed 1000 characters'],
      default: '',
    },
    linkedInUrl: {
      type: String,
      trim: true,
      default: '',
    },
    githubUrl: {
      type: String,
      trim: true,
      default: '',
    },
    portfolioUrl: {
      type: String,
      trim: true,
      default: '',
    },
    resumeStatus: {
      type: String,
      enum: ['not_uploaded', 'uploaded', 'verified'],
      default: 'not_uploaded',
    },
    resumeUrl: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = ret._id ? (ret._id as { toString(): string }).toString() : undefined;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

/**
 * Calculates profile completion percentage based on 10 clearly defined core fields
 */
export const calculateProfileCompletion = (
  profile: Partial<IStudentProfile> | null | undefined,
  userName?: string
): ProfileCompletionResult => {
  const requirements: Array<{ key: string; label: string; check: () => boolean }> = [
    {
      key: 'name',
      label: 'Full Name',
      check: () => Boolean(userName && userName.trim().length > 0),
    },
    {
      key: 'phone',
      label: 'Phone Number',
      check: () => Boolean(profile?.phone && profile.phone.trim().length > 0),
    },
    {
      key: 'rollNumber',
      label: 'Roll / Registration Number',
      check: () => Boolean(profile?.rollNumber && profile.rollNumber.trim().length > 0),
    },
    {
      key: 'institution',
      label: 'Institution / College',
      check: () => Boolean(profile?.institution && profile.institution.trim().length > 0),
    },
    {
      key: 'department',
      label: 'Department / Branch',
      check: () => Boolean(profile?.department && profile.department.trim().length > 0),
    },
    {
      key: 'degree',
      label: 'Degree',
      check: () => Boolean(profile?.degree && profile.degree.trim().length > 0),
    },
    {
      key: 'graduationYear',
      label: 'Graduation Year',
      check: () => typeof profile?.graduationYear === 'number' && profile.graduationYear > 2000,
    },
    {
      key: 'cgpa',
      label: 'Cumulative GPA (CGPA)',
      check: () => typeof profile?.cgpa === 'number' && profile.cgpa >= 0.0 && profile.cgpa <= 10.0,
    },
    {
      key: 'skills',
      label: 'Skills & Proficiencies',
      check: () => Array.isArray(profile?.skills) && profile.skills.length > 0,
    },
    {
      key: 'bio',
      label: 'Short Biography',
      check: () => Boolean(profile?.bio && profile.bio.trim().length >= 10),
    },
  ];

  const completedFields: string[] = [];
  const missingFields: string[] = [];

  requirements.forEach((req) => {
    if (req.check()) {
      completedFields.push(req.label);
    } else {
      missingFields.push(req.label);
    }
  });

  const percentage = Math.round((completedFields.length / requirements.length) * 100);

  return {
    percentage,
    completedFields,
    missingFields,
    isComplete: percentage === 100,
  };
};

export const StudentProfile: Model<IStudentProfile> = mongoose.model<IStudentProfile>(
  'StudentProfile',
  studentProfileSchema
);
