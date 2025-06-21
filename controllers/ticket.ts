/**
 * 票券控制器 - 重構版本
 * 乾淨簡潔，使用服務層處理業務邏輯
 */
import { Request, Response } from 'express';
import { AppDataSource } from '../config/database.js';
import { TicketType as TicketTypeEntity } from '../models/ticket-type.js';
import { handleErrorAsync, ApiError } from '../utils/index.js';
import { ApiResponse } from '../types/api.js';
import { TicketVerificationService } from '../services/ticketVerificationService.js';

/**
 * 獲取演場會票券類型資訊
 */
export const getConcertTickets = handleErrorAsync(async (req: Request, res: Response<ApiResponse>) => {
  const concertSessionId = req.params.concertSessionId;
  
  if (!concertSessionId) {
    throw ApiError.fieldRequired('concertSessionId');
  }

  const ticketTypeRepository = AppDataSource.getRepository(TicketTypeEntity);
  const tickets = await ticketTypeRepository.find({
    where: { concertSessionId },
    select: [
      'ticketTypeId', 
      'ticketTypeName', 
      'entranceType', 
      'ticketBenefits', 
      'ticketRefundPolicy', 
      'ticketTypePrice', 
      'totalQuantity', 
      'remainingQuantity', 
      'sellBeginDate', 
      'sellEndDate'
    ]
  });

  return res.status(200).json({
    status: 'success',
    message: '獲取演唱會票券成功',
    data: { tickets }
  });
});

/**
 * 驗票 API - 透過 QR Code 字串核銷票券
 * 權限：只有該票券的主辦方或管理員可以核銷
 */
export const verifyTicket = handleErrorAsync(async (req: Request, res: Response<ApiResponse>) => {
  const { qrCode } = req.body;
  const authenticatedUser = req.user as { userId: string; role: string; email: string; };

  // 基本驗證
  if (!qrCode || typeof qrCode !== 'string') {
    throw ApiError.fieldRequired('qrCode');
  }

  // 使用服務進行核銷
  const verificationService = new TicketVerificationService();
  const result = await verificationService.verifyTicket(
    qrCode, 
    authenticatedUser.userId, 
    authenticatedUser.role,
    authenticatedUser.email
  );

  return res.status(200).json({
    status: 'success',
    message: '票券驗證成功',
    data: result
  });
});

/**
 * 查詢票券狀態 API - 不執行核銷，僅查詢狀態
 */
export const checkTicketStatus = handleErrorAsync(async (req: Request, res: Response<ApiResponse>) => {
  const { qrCode } = req.body;

  if (!qrCode || typeof qrCode !== 'string') {
    throw ApiError.fieldRequired('qrCode');
  }

  const verificationService = new TicketVerificationService();
  const result = await verificationService.checkTicketStatus(qrCode);

  if (!result.isValid) {
    return res.status(400).json({
      status: 'failed',
      message: result.reason || '票券無效',
      data: result.ticket
    });
  }

  return res.status(200).json({
    status: 'success',
    message: '票券狀態查詢成功',
    data: {
      isValid: result.isValid,
      ticket: result.ticket
    }
  });
});
