import { Request, Response } from 'express';
import { AppDataSource } from '../config/database.js';
// import { Ticket as TicketEntity} from '../models/ticket.js';
import { Payment as PaymentEntity} from '../models/payment.js';
import { Order as OrderEntity} from '../models/order.js';
import { handleErrorAsync, ApiError } from '../utils/index.js';
import { ApiResponse } from '../types/api.js';
// import { Index } from 'typeorm';


const { MERCHANTID, HASHKEY, HASHIV, HOST} = process.env;
console.log( MERCHANTID, HASHKEY, HASHIV, HOST)

export const getECpayurl = handleErrorAsync(async (req: Request, res: Response<ApiResponse>) => {
  const ecpay_payment: any = await import('ecpay_aio_nodejs').then(m => m.default || m);

  // req.user 由 isAuth 中間件設置，包含 userId, email, role
  // const authenticatedUser = req.user as Express.User;
  const orderId = req.params.orderId;
  console.log(orderId);
  if (!orderId) {
    throw ApiError.fieldRequired('orderId');
  }

  // 使用 TypeORM 查找用戶
  const OrderRepository = AppDataSource.getRepository(OrderEntity);
    const selectedOrder = await OrderRepository.findOne({
      where: { orderId: orderId }
      
    });
  console.log("order:",selectedOrder);
  const options = {
    OperationMode: 'Test',
    MercProfile: {
      MerchantID: MERCHANTID,
      HashKey: HASHKEY,
      HashIV: HASHIV,
    },
    IgnorePayment: [],
    IsProjectContractor: false,
  };

  const payment = new ecpay_payment(options);
  const MerchantTradeDate = new Date().toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/\//g, '/');
  const base_param = {
    MerchantTradeNo: `1234567${new Date().getTime()}`,
    MerchantTradeDate: MerchantTradeDate,
    TotalAmount: '100',
    TradeDesc: '測試交易描述',
    ItemName: '測試商品',
    ReturnURL: `${HOST}/return`,
    ChoosePayment: 'ALL',
  };

  const html = payment.payment_client.aio_check_out_all(base_param, {}, {});
  // res.render('checkout', { title: 'Checkout Page', html });

  return res.status(200).json({
    status: 'success',
    message: '獲取演唱會票券成功',
    data: html
  });
});

export const getECpayReturn = handleErrorAsync(async (req: Request, res: Response) => {
  console.log('ECPay Return:', req.body);
  res.send('1|OK');
});

