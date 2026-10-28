import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import crypto from 'crypto';
import formidable, { File, Files } from 'formidable';
import { Resume } from '../models/resume.model';
import { StudentProfile } from '../models/profile.model';
import { Application } from '../models/application.model';
import { resumeStorageService } from '../services/storage/gridfs.storage';
import {
  validatePdfFile,
  sanitizeDisplayFilename,
  sanitizeHeaderFilename,
  MAX_RESUME_SIZE_BYTES,
} from '../utils/fileValidation';
import { AppError } from '../utils/appError';

/**
 * Upload or replace the authenticated student's current resume
 * POST /api/resumes
 */
export const uploadMyResume = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const studentId = req.user?._id;
    if (!studentId || req.user?.role !== 'student') {
      res.status(403).json({
        success: false,
        message: 'Only registered students are authorized to upload resumes',
      });
      return;
    }

    // Configure formidable with strict limits
    const form = formidable({
      maxFileSize: MAX_RESUME_SIZE_BYTES,
      maxFiles: 1,
      multiples: false,
      allowEmptyFiles: true, // Allow formidable to parse so our validation returns descriptive 400
    });

    let files: Files;
    try {
      const [, parsedFiles] = await form.parse(req);
      files = parsedFiles;
    } catch (parseErr: unknown) {
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      if (
        msg.includes('maxFileSize') ||
        msg.includes('bigger than maxFileSize') ||
        (parseErr as { code?: number })?.code === 1009
      ) {
        res.status(413).json({
          success: false,
          message: 'File size exceeds the 5 MB maximum limit. Please upload a smaller PDF document.',
        });
        return;
      }
      res.status(400).json({
        success: false,
        message: 'Failed to process multipart upload request.',
      });
      return;
    }

    // Extract the uploaded file from form data
    const fileItem = files.resume || files.file || Object.values(files)[0];
    const file: File | undefined = Array.isArray(fileItem) ? fileItem[0] : fileItem;

    if (!file || !file.filepath) {
      res.status(400).json({
        success: false,
        message: "No resume file was attached. Please provide a PDF file with field name 'resume'.",
      });
      return;
    }

    // Perform deep security and signature validation on the temporary file
    const validation = await validatePdfFile(
      file.filepath,
      file.originalFilename,
      file.mimetype,
      file.size
    );

    if (!validation.isValid) {
      // Clean up temporary file on validation failure
      await fs.promises.unlink(file.filepath).catch(() => {});
      res.status(validation.errorCode || 400).json({
        success: false,
        message: validation.errorMessage || 'Invalid resume document.',
      });
      return;
    }

    const sanitizedFilename = validation.sanitizedFilename || sanitizeDisplayFilename(file.originalFilename);
    const storageKey = `resume_${studentId.toString()}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.pdf`;

    // Stream the validated file from temp storage into GridFS
    let storageResult;
    try {
      const fileStream = fs.createReadStream(file.filepath);
      storageResult = await resumeStorageService.uploadStream(storageKey, fileStream, {
        studentId,
        originalName: sanitizedFilename,
      });
    } catch {
      await fs.promises.unlink(file.filepath).catch(() => {});
      throw new AppError('Failed to store resume document in storage system.', 500);
    } finally {
      // Always remove temporary file from host disk
      await fs.promises.unlink(file.filepath).catch(() => {});
    }

    // Find any existing active resume for this student
    const currentResume = await Resume.findOne({ student: studentId, isCurrent: true });

    // Construct the new Resume metadata document
    const newResume = new Resume({
      student: studentId,
      originalName: sanitizedFilename,
      storageFileId: new mongoose.Types.ObjectId(storageResult.fileId),
      storageKey,
      mimeType: 'application/pdf',
      fileSize: storageResult.size,
      version: currentResume ? currentResume.version + 1 : 1,
      isCurrent: true,
      uploadedAt: new Date(),
    });

    // Safely replace current resume with compensation logic
    try {
      if (currentResume) {
        currentResume.isCurrent = false;
        await currentResume.save();
      }
      await newResume.save();
    } catch (dbErr) {
      // Compensate: Delete the newly uploaded GridFS file if metadata persistence fails
      await resumeStorageService.deleteFile(storageResult.fileId).catch(() => {});
      if (currentResume) {
        currentResume.isCurrent = true;
        await currentResume.save().catch(() => {});
      }
      throw dbErr;
    }

    // Clean up previous valid resume file from storage once replacement is persisted
    if (currentResume) {
      await resumeStorageService.deleteFile(currentResume.storageFileId.toString()).catch(() => {});
      await Resume.deleteOne({ _id: currentResume._id }).catch(() => {});
    }

    // Synchronize StudentProfile resume status
    await StudentProfile.findOneAndUpdate(
      { userId: studentId },
      {
        resumeStatus: 'uploaded',
        resumeUrl: '/api/resumes/me/download',
      }
    );

    res.status(201).json({
      success: true,
      message: 'Resume uploaded and verified successfully',
      data: {
        resume: newResume.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve the authenticated student's active resume metadata
 * GET /api/resumes/me
 */
export const getMyResume = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const studentId = req.user?._id;
    if (!studentId || req.user?.role !== 'student') {
      res.status(403).json({
        success: false,
        message: 'Only registered students can view their resume metadata',
      });
      return;
    }

    const resume = await Resume.findOne({ student: studentId, isCurrent: true });
    if (!resume) {
      res.status(404).json({
        success: false,
        message: 'No active resume found for this account',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        resume: resume.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Securely stream and download the authenticated student's active resume
 * GET /api/resumes/me/download
 */
export const downloadMyResume = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const studentId = req.user?._id;
    if (!studentId || req.user?.role !== 'student') {
      res.status(403).json({
        success: false,
        message: 'Only registered students can download their resume',
      });
      return;
    }

    const resume = await Resume.findOne({ student: studentId, isCurrent: true });
    if (!resume) {
      res.status(404).json({
        success: false,
        message: 'No active resume found for download',
      });
      return;
    }

    const safeFilename = sanitizeHeaderFilename(resume.originalName);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`
    );
    res.setHeader('Content-Length', resume.fileSize);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const downloadStream = resumeStorageService.getDownloadStream(resume.storageFileId.toString());
    downloadStream.on('error', (_streamErr) => {
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to stream resume file from storage',
        });
      }
    });

    downloadStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete the authenticated student's active resume
 * DELETE /api/resumes/me
 */
export const deleteMyResume = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const studentId = req.user?._id;
    if (!studentId || req.user?.role !== 'student') {
      res.status(403).json({
        success: false,
        message: 'Only registered students are authorized to delete their resume',
      });
      return;
    }

    const resume = await Resume.findOne({ student: studentId, isCurrent: true });
    if (!resume) {
      res.status(404).json({
        success: false,
        message: 'No active resume found to delete',
      });
      return;
    }

    // Clean up file in GridFS
    await resumeStorageService.deleteFile(resume.storageFileId.toString()).catch(() => {});

    // Delete Resume metadata document
    await Resume.deleteOne({ _id: resume._id });

    // Update StudentProfile status
    await StudentProfile.findOneAndUpdate(
      { userId: studentId },
      {
        resumeStatus: 'not_uploaded',
        resumeUrl: '',
      }
    );

    res.status(200).json({
      success: true,
      message: 'Resume deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Authorized administrator endpoint to retrieve or download a student's resume
 * GET /api/students/:studentId/resume
 */
export const getStudentResumeAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const studentId = req.params.studentId;
    if (typeof studentId !== 'string' || !mongoose.Types.ObjectId.isValid(studentId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid student identifier format',
      });
      return;
    }

    const resume = await Resume.findOne({
      student: new mongoose.Types.ObjectId(studentId),
      isCurrent: true,
    });

    if (!resume) {
      res.status(404).json({
        success: false,
        message: 'No resume found for this student',
      });
      return;
    }

    // Return metadata if specifically requested
    if (req.query.metadata === 'true') {
      res.status(200).json({
        success: true,
        data: {
          resume: resume.toJSON(),
        },
      });
      return;
    }

    // Default to streaming the file as an attachment
    const safeFilename = sanitizeHeaderFilename(resume.originalName);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`
    );
    res.setHeader('Content-Length', resume.fileSize);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const downloadStream = resumeStorageService.getDownloadStream(resume.storageFileId.toString());
    downloadStream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to stream resume file from storage',
        });
      }
    });

    downloadStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

/**
 * Authorized administrator endpoint to retrieve applicant resume in recruitment workflow
 * GET /api/applications/:applicationId/resume
 */
export const getApplicationResumeAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const targetAppId = req.params.applicationId || req.params.id;
    if (typeof targetAppId !== 'string' || !mongoose.Types.ObjectId.isValid(targetAppId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid application identifier format',
      });
      return;
    }

    const application = await Application.findById(targetAppId);
    if (!application) {
      res.status(404).json({
        success: false,
        message: 'Application not found',
      });
      return;
    }

    const resume = await Resume.findOne({
      student: application.student,
      isCurrent: true,
    });

    if (!resume) {
      res.status(404).json({
        success: false,
        message: 'The applicant has not uploaded a resume',
      });
      return;
    }

    if (req.query.metadata === 'true') {
      res.status(200).json({
        success: true,
        data: {
          resume: resume.toJSON(),
        },
      });
      return;
    }

    const safeFilename = sanitizeHeaderFilename(resume.originalName);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`
    );
    res.setHeader('Content-Length', resume.fileSize);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const downloadStream = resumeStorageService.getDownloadStream(resume.storageFileId.toString());
    downloadStream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to stream applicant resume file from storage',
        });
      }
    });

    downloadStream.pipe(res);
  } catch (error) {
    next(error);
  }
};
