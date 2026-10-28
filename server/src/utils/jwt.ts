import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './appError';
import { UserRole } from '../models/user.model';

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export const signToken = (payload: AuthTokenPayload): string => {
  const options: SignOptions = {
    expiresIn: (env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
};

export const verifyToken = (token: string): AuthTokenPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
    return decoded;
  } catch (error: unknown) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Authentication token has expired', 401);
    }
    throw new AppError('Invalid authentication token', 401);
  }
};

