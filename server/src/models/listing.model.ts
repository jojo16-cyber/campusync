import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type OpportunityType = 'internship' | 'full_time' | 'internship_and_full_time';
export type WorkArrangement = 'on_site' | 'remote' | 'hybrid';
export type EmploymentType = 'full_time' | 'internship' | 'contract';
export type ListingStatus = 'draft' | 'published' | 'closed';

export interface IListingEligibility {
  minCgpa: number;
  eligibleDepartments: string[];
  eligibleGraduationYears: number[];
  additionalCriteria?: string;
}

export interface IListing extends Document {
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
  eligibility: IListingEligibility;
  applicationOpenDate: Date;
  applicationDeadline: Date;
  status: ListingStatus;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  isExpired(): boolean;
  isOpen(): boolean;
}

const listingEligibilitySchema = new Schema<IListingEligibility>(
  {
    minCgpa: {
      type: Number,
      min: [0, 'Minimum CGPA cannot be negative'],
      max: [10, 'Minimum CGPA cannot exceed 10.0'],
      default: 0,
    },
    eligibleDepartments: {
      type: [String],
      default: [],
    },
    eligibleGraduationYears: {
      type: [Number],
      default: [],
    },
    additionalCriteria: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

const listingSchema = new Schema<IListing>(
  {
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Opportunity title is required'],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Opportunity description is required'],
      trim: true,
    },
    opportunityType: {
      type: String,
      enum: {
        values: ['internship', 'full_time', 'internship_and_full_time'],
        message: 'Invalid opportunity type',
      },
      required: true,
      index: true,
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    workArrangement: {
      type: String,
      enum: {
        values: ['on_site', 'remote', 'hybrid'],
        message: 'Invalid work arrangement',
      },
      required: true,
      default: 'on_site',
    },
    compensation: {
      type: String,
      required: [true, 'Compensation or stipend is required'],
      trim: true,
    },
    employmentType: {
      type: String,
      enum: {
        values: ['full_time', 'internship', 'contract'],
        message: 'Invalid employment type',
      },
      required: true,
      default: 'full_time',
    },
    skillsRequired: {
      type: [String],
      required: true,
      validate: {
        validator: (v: string[]) => Array.isArray(v) && v.length > 0,
        message: 'At least one skill is required',
      },
    },
    responsibilities: {
      type: [String],
      default: [],
    },
    eligibility: {
      type: listingEligibilitySchema,
      required: true,
      default: () => ({ minCgpa: 0, eligibleDepartments: [], eligibleGraduationYears: [] }),
    },
    applicationOpenDate: {
      type: Date,
      default: Date.now,
    },
    applicationDeadline: {
      type: Date,
      required: [true, 'Application deadline is required'],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'published', 'closed'],
        message: 'Invalid listing status',
      },
      default: 'draft',
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
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

// Compound text index for title & company search
listingSchema.index({ title: 'text', companyName: 'text', description: 'text' });
// Compound index for listing query performance
listingSchema.index({ status: 1, applicationDeadline: 1, opportunityType: 1 });

listingSchema.methods.isExpired = function (): boolean {
  return new Date() > this.applicationDeadline;
};

listingSchema.methods.isOpen = function (): boolean {
  return (
    this.status === 'published' &&
    new Date() <= this.applicationDeadline &&
    new Date() >= this.applicationOpenDate
  );
};

export const Listing: Model<IListing> = mongoose.model<IListing>('Listing', listingSchema);
