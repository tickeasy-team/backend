/**
 * 通用類型定義
 */

import { UserRole } from '../models/user';
import { TokenPayload as AuthTokenPayload } from './auth/jwt';
import { 
  ApiResponse as ApiResponseType, 
  PaginatedResponse as PaginatedResponseType,
  ErrorResponse as ErrorResponseType 
} from './api';

// 為了向後兼容性重新導出
export { AuthTokenPayload as TokenPayload };
export { ApiResponseType as ApiResponse };
export { PaginatedResponseType as PaginatedResponse };
export { ErrorResponseType as ErrorResponse };

/**
 * 基礎實體屬性
 */
export interface BaseEntity {
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 時間範圍
 */
export interface TimeRange {
  startTime: Date | string;
  endTime: Date | string;
}

/**
 * 地理位置座標
 */
export interface GeoLocation {
  latitude: number;
  longitude: number;
}

/**
 * 搜尋參數基本結構
 */
export interface SearchParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  query?: string;
}

// 以下是已棄用的型別定義，保留是為了向後兼容性
// 建議使用從 api.ts 和 auth/jwt.ts 導入的標準型別

/**
 * @deprecated 請使用 'types/api' 中的 ApiResponse
 */
export interface LegacyApiResponse<T = any> {
  status: 'success' | 'failed';
  message: string;
  data?: T;
}

/**
 * @deprecated 請使用 'types/auth/jwt' 中的 TokenPayload
 */
export interface LegacyTokenPayload {
  userId: string;
  role: string | UserRole;
  iat?: number;
  exp?: number;
}

/**
 * @deprecated 請使用 'types/api' 中的 PaginatedResponse
 */
export interface LegacyPaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * @deprecated 請使用 'types/api' 中的 ErrorResponse
 */
export interface LegacyErrorResponse {
  status: 'failed';
  message: string;
  details?: any;
  code?: string;
} 