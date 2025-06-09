import { Request, Response } from 'express';
import { AppDataSource } from '../config/database.js';
// import { Ticket as TicketEntity} from '../models/ticket.js';
import { TicketType as TicketTypeEntity} from '../models/ticket-type.js';
import { handleErrorAsync, ApiError } from '../utils/index.js';
import { ApiResponse } from '../types/api.js';
// import { Index } from 'typeorm';
import { Payment as PaymentEntity} from '../models/payment.js';
import crypto from 'crypto';
import axios, { AxiosResponse } from 'axios';

import { Order, OrderStatus } from '../models/order.js';
import { v4 as uuidv4 } from 'uuid'; // 用來產生 lockToken
const { MERCHANTID, HASHKEY, HASHIV, HOST, REDIRECTURL} = process.env;

// 環境變數檢查
if (!MERCHANTID || !HASHKEY || !HASHIV || !HOST || !REDIRECTURL) {
  throw new Error('缺少必要的環境變數：MERCHANTID, HASHKEY, HASHIV, HOST, REDIRECTURL');
}

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

export const refundOrder = handleErrorAsync(async (req: Request, res: Response<ApiResponse>) => {

  const { orderId } = req.body;
  // const authenticatedUser = req.user as Express.User; // 從 middleware 拿到 userId
  const authenticatedUser = req.user as { userId: string; role: string; email: string; };

  // console.log('order:', orderId);
  // console.log('authenticatedUser:', authenticatedUser);

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(orderId)) {
    throw ApiError.invalidFormat('票種 ID');
  }

  const orderRepository = AppDataSource.getRepository(Order);

  const selectedOrder = await orderRepository.findOne({
    where: { orderId }
  });

  if (!selectedOrder) {
    throw ApiError.notFound('訂單 ID');
  }

  // 使用者不同要回傳forbidden
  if (selectedOrder.userId !== authenticatedUser.userId) {
    throw ApiError.forbidden();
  }

  // console.log('order:', selectedOrder);

  
  const paymentRepository = AppDataSource.getRepository(PaymentEntity);
  const selectedPayment = await paymentRepository.findOne({
    where: { orderId },
    relations: [ 'order' ]
  });

  // console.log(selectedPayment);
  if (!selectedPayment) {
    throw ApiError.notFound('支付記錄');
  }

  if (selectedPayment.status !== 'completed'){
    throw ApiError.forbidden();
  }

  let TradeNo = selectedPayment.tradeNo;
  // console.log(TradeNo);
  
  if (TradeNo === ''){
    throw ApiError.notFound('綠界交易編號');
  }

  const MerchantTradeNo = selectedPayment.transactionId;
  const TotalAmount = Number(selectedPayment.amount).toString();
  const data: Record<string, any> = {
    MerchantID: MERCHANTID,
    MerchantTradeNo: MerchantTradeNo,
    TradeNo: TradeNo,
    Action: 'R', // R=退款, C=取消授權
    TotalAmount: TotalAmount
  };

  data.CheckMacValue = generateCheckMacValue(data);
  // console.log(data);
  const apiUrl = 'https://payment-stage.ecpay.com.tw/CreditDetail/DoAction';
  
  try {
    const response: AxiosResponse<string> = await axios.post(apiUrl, 
      new URLSearchParams(data).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 30000
      }
    );

    if (response.status !== 200) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    console.log(response.data);
    const result: Record<string, string> = {};
    const pairs = response.data.split('&');
    
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key && value !== undefined) {
        result[decodeURIComponent(key)] = decodeURIComponent(value);
      }
    }
    console.log(result);
    if (result.RtnCode === '1' ){
      selectedOrder.orderStatus = 'refunded';
      selectedOrder.updatedAt = new Date();
      await orderRepository.save(selectedOrder);
      console.log('order update');
      selectedPayment.status = 'refunded';
      selectedPayment.updatedAt = new Date();
      await paymentRepository.save(selectedPayment);
      console.log('payment update');
    }
    else{
      return res.status(200).json({
        status: 'failed',
        message: '申請退款失敗'
      });
    }
    return res.status(200).json({
      status: 'success',
      message: '退款申請成功'
    });

  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Request Error: ${error.message}`);
    }
    throw error;
  }  
});

function generateCheckMacValue(data: Record<string, any>): string {
    // 移除CheckMacValue
    const { CheckMacValue, ...cleanData } = data;

    // 按照ASCII排序
    const sortedKeys = Object.keys(cleanData).sort();

    // 組合參數字串
    let checkStr = `HashKey=${HASHKEY}`;
    for (const key of sortedKeys) {
      checkStr += `&${key}=${cleanData[key]}`;
    }
    checkStr += `&HashIV=${HASHIV}`;
    console.log("checkStr:", checkStr);
    // URL編碼
    let encodedStr = encodeURIComponent(checkStr).toLowerCase();

    // 轉換特殊字符
    encodedStr = encodedStr
      .replace(/%2d/g, '-')
      .replace(/%5f/g, '_')
      .replace(/%2e/g, '.')
      .replace(/%21/g, '!')
      .replace(/%2a/g, '*')
      .replace(/%28/g, '(')
      .replace(/%29/g, ')');

    // 產生雜湊值
    return crypto.createHash('sha256').update(encodedStr).digest('hex').toUpperCase();
  }
