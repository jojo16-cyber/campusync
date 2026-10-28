export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  timestamp: string;
}

export const successResponse = <T>(message: string, data?: T): ApiResponse<T> => {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
};

export const errorResponse = (
  message: string,
  details?: unknown
): { success: false; message: string; details?: unknown; timestamp: string } => {
  return {
    success: false,
    message,
    ...(details !== undefined && { details }),
    timestamp: new Date().toISOString(),
  };
};

