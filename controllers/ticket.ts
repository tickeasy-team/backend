import { Request, Response } from 'express';
import { AppDataSource } from '../config/database.js';
// import { Ticket as TicketEntity} from '../models/ticket.js';
import { TicketType as TicketTypeEntity} from '../models/ticket-type.js';
import { handleErrorAsync, ApiError } from '../utils/index.js';
import { ApiResponse } from '../types/api.js';
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
