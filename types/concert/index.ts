import { Concert as ConcertEntity, ConInfoStatus } from '../../models/concert.js';
import { ApiResponse } from '../api.js';

/**
 * 建立活動時每一個票種的結構
 */
export interface TicketTypeInput {
  ticketTypeName: string;
  entranceType: string;
  ticketBenefits: string;
  ticketRefundPolicy: string;
  ticketTypePrice: number;
  totalQuantity: number;
  sellBeginDate: string; // yyyy/MM/dd HH:mm
  sellEndDate: string;   // yyyy/MM/dd HH:mm
}

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
  eventEndDate?: string;   // yyyy/MM/dd
  ticketPurchaseMethod: string;
  precautions: string;
  refundPolicy: string;
  conInfoStatus: ConInfoStatus;
  imgBanner: string;
  imgSeattable: string;
  ticketTypes: TicketTypeInput[]; // 多張票種
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
 * 單一票種的資料結構
 */
export interface TicketType {
  ticketTypeName: string;
  entranceType: string;
  ticketBenefits: string;
  ticketRefundPolicy: string;
  ticketTypePrice: number;
  totalQuantity: number;
  sellBeginDate: string; // yyyy/MM/dd HH:mm
  sellEndDate: string;   // yyyy/MM/dd HH:mm
}

/**
 * 獲取單一活動的回應類型
 */
export interface ConcertResponse extends ApiResponse<{
  concert: ConcertData;
  ticketTypes?: TicketType[];
}> {}

/**
 * 獲取多個活動的回應類型（含分頁）
 */
export interface ConcertsResponse extends ApiResponse<{
  concerts: ConcertData[];
  pagination: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
}> {}
