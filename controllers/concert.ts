// import { createConcert } from './concert';
import { Request, Response } from 'express';
import { AppDataSource } from '../config/database.js';
import { Concert } from '../models/concert.js';
import { TicketType } from '../models/ticket-type.js';
import { handleErrorAsync } from '../utils/handleErrorAsync.js';
import { ApiError } from '../utils/index.js';
import {
  CreateConcertRequest,
  ConcertResponse,
} from './../types/concert/index.js';
// import{ConcertsResponse}from './../types/concert/index.js';
// import{ConcertData}from './../types/concert/index.js';
import { ErrorCode } from '../types/api.js';
// import {ApiResponse} from '../types/api.js';

// 建立活動
export const createConcert = handleErrorAsync(
  async (req: Request, res: Response<ConcertResponse>) => {
    // 驗證
    const authenticatedUser = req.user as { userId: string }; // 來自 isAuthenticated
    if (!authenticatedUser || !authenticatedUser.userId) {
      throw ApiError.unauthorized();
    }
    // const userId = authenticatedUser.userId;

    const {
      organizationId,
      venueId,
      locationTagId,
      musicTagId,
      title,
      introduction,
      location,
      address,
      eventStartDate,
      eventEndDate,
      ticketPurchaseMethod,
      precautions,
      refundPolicy,
      conInfoStatus,
      ticketTypeName,
      entranceType,
      ticketBenefits,
      ticketRefundPolicy,
      ticketTypePrice,
      totalQuantity,
      sellBeginDate,
      sellEndDate,
      imgBanner,
      imgSeattable,
    } = req.body as CreateConcertRequest;

    // --- 基本驗證 ---
    if (
      !organizationId ||
      !venueId ||
      !locationTagId ||
      !musicTagId ||
      !title ||
      !introduction ||
      !location ||
      !address ||
      !eventStartDate ||
      !eventEndDate ||
      !ticketPurchaseMethod ||
      !precautions ||
      !refundPolicy ||
      !conInfoStatus ||
      !ticketTypeName ||
      !entranceType ||
      !ticketBenefits ||
      !ticketRefundPolicy ||
      !ticketTypePrice ||
      !totalQuantity ||
      !sellBeginDate ||
      !sellEndDate
    ) {
      throw ApiError.fieldRequired('所有欄位');
    }

    if (!imgBanner || !imgSeattable) {
      throw ApiError.fieldRequired('主視覺與座位圖');
    }

    if (typeof ticketTypePrice !== 'number' || ticketTypePrice < 0) {
      throw ApiError.invalidFormat('票種價格必須為非負數字，');
    }

    if (typeof totalQuantity !== 'number' || totalQuantity <= 0) {
      throw ApiError.invalidFormat('票券總數必須為正整數，');
    }

    const startDate = new Date(eventStartDate);
    const endDate = new Date(eventEndDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw ApiError.invalidFormat('活動開始與結束日期');
    }
    if (startDate >= endDate) {
      throw ApiError.invalidFormat('活動結束時間必須晚於開始時間，');
    }

    const sellStart = new Date(sellBeginDate);
    const sellEnd = new Date(sellEndDate);
    if (isNaN(sellStart.getTime()) || isNaN(sellEnd.getTime())) {
      throw ApiError.invalidFormat('售票開始與結束日期');
    }
    if (sellStart >= sellEnd) {
      throw ApiError.invalidFormat('售票結束時間必須晚於開始時間，');
    }
    // --- 驗證結束 ---

    const concertRepository = AppDataSource.getRepository(Concert);

    // 檢查名稱是否重複
    const existingConcert = await concertRepository.findOne({
      where: { conTitle: title },
    });
    if (existingConcert) {
      throw ApiError.create(
        409,
        '此活動名稱已被使用',
        ErrorCode.DATA_ALREADY_EXISTS
      );
    }

    // 創建演唱會
    const newConcert = concertRepository.create(
      Object.assign(
        {},
        {
          organizationId,
          venueId,
          locationTagId,
          musicTagId,
          conTitle: title,
          conIntroduction: introduction,
          conLocation: location,
          conAddress: address,
          eventStartDate: new Date(eventStartDate),
          eventEndDate: new Date(eventEndDate),
          imgBanner: imgBanner,
          imgSeattable: imgSeattable,
          ticketPurchaseMethod,
          precautions,
          refundPolicy,
          conInfoStatus,
        }
      )
    );

    const savedConcert = await concertRepository.save(newConcert);

    // 創建票種
    const ticketTypeRepository = AppDataSource.getRepository(TicketType);
    const ticketType = ticketTypeRepository.create({
      concert: savedConcert,
      ticketTypeName,
      entranceType,
      ticketBenefits,
      ticketRefundPolicy,
      ticketTypePrice,
      totalQuantity,
      remainingQuantity: totalQuantity,
      sellBeginDate: new Date(sellBeginDate),
      sellEndDate: new Date(sellEndDate),
    });
    await ticketTypeRepository.save(ticketType);

    // 成功！
    res.status(201).json({
      status: 'success',
      message: '演唱會活動建立成功！',
      data: { concert: savedConcert },
    });
  }
);
