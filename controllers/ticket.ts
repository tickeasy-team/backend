import { Request, Response } from 'express';
import { AppDataSource } from '../config/database.js';
import { Ticket as TicketEntity } from '../models/ticket.js';
import { TicketType as TicketTypeEntity} from '../models/ticket-type.js';
import { Order as OrderEntity } from '../models/order.js';
import { handleErrorAsync, ApiError } from '../utils/index.js';
import { ApiResponse, ErrorCode } from '../types/api.js';
// import { Index } from 'typeorm';


/**
 * 獲取用戶個人資料
 */
// function getConcertTickets(url: string): string | null {
//   try {
//     const urlParts = url.split('/ticket/');
//     if (urlParts.length === 2) {
//       return urlParts[1];
//     }
//   } catch (e) { console.log(e); /* 忽略解析錯誤 */ }
//   return null;
// }


export const getConcertTickets = handleErrorAsync(async (req: Request, res: Response<ApiResponse>) => {
  // req.user 由 isAuth 中間件設置，包含 userId, email, role
  // const authenticatedUser = req.user as Express.User;
  
  const concertSessionId = req.params.concertSessionId;
  console.log(concertSessionId);
  if (!concertSessionId) {
    throw ApiError.fieldRequired('concertSessionId');
  }

  // 使用 TypeORM 查找用戶，並只選擇指定的欄位
  const TicketTypeRepository = AppDataSource.getRepository(TicketTypeEntity);
  const selectedTickets = await TicketTypeRepository.find({
    where: { concertSessionId: concertSessionId },
    select:[
      'ticketTypeId', 'ticketTypeName', 'entranceType', 'ticketBenefits', 'ticketRefundPolicy', 
      'ticketTypePrice', 'totalQuantity', 'remainingQuantity', 'sellBeginDate', 'sellEndDate'
    ]
  });
  // if (selectedTickets.length === 0) {
  //   throw ApiError.notFound('演唱會票券');
  // }

  const data:{ tickets: Array<object> } = {tickets: []};
  const ticketsArray:Array<object> = []; 
  selectedTickets.forEach((value) => {
    ticketsArray.push(value);
  });
  data.tickets = ticketsArray;

  return res.status(200).json({
    status: 'success',
    message: '獲取演唱會票券成功',
    data: data
  });
});

/**
 * 驗票 API - 透過 QR Code 字串核銷票券
 * 權限：只有該票券的主辦方或管理員(admin/superuser)可以核銷
 */
export const verifyTicket = handleErrorAsync(async (req: Request, res: Response<ApiResponse>) => {
  const { qrCode } = req.body;
  const authenticatedUser = req.user as { userId: string; role: string; email: string; };

  // 驗證 QR Code 是否提供
  if (!qrCode || typeof qrCode !== 'string') {
    throw ApiError.fieldRequired('qrCode');
  }

  // 解析 QR Code 格式: TICKEASY|{userId}|{orderId}
  const qrParts = qrCode.split('|');
  if (qrParts.length !== 3 || qrParts[0] !== 'TICKEASY') {
    throw ApiError.create(400, 'QR Code 格式錯誤', ErrorCode.INVALID_QR_FORMAT);
  }

  const [, ticketUserId, orderId] = qrParts;

  // 🔍 Debug: 輸出查詢條件
  console.log('🔍 驗票查詢條件:', { ticketUserId, orderId });

  // 驗證 UUID 格式
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(ticketUserId) || !uuidRegex.test(orderId)) {
    throw ApiError.create(400, 'QR Code 中的 ID 格式錯誤', ErrorCode.INVALID_UUID_FORMAT);
  }

  const ticketRepository = AppDataSource.getRepository(TicketEntity);
  const orderRepository = AppDataSource.getRepository(OrderEntity);

  // 🔍 Debug: 先檢查基本的訂單資料
  console.log('🔍 查詢訂單...');
  const basicOrder = await orderRepository.findOne({
    where: { orderId, userId: ticketUserId },
    select: ['orderId', 'userId', 'orderStatus', 'ticketTypeId'] // 添加 ticketTypeId
  });
  console.log('🔍 基本訂單查詢結果:', basicOrder ? '找到' : '未找到');
  console.log('🔍 基本訂單資料:', basicOrder);

  if (!basicOrder) {
    throw ApiError.create(404, '找不到對應的訂單', ErrorCode.ORDER_NOT_FOUND);
  }

  // 🔍 Debug: 檢查 TicketType 是否存在
  if (basicOrder.ticketTypeId) {
    const ticketTypeRepo = AppDataSource.getRepository(TicketTypeEntity);
    const ticketType = await ticketTypeRepo.findOne({
      where: { ticketTypeId: basicOrder.ticketTypeId }
    });
    console.log('🔍 TicketType 查詢結果:', ticketType ? '找到' : '未找到');
    console.log('🔍 TicketType 資料:', ticketType);
  }

  // 查找對應的訂單並加載主辦方資訊
  console.log('🔍 查詢訂單關聯資料...');
  const order = await orderRepository.findOne({
    where: { orderId, userId: ticketUserId },
    relations: [
      'ticketType',
      'ticketType.concertSession',
      'ticketType.concertSession.concert',
      'ticketType.concertSession.concert.organization'
    ]
    // 暫時移除 select 選項來測試關聯查詢
  });

  console.log('🔍 關聯訂單查詢結果:', order ? '找到' : '未找到');
  console.log('🔍 訂單詳細資料:', {
    orderId: order?.orderId,
    orderStatus: order?.orderStatus,
    hasTicketType: !!order?.ticketType,
    hasSession: !!order?.ticketType?.concertSession,
    hasConcert: !!order?.ticketType?.concertSession?.concert,
    hasOrganization: !!order?.ticketType?.concertSession?.concert?.organization,
    organizationUserId: order?.ticketType?.concertSession?.concert?.organization?.userId
  });

  if (!order) {
    throw ApiError.create(404, '找不到對應的訂單關聯資料', ErrorCode.ORDER_NOT_FOUND);
  }

  // 確保關聯載入成功
  if (!order?.ticketType?.concertSession?.concert?.organization) {
    throw ApiError.create(500, '訂單關聯資料不完整', ErrorCode.SYSTEM_ERROR);
  }

  // 檢查訂單狀態
  if (order.orderStatus !== 'paid') {
    throw ApiError.create(400, `訂單狀態錯誤：${order.orderStatus}`, ErrorCode.INVALID_ORDER_STATUS);
  }

  // 🔒 權限檢查：只有該票券的主辦方或管理員可以核銷
  const organizerUserId = order.ticketType.concertSession.concert.organization.userId;
  const isOrganizer = authenticatedUser.userId === organizerUserId;
  const isAdmin = authenticatedUser.role === 'admin' || authenticatedUser.role === 'superuser';
  
  console.log('🔍 權限檢查:', {
    currentUserId: authenticatedUser.userId,
    organizerUserId,
    isOrganizer,
    userRole: authenticatedUser.role,
    isAdmin
  });
  
  if (!isOrganizer && !isAdmin) {
    throw ApiError.create(403, '您沒有權限驗證此票券，只有該演場會的主辦方或管理員可以進行驗票', ErrorCode.AUTH_INSUFFICIENT_PERMISSION);
  }

  // 🔍 Debug: 先檢查基本的票券資料
  console.log('🔍 查詢基本票券...');
  const basicTicket = await ticketRepository.findOne({
    where: { orderId, userId: ticketUserId }
  });
  console.log('🔍 基本票券查詢結果:', basicTicket ? '找到' : '未找到');

  if (!basicTicket) {
    // 🔍 Debug: 檢查所有票券來找出問題
    console.log('🔍 查詢所有相關票券...');
    const allTicketsForOrder = await ticketRepository.find({
      where: { orderId },
      select: ['ticketId', 'orderId', 'userId', 'status']
    });
    console.log('🔍 該訂單的所有票券:', allTicketsForOrder);

    const allTicketsForUser = await ticketRepository.find({
      where: { userId: ticketUserId },
      select: ['ticketId', 'orderId', 'userId', 'status']
    });
    console.log('🔍 該用戶的所有票券:', allTicketsForUser);

    throw ApiError.create(404, '找不到對應的票券', ErrorCode.TICKET_NOT_FOUND);
  }

  // 查找對應的票券（帶關聯）
  console.log('🔍 查詢票券關聯資料...');
  const ticket = await ticketRepository.findOne({
    where: { orderId, userId: ticketUserId },
    relations: ['ticketType', 'ticketType.concertSession'],
    select: {
      ticketId: true,
      orderId: true,
      userId: true,
      status: true,
      purchaserName: true,
      concertStartTime: true,
      qrCode: true,
      ticketType: {
        ticketTypeName: true,
        concertSession: {
          sessionTitle: true,
          sessionDate: true
        }
      }
    }
  });

  console.log('🔍 關聯票券查詢結果:', ticket ? '找到' : '未找到');

  if (!ticket) {
    console.log('🔍 關聯查詢失敗，使用基本票券資料');
    // 如果關聯查詢失敗，使用基本資料
    const fallbackTicket = basicTicket;
    
    // 檢查票券狀態
    if (fallbackTicket.status === 'used') {
      throw ApiError.create(400, '票券已被使用', ErrorCode.TICKET_ALREADY_USED);
    }

    if (fallbackTicket.status === 'refunded') {
      throw ApiError.create(400, '票券已退款，無法使用', ErrorCode.TICKET_REFUNDED);
    }

    if (fallbackTicket.status !== 'purchased') {
      throw ApiError.create(400, `票券狀態錯誤：${fallbackTicket.status}`, ErrorCode.INVALID_TICKET_STATUS);
    }

    // 核銷票券 - 更新狀態為 'used'
    fallbackTicket.status = 'used';
    await ticketRepository.save(fallbackTicket);

    const verifierType = isAdmin ? '管理員' : '主辦方';
    // 定義 toUTC8 函數（如果在 fallback 路徑中需要）
    const toUTC8Fallback = (date: Date) => {
      return new Date(date.getTime() + 8 * 60 * 60 * 1000);
    };
    const fallbackVerificationTimeUTC8 = toUTC8Fallback(new Date());
    console.log(`票券核銷成功 - 票券ID: ${fallbackTicket.ticketId}, 驗票人員: ${authenticatedUser.email} (${verifierType}), 時間: ${fallbackVerificationTimeUTC8.toISOString()} (UTC+8)`);

    return res.status(200).json({
      status: 'success',
      message: '票券驗證成功',
      data: {
        ticketId: fallbackTicket.ticketId,
        purchaserName: fallbackTicket.purchaserName,
        ticketTypeName: '無法獲取票種資訊',
        concertTitle: '無法獲取演場會資訊',
        concertDate: null,
        verifiedAt: fallbackVerificationTimeUTC8,
        verifiedBy: authenticatedUser.email,
        verifierType: verifierType
      }
    });
  }

  // 檢查票券狀態
  if (ticket.status === 'used') {
    throw ApiError.create(400, '票券已被使用', ErrorCode.TICKET_ALREADY_USED);
  }

  if (ticket.status === 'refunded') {
    throw ApiError.create(400, '票券已退款，無法使用', ErrorCode.TICKET_REFUNDED);
  }

  if (ticket.status !== 'purchased') {
    throw ApiError.create(400, `票券狀態錯誤：${ticket.status}`, ErrorCode.INVALID_TICKET_STATUS);
  }

  // 檢查演出時間（防止過早驗票）
  // 配合實際核銷時間使用 UTC+8 時區
  const toUTC8 = (date: Date) => {
    // 將 UTC 時間轉換為 UTC+8 (台北時區)
    return new Date(date.getTime() + 8 * 60 * 60 * 1000);
  };

  const nowUTC8 = toUTC8(new Date());
  const concertStartTimeUTC8 = toUTC8(new Date(ticket.concertStartTime));
  const maxAdvanceHours = 2; // 允許提前 2 小時驗票
  const earliestVerifyTimeUTC8 = new Date(concertStartTimeUTC8.getTime() - maxAdvanceHours * 60 * 60 * 1000);

  console.log('🔍 時間檢查 (UTC+8):', {
    nowUTC8: nowUTC8.toISOString(),
    concertStartTimeUTC8: concertStartTimeUTC8.toISOString(),
    earliestVerifyTimeUTC8: earliestVerifyTimeUTC8.toISOString(),
    canVerify: nowUTC8 >= earliestVerifyTimeUTC8
  });

  if (nowUTC8 < earliestVerifyTimeUTC8) {
    // 格式化顯示時間為台北時區格式
    const taipeiEarliestTime = earliestVerifyTimeUTC8.toLocaleString('zh-TW', { 
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    throw ApiError.create(
      400,
      `演出尚未開始，最早可於 ${taipeiEarliestTime} 開始驗票`,
      ErrorCode.TOO_EARLY_TO_VERIFY
    );
  }

  // 核銷票券 - 更新狀態為 'used'
  ticket.status = 'used';
  await ticketRepository.save(ticket);

  // 記錄驗票資訊（包含權限類型）
  const verifierType = isAdmin ? '管理員' : '主辦方';
  const verificationTimeUTC8 = toUTC8(new Date()); // 使用 UTC+8 時間
  console.log(`票券核銷成功 - 票券ID: ${ticket.ticketId}, 驗票人員: ${authenticatedUser.email} (${verifierType}), 時間: ${verificationTimeUTC8.toISOString()} (UTC-8)`);

  return res.status(200).json({
    status: 'success',
    message: '票券驗證成功',
    data: {
      ticketId: ticket.ticketId,
      purchaserName: ticket.purchaserName,
      ticketTypeName: ticket.ticketType.ticketTypeName,
      concertTitle: ticket.ticketType.concertSession.sessionTitle,
      concertDate: ticket.ticketType.concertSession.sessionDate,
      verifiedAt: verificationTimeUTC8,
      verifiedBy: authenticatedUser.email,
      verifierType: verifierType
    }
  });
});
