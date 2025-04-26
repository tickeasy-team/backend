/**
 * 用戶相關請求類型定義
 */

import { Gender } from '../../models/user';

/**
 * 更新用戶資料請求
 */
export interface UpdateProfileRequest {
  name?: string;
  nickname?: string;
  phone?: string;
  birthday?: Date | string;
  gender?: Gender;
  address?: string;
  country?: string;
  preferredRegions?: string[];
  preferredEventTypes?: string[];
} 