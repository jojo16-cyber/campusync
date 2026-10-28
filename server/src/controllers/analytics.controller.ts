import { Request, Response, NextFunction } from 'express';
import {
  getCompleteDashboardAnalytics,
  getKPIMetrics as fetchKPIMetrics,
  getStatusDistribution as fetchStatusDistribution,
  getCompanyApplicationCounts as fetchCompanyApplicationCounts,
  getRecentApplications as fetchRecentApplications,
} from '../services/analytics.service';
import { successResponse } from '../utils/apiResponse';
import { AppError } from '../utils/appError';

/**
 * GET /api/analytics/dashboard
 * Retrieve consolidated placement analytics and dashboard metrics.
 * Authorized for administrators only.
 */
export const getDashboardAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      throw new AppError('Forbidden: Access denied. Required role: admin', 403);
    }

    const analytics = await getCompleteDashboardAnalytics();

    res.status(200).json(
      successResponse('Placement analytics retrieved successfully', analytics)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/kpis
 * Retrieve top-level KPI metrics (students, opportunities, applications, selections, rates).
 * Authorized for administrators only.
 */
export const getKPIMetrics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      throw new AppError('Forbidden: Access denied. Required role: admin', 403);
    }

    const kpis = await fetchKPIMetrics();

    res.status(200).json(
      successResponse('KPI metrics retrieved successfully', kpis)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/status-distribution
 * Retrieve breakdown of applications across all 7 statuses.
 * Authorized for administrators only.
 */
export const getStatusDistribution = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      throw new AppError('Forbidden: Access denied. Required role: admin', 403);
    }

    const kpis = await fetchKPIMetrics();
    const distribution = await fetchStatusDistribution(kpis.totalApplications);

    res.status(200).json(
      successResponse('Application status distribution retrieved successfully', distribution)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/company-applications
 * Retrieve company-wise application counts sorted by volume.
 * Authorized for administrators only.
 */
export const getCompanyApplications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      throw new AppError('Forbidden: Access denied. Required role: admin', 403);
    }

    const kpis = await fetchKPIMetrics();
    const companyData = await fetchCompanyApplicationCounts(kpis.totalApplications);

    res.status(200).json(
      successResponse('Company application counts retrieved successfully', companyData)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/recent-applications
 * Retrieve the latest student applications with populated details.
 * Authorized for administrators only.
 */
export const getRecentApplicationsList = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      throw new AppError('Forbidden: Access denied. Required role: admin', 403);
    }

    const limit = req.query.limit ? Math.min(Number(req.query.limit), 50) : 10;
    const recent = await fetchRecentApplications(limit);

    res.status(200).json(
      successResponse('Recent applications retrieved successfully', recent)
    );
  } catch (error) {
    next(error);
  }
};
