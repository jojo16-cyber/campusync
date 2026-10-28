import { Request, Response, NextFunction } from 'express';
import { User } from '../models/user.model';
import { registerSchema, loginSchema } from '../validators/auth.validator';
import { hashPassword, comparePassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { AppError } from '../utils/appError';
import { successResponse } from '../utils/apiResponse';

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = registerSchema.parse(req.body);

    const existingUser = await User.findOne({ email: validatedData.email });
    if (existingUser) {
      throw new AppError('An account with this email already exists', 409);
    }

    const passwordHash = await hashPassword(validatedData.password);

    // SECURITY: Public registration is strictly restricted to student accounts
    const user = await User.create({
      name: validatedData.name,
      email: validatedData.email,
      passwordHash,
      role: 'student',
    });

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    res
      .status(201)
      .json(
        successResponse('Student registration successful', {
          user: user.toSafeObject(),
          token,
        })
      );
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = loginSchema.parse(req.body);

    const user = await User.findOne({ email: validatedData.email });

    // Prevent user enumeration by returning generic error message
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isPasswordValid = await comparePassword(
      validatedData.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    res.status(200).json(
      successResponse('Login successful', {
        user: user.toSafeObject(),
        token,
      })
    );
  } catch (error) {
    next(error);
  }
};

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    res.status(200).json(
      successResponse('User profile retrieved successfully', {
        user: req.user.toSafeObject(),
      })
    );
  } catch (error) {
    next(error);
  }
};

