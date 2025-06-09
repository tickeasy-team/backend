import { Request, Response } from 'express';
import { AppDataSource } from '../config/database.js';
// import { Ticket as TicketEntity} from '../models/ticket.js';
import { TicketType as TicketTypeEntity} from '../models/ticket-type.js';
import { handleErrorAsync, ApiError } from '../utils/index.js';
import { ApiResponse } from '../types/api.js';
// import { Index } from 'typeorm';

import { Order, OrderStatus } from '../models/order.js';
import { v4 as uuidv4 } from 'uuid'; // 用來產生 lockToken

export const createOrder = handleErrorAsync(async (req: Request, res: Response<ApiResponse>) => {

  const { ticketTypeId, purchaserName, purchaserEmail, purchaserPhone } = req.body;
  // const authenticatedUser = req.user as Express.User; // 從 middleware 拿到 userId
  const authenticatedUser = req.user as { userId: string; role: string; email: string; };

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(ticketTypeId)) {
    throw ApiError.invalidFormat('票種 ID');
  }

  const ticketTypeRepository = AppDataSource.getRepository(TicketTypeEntity);
  const orderRepository = AppDataSource.getRepository(Order);

  const selectedTicket = await ticketTypeRepository.findOne({
    where: { ticketTypeId },
    select: ['ticketTypeName', 'totalQuantity', 'remainingQuantity', 'sellBeginDate', 'sellEndDate'],
  });

  if (!selectedTicket) {
    throw ApiError.notFound('演唱會票券');
  }

  const now = new Date();
  if (now < selectedTicket.sellBeginDate || now > selectedTicket.sellEndDate) {
    throw ApiError.outOfTimeRange(selectedTicket.ticketTypeName);
  }

  // 扣庫存
  const updateResult = await ticketTypeRepository
    .createQueryBuilder()
    .update(TicketTypeEntity)
    .set({ remainingQuantity: () => 'remainingQuantity - 1' })
    .where('ticketTypeId = :id', { id: ticketTypeId })
    .andWhere('remainingQuantity > 0')
    .execute();

  if (!updateResult.affected || updateResult.affected === 0) {
    return res.status(400).json(
          {
        status: 'failed',
        message : '票券已售罄'
      }
  );
  };

  // 設定 lock 時間（例如 15 分鐘後過期）
  const lockExpireTime = new Date(now.getTime() + 15 * 60 * 1000);

  // 創建新訂單
  const newOrder = orderRepository.create({
    ticketTypeId,
    userId: authenticatedUser.userId,
    orderStatus: 'held' as OrderStatus,
    isLocked: true,
    lockToken: uuidv4(),
    lockExpireTime,
    purchaserName,
    purchaserEmail,
    purchaserPhone,
    createdAt: now,
    updatedAt: now,
  });

  const savedOrder = await orderRepository.save(newOrder);

  // console.log(`✅ 訂單 ${savedOrder.orderId} 創建成功`);

  return res.status(200).json({
    status: 'success',
    message: '訂單創建成功',
    data: {
      orderId: savedOrder.orderId,
      lockExpireTime: savedOrder.lockExpireTime,
    },
  }); 
});

