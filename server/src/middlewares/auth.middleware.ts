import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import { verifyToken } from '../utils/jwt';
import { User, UserRole } from '../models/user.model';

export const requireAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication token is required', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new AppError('Authentication token is required', 401);
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new AppError('User account associated with this token no longer exists', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Forbidden: Access denied. Required role: ${allowedRoles.join(' or ')}`,
          403
        )
      );
    }

    next();
  };
};
