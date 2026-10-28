import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Notification } from '../models/notification.model';
import { queryNotificationsSchema } from '../validators/notification.validator';
import { AppError } from '../utils/appError';
import { successResponse } from '../utils/apiResponse';

/**
 * List paginated notifications for the authenticated user.
 */
export const getUserNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const { page, limit, unreadOnly } = queryNotificationsSchema.parse(req.query);

    const filter: Record<string, unknown> = {
      recipient: req.user._id,
    };

    if (unreadOnly) {
      filter.isRead = false;
    }

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    const skip = (page - 1) * limit;

    const notifications = await Notification.find(filter)
      .populate({
        path: 'listing',
        select: 'companyName title opportunityType',
      })
      .populate({
        path: 'application',
        select: 'status submittedAt',
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json(
      successResponse('Notifications retrieved successfully', {
        notifications,
        unreadCount,
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
 * Get the unread notifications count for the authenticated user.
 */
export const getUnreadNotificationCount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    res.status(200).json(
      successResponse('Unread notification count retrieved successfully', {
        unreadCount,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Mark a single notification as read by ID.
 * Strict ownership check: only the recipient can mark their notification as read.
 */
export const markNotificationAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const id = req.params.id;
    if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid notification identifier format', 400);
    }

    const notification = await Notification.findOne({
      _id: id,
      recipient: req.user._id,
    });

    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    res.status(200).json(
      successResponse('Notification marked as read', {
        notification,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all unread notifications for the authenticated user as read.
 */
export const markAllNotificationsAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const result = await Notification.updateMany(
      {
        recipient: req.user._id,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    res.status(200).json(
      successResponse('All notifications marked as read', {
        updatedCount: result.modifiedCount || 0,
      })
    );
  } catch (error) {
    next(error);
  }
};
