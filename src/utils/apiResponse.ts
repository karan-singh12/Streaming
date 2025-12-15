import { Response } from 'express';
import { ApiResponse, ResponseMeta, PaginationMeta, HttpStatus } from '../types/api.types';
import { v4 as uuidv4 } from 'uuid';

// Generate request ID for tracking
const generateRequestId = (): string => uuidv4();

// Base response function
const sendResponse = <T>(
  res: Response,
  success: boolean,
  statusCode: number,
  message: string,
  data?: T,
  errors?: any[],
  meta?: ResponseMeta
): Response => {
  const response: ApiResponse<T> = {
    success,
    statusCode,
    message,
    data,
    errors,
    meta: {
      ...meta,
      requestId: meta?.requestId || generateRequestId(),
      version: process.env.API_VERSION || '1.0.0'
    },
    timestamp: new Date().toISOString()
  };

  return res.status(statusCode).json(response);
};

// Success Responses
export const successResponse = <T>(
  res: Response,
  message: string,
  data?: T,
  meta?: ResponseMeta
): Response => {
  return sendResponse(res, true, HttpStatus.OK, message, data, undefined, meta);
};

export const createdResponse = <T>(
  res: Response,
  message: string,
  data?: T,
  meta?: ResponseMeta
): Response => {
  return sendResponse(res, true, HttpStatus.CREATED, message, data, undefined, meta);
};

export const noContentResponse = (
  res: Response,
  message: string = 'No content',
  meta?: ResponseMeta
): Response => {
  return sendResponse(res, true, HttpStatus.NO_CONTENT, message, undefined, undefined, meta);
};

// Error Responses
export const errorResponse = (
  res: Response,
  message: string,
  statusCode: number = HttpStatus.BAD_REQUEST,
  errors?: any[],
  meta?: ResponseMeta
): Response => {
  return sendResponse(res, false, statusCode, message, undefined, errors, meta);
};

export const validationErrorResponse = (
  res: Response,
  message: string,
  errors?: any[],
  meta?: ResponseMeta
): Response => {
  return sendResponse(res, false, HttpStatus.UNPROCESSABLE_ENTITY, message, undefined, errors, meta);
};

export const unauthorizedResponse = (
  res: Response,
  message: string = 'Unauthorized access',
  meta?: ResponseMeta
): Response => {
  return sendResponse(res, false, HttpStatus.UNAUTHORIZED, message, undefined, undefined, meta);
};

export const forbiddenResponse = (
  res: Response,
  message: string = 'Access forbidden',
  meta?: ResponseMeta
): Response => {
  return sendResponse(res, false, HttpStatus.FORBIDDEN, message, undefined, undefined, meta);
};

export const notFoundResponse = (
  res: Response,
  message: string = 'Resource not found',
  meta?: ResponseMeta
): Response => {
  return sendResponse(res, false, HttpStatus.NOT_FOUND, message, undefined, undefined, meta);
};

export const conflictResponse = (
  res: Response,
  message: string = 'Resource conflict',
  meta?: ResponseMeta
): Response => {
  return sendResponse(res, false, HttpStatus.CONFLICT, message, undefined, undefined, meta);
};

export const internalServerErrorResponse = (
  res: Response,
  message: string = 'Internal server error',
  meta?: ResponseMeta
): Response => {
  return sendResponse(res, false, HttpStatus.INTERNAL_SERVER_ERROR, message, undefined, undefined, meta);
};

// Pagination Helper
export const createPaginationMeta = (
  page: number,
  limit: number,
  total: number
): PaginationMeta => {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
};

// Paginated Response
export const paginatedResponse = <T>(
  res: Response,
  message: string,
  data: T[],
  page: number,
  limit: number,
  total: number,
  meta?: Omit<ResponseMeta, 'pagination'>
): Response => {
  const paginationMeta = createPaginationMeta(page, limit, total);
  const responseMeta: ResponseMeta = {
    ...meta,
    pagination: paginationMeta
  };

  return successResponse(res, message, data, responseMeta);
};

// Response with Custom Status
export const customResponse = <T>(
  res: Response,
  success: boolean,
  statusCode: number,
  message: string,
  data?: T,
  errors?: any[],
  meta?: ResponseMeta
): Response => {
  return sendResponse(res, success, statusCode, message, data, errors, meta);
};

// Legacy compatibility functions (for gradual migration)
export const successResponseWithData = <T>(
  res: Response,
  message: string,
  data: T,
  meta?: ResponseMeta
): Response => {
  return successResponse(res, message, data, meta);
};

export const errorResponseWithData = <T>(
  res: Response,
  message: string,
  data?: any,
  statusCode: number = HttpStatus.BAD_REQUEST,
  meta?: ResponseMeta
): Response => {
  return errorResponse(res, message, statusCode, data ? [data] : undefined, meta);
};

export const validationError = (
  res: Response,
  message: string,
  errors?: any[],
  meta?: ResponseMeta
): Response => {
  return validationErrorResponse(res, message, errors, meta);
};