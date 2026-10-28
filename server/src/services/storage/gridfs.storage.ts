import mongoose from 'mongoose';
import { Readable } from 'stream';
import { IResumeStorageService, StorageUploadResult } from './storage.interface';

export class GridFSResumeStorageService implements IResumeStorageService {
  private bucketName: string;

  constructor(bucketName = 'resumes') {
    this.bucketName = bucketName;
  }

  private getBucket(): mongoose.mongo.GridFSBucket {
    if (!mongoose.connection.db) {
      throw new Error('MongoDB connection is not established. Cannot access GridFS bucket.');
    }
    return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: this.bucketName,
    });
  }

  public async uploadStream(
    filename: string,
    stream: Readable,
    metadata?: Record<string, unknown>
  ): Promise<StorageUploadResult> {
    const bucket = this.getBucket();

    return new Promise((resolve, reject) => {
      const uploadStream = bucket.openUploadStream(filename, {
        metadata: {
          ...metadata,
          contentType: 'application/pdf',
          uploadedAt: new Date(),
        },
      });

      stream.on('error', (err) => {
        uploadStream.abort().catch(() => {});
        reject(err);
      });

      uploadStream.on('error', (err) => {
        reject(err);
      });

      uploadStream.on('finish', () => {
        resolve({
          fileId: uploadStream.id.toString(),
          filename,
          size: uploadStream.length,
        });
      });

      stream.pipe(uploadStream);
    });
  }

  public getDownloadStream(fileId: string): Readable {
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      throw new Error(`Invalid GridFS file identifier: ${fileId}`);
    }
    const bucket = this.getBucket();
    return bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
  }

  public async deleteFile(fileId: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return false;
    }
    const bucket = this.getBucket();
    try {
      await bucket.delete(new mongoose.Types.ObjectId(fileId));
      return true;
    } catch (err: unknown) {
      // If file does not exist in GridFS, return false without throwing
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('FileNotFound') || msg.includes('not found')) {
        return false;
      }
      throw err;
    }
  }

  public async fileExists(fileId: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return false;
    }
    const bucket = this.getBucket();
    const files = await bucket
      .find({ _id: new mongoose.Types.ObjectId(fileId) })
      .limit(1)
      .toArray();
    return files.length > 0;
  }
}

// Singleton storage service instance
export const resumeStorageService: IResumeStorageService = new GridFSResumeStorageService();
