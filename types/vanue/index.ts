import { Venue as VenueEntity } from '../../models/venue.js';
import { ApiResponse } from '../api.js';

/**
 * API 回應中的場館資料結構
 */
export type VenueData = Pick<
  VenueEntity,
  | 'venueId'
  | 'venueName'
  | 'venueAddress'
  | 'venueCapacity'
  | 'venueImageUrl'
  | 'isAccessible'
  | 'hasParking'
  | 'hasTransit'
  | 'createdAt'
  | 'updatedAt'
>;

/**
 * 獲取單一場館的回應類型
 */
export interface VenueResponse extends ApiResponse<{
  venue: VenueData;
}> {}

/**
 * 獲取多個場館的回應類型
 */
export interface VenuesResponse extends ApiResponse<{
  venues: VenueData[];
}> {}
