import { Readable } from 'stream';

export interface StorageUploadResult {
  fileId: string;
  filename: string;
  size: number;
}

export interface IResumeStorageService {
  /**
   * Streams a file into persistent document storage.
   */
  uploadStream(
    filename: string,
    stream: Readable,
    metadata?: Record<string, unknown>
  ): Promise<StorageUploadResult>;

  /**
   * Opens a readable stream for a stored document by its storage identifier.
   */
  getDownloadStream(fileId: string): Readable;

  /**
   * Permanently deletes a file and its chunks from storage.
   */
  deleteFile(fileId: string): Promise<boolean>;

  /**
   * Checks whether a file with the given storage identifier exists.
   */
  fileExists(fileId: string): Promise<boolean>;
}
