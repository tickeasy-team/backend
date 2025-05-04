import { Organization as OrganizationEntity } from '../../models';
import { ApiResponse } from '../api';

/**
 * 創建組織請求 Body 類型
 */
export interface CreateOrganizationRequest {
  orgName: string;
  orgAddress: string;
  orgMail?: string;
  orgContact?: string;
  orgMobile?: string;
  orgPhone?: string;
  orgWebsite?: string;
}

/**
 * API 回應中的組織資料結構
 */
export type OrganizationData = Pick<
  OrganizationEntity,
  | 'organizationId'
  | 'userId'
  | 'orgName'
  | 'orgAddress'
  | 'orgMail'
  | 'orgContact'
  | 'orgMobile'
  | 'orgPhone'
  | 'orgWebsite'
  | 'createdAt'
>;

/**
 * 獲取單一組織的回應類型
 */
export interface OrganizationResponse extends ApiResponse<{
  organization: OrganizationData;
}> {}

/**
 * 獲取多個組織的回應類型
 */
export interface OrganizationsResponse extends ApiResponse<{
  organizations: OrganizationData[];
  // 可選：添加分頁資訊
  // pagination?: PaginationData;
}> {} 