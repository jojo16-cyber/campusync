import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type ApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'shortlisted'
  | 'interview_scheduled'
  | 'selected'
  | 'rejected'
  | 'withdrawn';

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'submitted',
  'under_review',
  'shortlisted',
  'interview_scheduled',
  'selected',
  'rejected',
  'withdrawn',
];

export const WITHDRAWABLE_STATUSES: ApplicationStatus[] = [
  'submitted',
  'under_review',
];

/**
 * Valid administrator / TPO status transitions.
 * Terminal states (selected, rejected, withdrawn) do not permit further transitions.
 */
export const VALID_STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  submitted: ['under_review', 'shortlisted', 'rejected'],
  under_review: ['shortlisted', 'interview_scheduled', 'rejected'],
  shortlisted: ['interview_scheduled', 'selected', 'rejected'],
  interview_scheduled: ['shortlisted', 'selected', 'rejected'],
  selected: [],
  rejected: [],
  withdrawn: [],
};

/**
 * Determines whether a requested status transition is permitted.
 */
export function isValidStatusTransition(
  currentStatus: ApplicationStatus,
  targetStatus: ApplicationStatus
): boolean {
  if (currentStatus === targetStatus) return true;
  const allowed = VALID_STATUS_TRANSITIONS[currentStatus];
  return Boolean(allowed && allowed.includes(targetStatus));
}

export interface IApplication extends Document {
  student: Types.ObjectId;
  listing: Types.ObjectId;
  status: ApplicationStatus;
  coverLetter: string;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  canWithdraw(): boolean;
}

const applicationSchema = new Schema<IApplication>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
      index: true,
    },
    listing: {
      type: Schema.Types.ObjectId,
      ref: 'Listing',
      required: [true, 'Listing reference is required'],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: APPLICATION_STATUSES,
        message: '{VALUE} is not a supported application status',
      },
      default: 'submitted',
      required: true,
      index: true,
    },
    coverLetter: {
      type: String,
      trim: true,
      maxlength: [2000, 'Cover letter cannot exceed 2000 characters'],
      default: '',
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      required: true,
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

// Compound unique index ensuring a student cannot apply to the same listing more than once
applicationSchema.index({ student: 1, listing: 1 }, { unique: true });
// Compound index for listing query & status filtering performance
applicationSchema.index({ listing: 1, status: 1 });
// Compound index for student application chronology
applicationSchema.index({ student: 1, createdAt: -1 });

applicationSchema.methods.canWithdraw = function (): boolean {
  return WITHDRAWABLE_STATUSES.includes(this.status);
};

export const Application: Model<IApplication> = mongoose.model<IApplication>(
  'Application',
  applicationSchema
);
