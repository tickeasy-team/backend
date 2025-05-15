import { Concert as ConcertEntity, ConInfoStatus, } from '../../models/concert.js';
import { ApiResponse } from '../api.js';

/**
 * 創建活動請求 Body 類型   
 */
export interface CreateConcertRequest {
  organizationId: string;
  venueId: string;
  locationTagId: string;
  musicTagId: string;
  title: string;
  introduction?: string;
  location: string;
  address: string;
  eventStartDate?: string; // yyyy/MM/dd
  eventEndDate?: string; // yyyy/MM/dd
  ticketPurchaseMethod: string;
  precautions: string;
  refundPolicy: string;
  conInfoStatus: ConInfoStatus;
  ticketTypeName: string;
  entranceType: string;
  ticketBenefits: string;
  ticketRefundPolicy: string;
  ticketTypePrice: number;
  totalQuantity: number;
  sellBeginDate: string; // yyyy/MM/dd HH:mm
  sellEndDate: string; // yyyy/MM/dd HH:mm
  imgBanner: string;
  imgSeattable: string;
}

/**
 * API 回應中的活動資料結構
 */
export type ConcertData = Pick<
  ConcertEntity,
  | 'concertId'
  | 'organizationId'
  | 'venueId'
  | 'locationTagId'
  | 'musicTagId'
  | 'conTitle'
  | 'conIntroduction'
  | 'conLocation'
  | 'conAddress'
  | 'eventStartDate'
  | 'eventEndDate'
  | 'imgBanner'
  | 'imgSeattable'
  | 'ticketPurchaseMethod'
  | 'precautions'
  | 'refundPolicy'
  | 'conInfoStatus'
  | 'reviewStatus'
  | 'visitCount'
  | 'promotion'
  | 'cancelledAt'
  | 'createdAt'
  | 'updatedAt'
>;

/**
 * 獲取單一活動的回應類型
 */
export interface ConcertResponse extends ApiResponse<{
  concert: ConcertData;
}> {}

/**
 * 獲取多個活動的回應類型
 */
export interface ConcertsResponse extends ApiResponse<{
  concerts: ConcertData[];
}> {}
