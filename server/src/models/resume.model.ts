import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IResume extends Document {
  student: Types.ObjectId;
  originalName: string;
  storageFileId: Types.ObjectId;
  storageKey: string;
  mimeType: string;
  fileSize: number;
  version: number;
  isCurrent: boolean;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const resumeSchema = new Schema<IResume>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
      index: true,
    },
    originalName: {
      type: String,
      required: [true, 'Original filename is required'],
      trim: true,
      maxlength: [255, 'Filename cannot exceed 255 characters'],
    },
    storageFileId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Storage file identifier is required'],
      index: true,
    },
    storageKey: {
      type: String,
      required: [true, 'Storage key is required'],
      trim: true,
      unique: true,
    },
    mimeType: {
      type: String,
      required: true,
      default: 'application/pdf',
      enum: ['application/pdf'],
    },
    fileSize: {
      type: Number,
      required: [true, 'File size in bytes is required'],
      min: [1, 'File size must be greater than 0 bytes'],
      max: [5 * 1024 * 1024, 'File size cannot exceed 5 MB'],
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    isCurrent: {
      type: Boolean,
      default: true,
      index: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = ret._id ? (ret._id as { toString(): string }).toString() : undefined;
        delete ret._id;
        delete ret.__v;
        // Never expose raw internal GridFS file IDs to external clients
        delete ret.storageFileId;
        delete ret.storageKey;
        return ret;
      },
    },
  }
);

// Compound index for fast lookup of a student's active resume
resumeSchema.index({ student: 1, isCurrent: 1 });

export const Resume: Model<IResume> = mongoose.model<IResume>('Resume', resumeSchema);
