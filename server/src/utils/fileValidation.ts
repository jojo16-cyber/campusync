import fs from 'fs';
import path from 'path';
import { Buffer } from 'node:buffer';

export const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_MIME_TYPES = ['application/pdf'];
export const PDF_MAGIC_BYTES = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]); // "%PDF-"

export interface FileValidationResult {
  isValid: boolean;
  errorCode?: 400 | 413 | 415;
  errorMessage?: string;
  sanitizedFilename?: string;
}

/**
 * Strips directory traversal, special characters, and non-printable characters
 * from the display filename while preserving a clean .pdf extension.
 */
export const sanitizeDisplayFilename = (rawName?: string | null): string => {
  if (!rawName || typeof rawName !== 'string') {
    return 'resume.pdf';
  }

  // Remove any path traversal components
  let basename = path.basename(rawName).trim();

  // Strip null bytes and non-printable control characters
  basename = basename
    .split('')
    .filter((c) => {
      const code = c.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('');

  // Strip directory separators explicitly
  basename = basename.replace(/[/\\]/g, '_');

  // Remove any character that isn't alphanumeric, space, dot, underscore, or hyphen
  basename = basename.replace(/[^a-zA-Z0-9._ -]/g, '_');

  // Collapse multiple underscores or spaces
  basename = basename.replace(/[ _]{2,}/g, '_');

  // Ensure it has .pdf extension
  const ext = path.extname(basename).toLowerCase();
  let nameWithoutExt = basename.slice(0, basename.length - ext.length);
  if (nameWithoutExt.length > 100) {
    nameWithoutExt = nameWithoutExt.substring(0, 100);
  }

  if (!nameWithoutExt || nameWithoutExt === '.') {
    nameWithoutExt = 'student_resume';
  }

  return `${nameWithoutExt}.pdf`;
};

/**
 * Sanitizes a filename for inclusion in the Content-Disposition HTTP header
 * to strictly prevent HTTP Response Splitting and Header Injection attacks.
 */
export const sanitizeHeaderFilename = (name: string): string => {
  const display = sanitizeDisplayFilename(name);
  // ASCII only, no quotes, no newlines
  const asciiSafe = display.replace(/[^a-zA-Z0-9._-]/g, '_');
  return asciiSafe || 'resume.pdf';
};

/**
 * Inspects a temporary file on disk to verify it is an authentic, non-empty PDF document.
 * Reads the magic signature bytes without loading the entire file into memory.
 */
export const validatePdfFile = async (
  filepath: string,
  originalFilename?: string | null,
  mimetype?: string | null,
  fileSize?: number
): Promise<FileValidationResult> => {
  // 1. Check file existence
  if (!fs.existsSync(filepath)) {
    return {
      isValid: false,
      errorCode: 400,
      errorMessage: 'Uploaded file could not be read from temporary storage.',
    };
  }

  // 2. Check file size
  const stats = await fs.promises.stat(filepath);
  const size = typeof fileSize === 'number' && fileSize > 0 ? fileSize : stats.size;

  if (size === 0) {
    return {
      isValid: false,
      errorCode: 400,
      errorMessage: 'Uploaded file is empty (0 bytes). Please upload a valid PDF document.',
    };
  }

  if (size > MAX_RESUME_SIZE_BYTES) {
    return {
      isValid: false,
      errorCode: 413,
      errorMessage: `File size exceeds the 5 MB maximum limit (${(size / (1024 * 1024)).toFixed(2)} MB uploaded).`,
    };
  }

  // 3. Check filename extension
  const cleanName = sanitizeDisplayFilename(originalFilename);
  if (!cleanName.toLowerCase().endsWith('.pdf')) {
    return {
      isValid: false,
      errorCode: 415,
      errorMessage: 'Invalid file extension. Only .pdf files are supported.',
    };
  }

  // 4. Check declared MIME type
  if (mimetype && mimetype.toLowerCase() !== 'application/pdf') {
    return {
      isValid: false,
      errorCode: 415,
      errorMessage: `Unsupported media type: '${mimetype}'. Only 'application/pdf' documents are allowed.`,
    };
  }

  // 5. Inspect actual file signature (magic bytes) at byte offset 0
  let fileHandle: fs.promises.FileHandle | null = null;
  try {
    fileHandle = await fs.promises.open(filepath, 'r');
    const headerBuffer = Buffer.alloc(10);
    const { bytesRead: headerBytesRead } = await fileHandle.read(headerBuffer, 0, 10, 0);

    if (headerBytesRead < 5) {
      return {
        isValid: false,
        errorCode: 400,
        errorMessage: 'File is too small to contain a valid PDF structure.',
      };
    }

    // Check for %PDF- at offset 0
    const hasPdfMagic = headerBuffer.subarray(0, 5).equals(PDF_MAGIC_BYTES);
    if (!hasPdfMagic) {
      return {
        isValid: false,
        errorCode: 415,
        errorMessage: 'File content does not match a valid PDF document signature (corrupted or disguised file).',
      };
    }

    // 6. Check for %%EOF marker within the last 1024 bytes (or full file if small)
    const readLength = Math.min(1024, size);
    const trailerBuffer = Buffer.alloc(readLength);
    const trailerOffset = Math.max(0, size - readLength);
    await fileHandle.read(trailerBuffer, 0, readLength, trailerOffset);

    const trailerStr = trailerBuffer.toString('binary');
    if (!trailerStr.includes('%%EOF') && !trailerStr.includes('%EOF')) {
      return {
        isValid: false,
        errorCode: 400,
        errorMessage: 'Malformed PDF document: missing end-of-file (%%EOF) marker.',
      };
    }

    return {
      isValid: true,
      sanitizedFilename: cleanName,
    };
  } catch (error) {
    return {
      isValid: false,
      errorCode: 400,
      errorMessage: error instanceof Error ? error.message : 'Failed to inspect file structure.',
    };
  } finally {
    if (fileHandle) {
      await fileHandle.close().catch(() => {});
    }
  }
};
