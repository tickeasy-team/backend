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

  // 驗證 UUID 格式
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(ticketUserId) || !uuidRegex.test(orderId)) {
    throw ApiError.create(400, 'QR Code 中的 ID 格式錯誤', ErrorCode.INVALID_UUID_FORMAT);
  }

  const ticketRepository = AppDataSource.getRepository(TicketEntity);
  const orderRepository = AppDataSource.getRepository(OrderEntity);

  // 查找對應的訂單
  const order = await orderRepository.findOne({
    where: { orderId, userId: ticketUserId },
    select: ['orderId', 'userId', 'orderStatus']
  });

  if (!order) {
    throw ApiError.create(404, '找不到對應的訂單', ErrorCode.ORDER_NOT_FOUND);
  }

  // 檢查訂單狀態
  if (order.orderStatus !== 'paid') {
    throw ApiError.create(400, `訂單狀態錯誤：${order.orderStatus}`, ErrorCode.INVALID_ORDER_STATUS);
  }

  // 查找對應的票券
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

  if (!ticket) {
    throw ApiError.create(404, '找不到對應的票券', ErrorCode.TICKET_NOT_FOUND);
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

  // 檢查演出時間（可選：防止提前太多驗票）
  const now = new Date();
  const concertStartTime = new Date(ticket.concertStartTime);
  const maxAdvanceHours = 2; // 允許提前 2 小時驗票
  const earliestVerifyTime = new Date(concertStartTime.getTime() - (maxAdvanceHours * 60 * 60 * 1000));
  
  if (now < earliestVerifyTime) {
    throw ApiError.create(400, `演出尚未開始，最早可於 ${earliestVerifyTime.toLocaleString()} 開始驗票`, ErrorCode.TOO_EARLY_TO_VERIFY);
  }

  // 核銷票券 - 更新狀態為 'used'
  ticket.status = 'used';
  await ticketRepository.save(ticket);

  // 記錄驗票資訊（可以擴展為添加驗票記錄表）
  console.log(`票券核銷成功 - 票券ID: ${ticket.ticketId}, 驗票人員: ${authenticatedUser.email}, 時間: ${now.toISOString()}`);

  return res.status(200).json({
    status: 'success',
    message: '票券驗證成功',
    data: {
      ticketId: ticket.ticketId,
      purchaserName: ticket.purchaserName,
      ticketTypeName: ticket.ticketType.ticketTypeName,
      concertTitle: ticket.ticketType.concertSession.sessionTitle,
      concertDate: ticket.ticketType.concertSession.sessionDate,
      verifiedAt: now,
      verifiedBy: authenticatedUser.email
    }
  });
});
