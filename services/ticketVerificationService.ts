/**
 * 票券驗證服務
 * 基於現有模型重構，提高代碼品質和可維護性
 */
import { AppDataSource } from '../config/database.js';
import { Ticket as TicketEntity } from '../models/ticket.js';
import { Order as OrderEntity } from '../models/order.js';
import { ApiError } from '../utils/index.js';
import { ErrorCode } from '../types/api.js';

interface QRCodeData {
  userId: string;
  orderId: string;
}

interface TicketWithRelations {
  ticketId: string;
  userId: string;
  orderId: string;
  status: 'purchased' | 'used' | 'refunded';
  purchaserName: string | null;
  concertStartTime: Date;
  order: {
    orderStatus: string;
  };
  ticketType: {
    ticketTypeName: string;
    concertSession: {
      sessionTitle: string;
      sessionDate: Date;
      sessionStart?: string;
      sessionEnd?: string;
      concert: {
        organization: {
          userId: string;
        };
      };
    };
  };
}

interface VerificationResult {
  ticketId: string;
  purchaserName: string | null;
  ticketTypeName: string;
  concertTitle: string;
  concertDate: Date;
  verifiedAt: Date;
  verifiedBy: string;
  verifierType: string;
}

interface TimeValidationResult {
  canVerify: boolean;
  reason?: string;
}

export class TicketVerificationService {
  private ticketRepository = AppDataSource.getRepository(TicketEntity);
  private orderRepository = AppDataSource.getRepository(OrderEntity);

  /**
   * 核銷票券主要方法
   */
  async verifyTicket(qrCode: string, verifierId: string, verifierRole: string, verifierEmail: string): Promise<VerificationResult> {
    // 1. 解析和驗證 QR Code
    const { userId, orderId } = this.validateAndParseQRCode(qrCode);

    // 2. 獲取票券及相關數據（使用事務和鎖防止併發）
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 3. 查找並鎖定票券
      const ticket = await this.getTicketWithLock(queryRunner, userId, orderId);

      // 4. 驗證權限
      this.validateVerificationPermission(ticket, verifierId, verifierRole);

      // 5. 驗證票券狀態
      this.validateTicketStatus(ticket);

      // 6. 驗證時間範圍
      this.validateVerificationTime(ticket);

      // 7. 執行核銷
      const result = await this.executeVerification(queryRunner, ticket, verifierId, verifierRole, verifierEmail);

      await queryRunner.commitTransaction();
      return result;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 驗證並解析 QR Code
   */
  private validateAndParseQRCode(qrCode: string): QRCodeData {
    if (!qrCode || typeof qrCode !== 'string' || qrCode.trim().length === 0) {
      throw ApiError.create(400, 'QR Code 不能為空', ErrorCode.INVALID_QR_FORMAT);
    }

    if (qrCode.length > 200) {
      throw ApiError.create(400, 'QR Code 格式錯誤', ErrorCode.INVALID_QR_FORMAT);
    }

    const parts = qrCode.split('|');
    if (parts.length !== 3 || parts[0] !== 'TICKEASY') {
      throw ApiError.create(400, 'QR Code 格式錯誤，請確認是有效的 Tickeasy 票券', ErrorCode.INVALID_QR_FORMAT);
    }

    const [, userId, orderId] = parts;
    
    // UUID 格式驗證（更嚴格的正則表達式）
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId) || !uuidRegex.test(orderId)) {
      throw ApiError.create(400, 'QR Code 中的 ID 格式錯誤', ErrorCode.INVALID_UUID_FORMAT);
    }

    return { userId, orderId };
  }

  /**
   * 獲取票券及所有相關數據（使用悲觀鎖）
   */
  private async getTicketWithLock(queryRunner: any, userId: string, orderId: string): Promise<TicketWithRelations> {
    // 先檢查訂單是否存在且已付款
    const order = await queryRunner.manager
      .createQueryBuilder(OrderEntity, 'order')
      .setLock("pessimistic_write")
      .leftJoinAndSelect('order.ticketType', 'ticketType')
      .leftJoinAndSelect('ticketType.concertSession', 'session')
      .leftJoinAndSelect('session.concert', 'concert')
      .leftJoinAndSelect('concert.organization', 'organization')
      .where('order.orderId = :orderId', { orderId })
      .andWhere('order.userId = :userId', { userId })
      .andWhere('order.orderStatus = :orderStatus', { orderStatus: 'paid' })
      .getOne();

    if (!order) {
      throw ApiError.create(404, '找不到對應的已付款訂單', ErrorCode.ORDER_NOT_FOUND);
    }

    // 檢查關聯資料完整性
    if (!order.ticketType?.concertSession?.concert?.organization) {
      throw ApiError.create(500, '訂單關聯資料不完整', ErrorCode.SYSTEM_ERROR);
    }

    // 查找對應的票券
    const ticket = await queryRunner.manager
      .createQueryBuilder(TicketEntity, 'ticket')
      .setLock("pessimistic_write")
      .where('ticket.orderId = :orderId', { orderId })
      .andWhere('ticket.userId = :userId', { userId })
      .getOne();

    if (!ticket) {
      throw ApiError.create(404, '找不到對應的票券', ErrorCode.TICKET_NOT_FOUND);
    }

    // 組合完整的票券資料
    return {
      ...ticket,
      order,
      ticketType: order.ticketType
    } as TicketWithRelations;
  }

  /**
   * 驗證核銷權限
   */
  private validateVerificationPermission(ticket: TicketWithRelations, verifierId: string, verifierRole: string): void {
    const organizerUserId = ticket.ticketType.concertSession.concert.organization.userId;
    const isOrganizer = verifierId === organizerUserId;
    const isAdmin = ['admin', 'superuser'].includes(verifierRole);

    if (!isOrganizer && !isAdmin) {
      throw ApiError.create(
        403, 
        '您沒有權限驗證此票券，只有該演場會的主辦方或管理員可以進行驗票', 
        ErrorCode.AUTH_INSUFFICIENT_PERMISSION
      );
    }
  }

  /**
   * 驗證票券狀態
   */
  private validateTicketStatus(ticket: TicketWithRelations): void {
    switch (ticket.status) {
      case 'used':
        throw ApiError.create(400, '此票券已被使用，無法重複驗證', ErrorCode.TICKET_ALREADY_USED);
      case 'refunded':
        throw ApiError.create(400, '此票券已退款，無法使用', ErrorCode.TICKET_REFUNDED);
      case 'purchased':
        return; // 正常狀態
      default:
        throw ApiError.create(400, `票券狀態異常：${ticket.status}`, ErrorCode.INVALID_TICKET_STATUS);
    }
  }

  /**
   * 驗證核銷時間
   */
  private validateVerificationTime(ticket: TicketWithRelations): void {
    const session = ticket.ticketType.concertSession;
    const concertStartTime = this.buildConcertStartTime(session.sessionDate, session.sessionStart);
    
    const timeValidation = this.checkVerificationTimeWindow(
      concertStartTime,
      session.sessionDate,
      session.sessionEnd
    );

    if (!timeValidation.canVerify) {
      const errorCode = timeValidation.reason?.includes('尚未開始') 
        ? ErrorCode.TOO_EARLY_TO_VERIFY 
        : ErrorCode.TOO_LATE_TO_VERIFY;
      
      throw ApiError.create(400, timeValidation.reason!, errorCode);
    }
  }

  /**
   * 建構演出開始時間
   */
  private buildConcertStartTime(sessionDate: Date, sessionStart?: string): Date {
    const startTime = new Date(sessionDate);
    
    if (sessionStart) {
      const timeMatch = sessionStart.match(/^(\d{1,2}):(\d{2})$/);
      if (!timeMatch) {
        throw ApiError.create(500, '演出開始時間格式錯誤', ErrorCode.SYSTEM_ERROR);
      }
      
      const [, hourStr, minuteStr] = timeMatch;
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);
      
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        throw ApiError.create(500, '演出開始時間格式錯誤', ErrorCode.SYSTEM_ERROR);
      }
      
      startTime.setHours(hour, minute, 0, 0);
    } else {
      // 如果沒有指定時間，預設為當天 19:00
      startTime.setHours(19, 0, 0, 0);
    }
    
    return startTime;
  }

  /**
   * 檢查核銷時間窗口
   */
  private checkVerificationTimeWindow(
    concertStartTime: Date, 
    sessionDate: Date, 
    sessionEnd?: string,
    advanceHours: number = 2
  ): TimeValidationResult {
    const now = new Date();
    const earliestVerifyTime = new Date(concertStartTime.getTime() - advanceHours * 60 * 60 * 1000);

    let endTime: Date;

    if (sessionEnd) {
      const timeMatch = sessionEnd.match(/^(\d{1,2}):(\d{2})$/);
      if (!timeMatch) {
        // 如果結束時間格式錯誤，預設演出持續3小時
        endTime = new Date(concertStartTime.getTime() + 3 * 60 * 60 * 1000);
      } else {
        const [, hourStr, minuteStr] = timeMatch;
        const endHour = parseInt(hourStr, 10);
        const endMinute = parseInt(minuteStr, 10);
        
        endTime = new Date(sessionDate);
        endTime.setHours(endHour, endMinute, 0, 0);

        // 處理跨日情況：如果結束時間早於開始時間，表示跨日演出
        if (endTime <= concertStartTime) {
          endTime.setDate(endTime.getDate() + 1);
        }
      }
    } else {
      // 如果沒有 sessionEnd，預設演出持續3小時
      endTime = new Date(concertStartTime.getTime() + 3 * 60 * 60 * 1000);
    }

    // 檢查是否太早
    if (now < earliestVerifyTime) {
      return {
        canVerify: false,
        reason: `演出尚未開始，最早可於 ${earliestVerifyTime.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })} (台北時間) 開始驗票`
      };
    }

    // 檢查是否太晚
    if (now > endTime) {
      return {
        canVerify: false,
        reason: `演出已於 ${endTime.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })} (台北時間) 結束，核銷時間已過`
      };
    }

    return { canVerify: true };
  }

  /**
   * 執行核銷操作
   */
  private async executeVerification(
    queryRunner: any,
    ticket: TicketWithRelations, 
    verifierId: string, 
    verifierRole: string,
    verifierEmail: string
  ): Promise<VerificationResult> {
    const verificationTime = new Date();

    // 更新票券狀態
    await queryRunner.manager.update(
      TicketEntity,
      { ticketId: ticket.ticketId },
      { 
        status: 'used' as const
      }
    );

    // 記錄驗證操作（寫入日誌，這裡可以用其他方式記錄，比如文件日誌）
    const verifierType = ['admin', 'superuser'].includes(verifierRole) ? '管理員' : '主辦方';
    console.log(`[VERIFICATION] 票券核銷成功`, {
      ticketId: ticket.ticketId,
      verifierId,
      verifierEmail,
      verifierType,
      concertTitle: ticket.ticketType.concertSession.sessionTitle,
      ticketType: ticket.ticketType.ticketTypeName,
      verifiedAt: verificationTime.toISOString(),
      timestamp: new Date().toISOString()
    });

    return {
      ticketId: ticket.ticketId,
      purchaserName: ticket.purchaserName,
      ticketTypeName: ticket.ticketType.ticketTypeName,
      concertTitle: ticket.ticketType.concertSession.sessionTitle,
      concertDate: ticket.ticketType.concertSession.sessionDate,
      verifiedAt: verificationTime,
      verifiedBy: verifierEmail,
      verifierType: verifierType
    };
  }

  /**
   * 查詢票券狀態（不執行核銷）
   */
  async checkTicketStatus(qrCode: string): Promise<{
    isValid: boolean;
    ticket?: {
      ticketId: string;
      status: string;
      purchaserName: string | null;
      ticketTypeName?: string;
      concertTitle?: string;
      concertDate?: Date;
    };
    reason?: string;
  }> {
    try {
      const { userId, orderId } = this.validateAndParseQRCode(qrCode);
      
      // 查找票券和相關資料（不使用鎖）
      const ticket = await this.ticketRepository
        .createQueryBuilder('ticket')
        .leftJoinAndSelect('ticket.order', 'order')
        .leftJoinAndSelect('ticket.ticketType', 'ticketType')
        .leftJoinAndSelect('ticketType.concertSession', 'session')
        .where('ticket.orderId = :orderId', { orderId })
        .andWhere('ticket.userId = :userId', { userId })
        .andWhere('order.orderStatus = :orderStatus', { orderStatus: 'paid' })
        .getOne();

      if (!ticket) {
        return {
          isValid: false,
          reason: '找不到對應的票券'
        };
      }

      return {
        isValid: ticket.status === 'purchased',
        ticket: {
          ticketId: ticket.ticketId,
          status: ticket.status,
          purchaserName: ticket.purchaserName,
          ticketTypeName: ticket.ticketType?.ticketTypeName,
          concertTitle: ticket.ticketType?.concertSession?.sessionTitle,
          concertDate: ticket.ticketType?.concertSession?.sessionDate
        },
        reason: ticket.status !== 'purchased' ? `票券狀態：${ticket.status}` : undefined
      };
      
    } catch (error) {
      return {
        isValid: false,
        reason: error instanceof ApiError ? error.message : '系統錯誤'
      };
    }
  }
}
