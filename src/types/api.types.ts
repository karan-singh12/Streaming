import { Request } from 'express';

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  errors?: ValidationError[];
  meta?: ResponseMeta;
  timestamp: string;
}

export interface ResponseMeta {
  pagination?: PaginationMeta;
  requestId?: string;
  version?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Error Types
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  BAD_REQUEST_ERROR = 'BAD_REQUEST_ERROR',
  FORBIDDEN_ERROR = 'FORBIDDEN_ERROR',
  UNPROCESSABLE_ENTITY_ERROR = 'UNPROCESSABLE_ENTITY_ERROR',
  TOO_MANY_REQUESTS_ERROR = 'TOO_MANY_REQUESTS_ERROR',
  SERVICE_UNAVAILABLE_ERROR = 'SERVICE_UNAVAILABLE_ERROR'
}

export interface CustomError extends Error {
  type: ErrorType;
  statusCode: number;
  isOperational: boolean;
  errors?: ValidationError[];
  context?: any;
}

// HTTP Status Codes
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503
}

// Request Types
export interface AuthenticatedRequest extends Request {
  user?: {
    _id: string;
    role?: string;
    email?: string;
    [key: string]: any;
  };
}

// Controller Response Types
export type ControllerResponse<T = any> = Promise<ApiResponse<T>>;
