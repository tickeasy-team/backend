import { Request, Response } from 'express';
import { AppDataSource } from '../config/database.js';
import { Concert } from '../models/concert.js';
import { Venue } from '../models/venue.js';
import { TicketType } from '../models/ticket-type.js';
import { handleErrorAsync } from '../utils/handleErrorAsync.js';
import { ApiError } from '../utils/index.js';
import {
    CreateConcertRequest,
    ConcertResponse,
} from './../types/concert/index.js';
import { ErrorCode } from '../types/api.js';

/**
 * INDEX
 * 1. 建立活動
 * 2. 修改活動
 * 3. 獲得場地的資料
 * 4. 取得熱門活動
 * 5. 增加visitCount
 * 6. 設定promotion權重
 * 7. 搜尋活動
 * 8. 獲得首頁promo的banner
 * 9. 取消活動
 */

// ------------1. 建立活動-------------
export const createConcert = handleErrorAsync(
    async (req: Request, res: Response<ConcertResponse>) => {
        // 驗證
        const authenticatedUser = req.user as { userId: string }; // 來自 isAuthenticated
        if (!authenticatedUser || !authenticatedUser.userId) {
            throw ApiError.unauthorized();
        }

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
            ticketTypes,
            imgBanner,
            imgSeattable,
        } = req.body as CreateConcertRequest;

        // 是否為草稿狀態
        const isDraft = conInfoStatus === 'draft';

        // --- 基本驗證 ---
        // 驗證活動
        if (!isDraft) {
            // 草稿後端不驗證
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
                !conInfoStatus
            ) {
                throw ApiError.fieldRequired('所有欄位');
            }

            if (!imgBanner || !imgSeattable) {
                throw ApiError.fieldRequired('主視覺與座位圖');
            }

            const startDate = new Date(eventStartDate);
            const endDate = new Date(eventEndDate);
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                throw ApiError.invalidFormat('活動開始與結束日期');
            }
            if (startDate >= endDate) {
                throw ApiError.invalidFormat('活動結束時間必須晚於開始時間，');
            }
        }
        // 驗證票種
        if (!isDraft) {
            if (!Array.isArray(ticketTypes)) {
                throw ApiError.fieldRequired('票種格式錯誤');
            }

            for (const ticket of ticketTypes) {
                if (
                    !ticket.ticketTypeName ||
                    !ticket.entranceType ||
                    !ticket.ticketBenefits ||
                    !ticket.ticketRefundPolicy ||
                    typeof ticket.ticketTypePrice !== 'number' ||
                    ticket.ticketTypePrice < 0 ||
                    typeof ticket.totalQuantity !== 'number' ||
                    ticket.totalQuantity <= 0 ||
                    !ticket.sellBeginDate ||
                    !ticket.sellEndDate
                ) {
                    throw ApiError.invalidFormat('票種資料格式錯誤');
                }
                if (
                    typeof ticket.ticketTypePrice !== 'number' ||
                    ticket.ticketTypePrice < 0
                ) {
                    throw ApiError.invalidFormat('票種價格必須為非負數字');
                }
                if (
                    typeof ticket.totalQuantity !== 'number' ||
                    ticket.totalQuantity <= 0
                ) {
                    throw ApiError.invalidFormat('票券總數必須為正整數');
                }

                const sellStart = new Date(ticket.sellBeginDate);
                const sellEnd = new Date(ticket.sellEndDate);
                if (isNaN(sellStart.getTime()) || isNaN(sellEnd.getTime())) {
                    throw ApiError.invalidFormat(
                        '票種售票開始與結束日期格式錯誤'
                    );
                }
                if (sellStart >= sellEnd) {
                    throw ApiError.invalidFormat(
                        '售票結束時間必須晚於開始時間'
                    );
                }
            }
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
                    conIntroduction: introduction ?? '',
                    conLocation: location ?? '',
                    conAddress: address ?? '',
                    eventStartDate: new Date(eventStartDate ?? ''),
                    eventEndDate: new Date(eventEndDate ?? ''),
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

        // 創建票種(要可以建立很多個，回傳陣列)
        const ticketTypeRepository = AppDataSource.getRepository(TicketType);
        const ticketTypeEntities = ticketTypes.map(ticket =>
            ticketTypeRepository.create({
                concert: savedConcert,
                ticketTypeName: ticket.ticketTypeName,
                entranceType: ticket.entranceType,
                ticketBenefits: ticket.ticketBenefits,
                ticketRefundPolicy: ticket.ticketRefundPolicy,
                ticketTypePrice: ticket.ticketTypePrice,
                totalQuantity: ticket.totalQuantity,
                remainingQuantity: ticket.totalQuantity,
                sellBeginDate: new Date(ticket.sellBeginDate),
                sellEndDate: new Date(ticket.sellEndDate),
            })
        );

        await ticketTypeRepository.save(ticketTypeEntities);

        // 成功！
        const savedTicketTypes = await ticketTypeRepository.save(
            ticketTypeEntities
        );
        res.status(201).json({
            status: 'success',
            message: '演唱會活動建立成功！',
            data: {
                concert: savedConcert,
                ticketTypes: savedTicketTypes.map(ticket => ({
                    ticketTypeId: ticket.ticketTypeId,
                    ticketTypeName: ticket.ticketTypeName,
                    entranceType: ticket.entranceType,
                    ticketBenefits: ticket.ticketBenefits,
                    ticketRefundPolicy: ticket.ticketRefundPolicy,
                    ticketTypePrice: ticket.ticketTypePrice,
                    totalQuantity: ticket.totalQuantity,
                    remainingQuantity: ticket.remainingQuantity,
                    sellBeginDate:
                        ticket.sellBeginDate instanceof Date
                            ? ticket.sellBeginDate.toISOString()
                            : ticket.sellBeginDate,
                    sellEndDate:
                        ticket.sellEndDate instanceof Date
                            ? ticket.sellEndDate.toISOString()
                            : ticket.sellEndDate,
                })),
            },
        });
    }
);

// ------------2. 修改活動-------------
export const updateConcert = handleErrorAsync(
    async (req: Request, res: Response<ConcertResponse>) => {
        const authenticatedUser = req.user as { userId: string };
        if (!authenticatedUser?.userId) {
            throw ApiError.unauthorized();
        }

        const concertId = req.params.concertId;

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
            imgBanner,
            imgSeattable,
            ticketTypes,
        } = req.body as CreateConcertRequest;

        const concertRepository = AppDataSource.getRepository(Concert);
        const ticketTypeRepository = AppDataSource.getRepository(TicketType);

        const concert = await concertRepository.findOne({
            where: { concertId },
        });

        if (!concert) {
            throw ApiError.notFound('演唱會不存在');
        }

        if (concert.conInfoStatus !== 'draft') {
            throw ApiError.badRequest('僅能編輯草稿中的演唱會');
        }

        const isDraft = conInfoStatus === 'draft';

        // ---------- 驗證活動主資料 ----------
        if (!isDraft) {
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
                !conInfoStatus
            ) {
                throw ApiError.fieldRequired('所有欄位');
            }

            if (!imgBanner || !imgSeattable) {
                throw ApiError.fieldRequired('主視覺與座位圖');
            }

            const startDate = new Date(eventStartDate);
            const endDate = new Date(eventEndDate);
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                throw ApiError.invalidFormat('活動開始與結束日期');
            }
            if (startDate >= endDate) {
                throw ApiError.invalidFormat('活動結束時間必須晚於開始時間');
            }
        }

        // ---------- 驗證票種 ----------
        if (!isDraft) {
            if (!Array.isArray(ticketTypes) || ticketTypes.length === 0) {
                throw ApiError.fieldRequired('至少需要一種票種');
            }

            for (const ticket of ticketTypes) {
                if (
                    !ticket.ticketTypeName ||
                    !ticket.entranceType ||
                    !ticket.ticketBenefits ||
                    !ticket.ticketRefundPolicy ||
                    typeof ticket.ticketTypePrice !== 'number' ||
                    ticket.ticketTypePrice < 0 ||
                    typeof ticket.totalQuantity !== 'number' ||
                    ticket.totalQuantity <= 0 ||
                    !ticket.sellBeginDate ||
                    !ticket.sellEndDate
                ) {
                    throw ApiError.invalidFormat('票種資料格式錯誤');
                }

                const sellStart = new Date(ticket.sellBeginDate);
                const sellEnd = new Date(ticket.sellEndDate);
                if (isNaN(sellStart.getTime()) || isNaN(sellEnd.getTime())) {
                    throw ApiError.invalidFormat(
                        '票種售票開始與結束日期格式錯誤'
                    );
                }
                if (sellStart >= sellEnd) {
                    throw ApiError.invalidFormat(
                        '售票結束時間必須晚於開始時間'
                    );
                }
            }
        }

        // ---------- 更新演唱會 ----------
        concert.organizationId = organizationId;
        concert.venueId = venueId;
        concert.locationTagId = locationTagId;
        concert.musicTagId = musicTagId;
        concert.conTitle = title;
        concert.conIntroduction = introduction ?? '';
        concert.conLocation = location ?? '';
        concert.conAddress = address ?? '';
        if (eventStartDate) {
            concert.eventStartDate = new Date(eventStartDate);
        }
        if (eventEndDate) {
            concert.eventEndDate = new Date(eventEndDate);
        }
        concert.ticketPurchaseMethod = ticketPurchaseMethod;
        concert.precautions = precautions;
        concert.refundPolicy = refundPolicy;
        concert.conInfoStatus = conInfoStatus;
        concert.imgBanner = imgBanner;
        concert.imgSeattable = imgSeattable;

        await concertRepository.save(concert);

        let savedTicketTypes: TicketType[] = [];

        // ---------- 刪除舊票種並建立新票種 ----------

        await ticketTypeRepository.delete({ concert: { concertId } });

        const ticketTypeEntities = ticketTypes.map(ticket =>
            ticketTypeRepository.create({
                concert,
                ticketTypeName: ticket.ticketTypeName,
                entranceType: ticket.entranceType,
                ticketBenefits: ticket.ticketBenefits,
                ticketRefundPolicy: ticket.ticketRefundPolicy,
                ticketTypePrice: ticket.ticketTypePrice,
                totalQuantity: ticket.totalQuantity,
                remainingQuantity: ticket.totalQuantity,
                sellBeginDate: new Date(ticket.sellBeginDate),
                sellEndDate: new Date(ticket.sellEndDate),
            })
        );

        savedTicketTypes = await ticketTypeRepository.save(ticketTypeEntities);

        res.status(200).json({
            status: 'success',
            message: '演唱會內容更新成功',
            data: {
                concert: {
                    concertId: concert.concertId,
                    organizationId: concert.organizationId,
                    venueId: concert.venueId,
                    locationTagId: concert.locationTagId,
                    musicTagId: concert.musicTagId,
                    conTitle: concert.conTitle,
                    conIntroduction: concert.conIntroduction,
                    conLocation: concert.conLocation,
                    conAddress: concert.conAddress,
                    eventStartDate: concert.eventStartDate,
                    eventEndDate: concert.eventEndDate,
                    imgBanner: concert.imgBanner,
                    imgSeattable: concert.imgSeattable,
                    ticketPurchaseMethod: concert.ticketPurchaseMethod,
                    precautions: concert.precautions,
                    refundPolicy: concert.refundPolicy,
                    conInfoStatus: concert.conInfoStatus,
                    reviewStatus: concert.reviewStatus,
                    visitCount: concert.visitCount,
                    promotion: concert.promotion,
                    cancelledAt: concert.cancelledAt,
                    createdAt: concert.createdAt,
                    updatedAt: concert.updatedAt,
                },
                ticketTypes: savedTicketTypes.map(ticket => ({
                    ticketTypeId: ticket.ticketTypeId,
                    ticketTypeName: ticket.ticketTypeName,
                    entranceType: ticket.entranceType,
                    ticketBenefits: ticket.ticketBenefits,
                    ticketRefundPolicy: ticket.ticketRefundPolicy,
                    ticketTypePrice: ticket.ticketTypePrice,
                    totalQuantity: ticket.totalQuantity,
                    remainingQuantity: ticket.remainingQuantity,
                    sellBeginDate: ticket.sellBeginDate.toISOString(),
                    sellEndDate: ticket.sellEndDate.toISOString(),
                })),
            },
        });
    }
);

// ------------3. 獲得場地的資料-------------
export const getAllVenues = handleErrorAsync(
    async (req: Request, res: Response) => {
        const venueRepository = AppDataSource.getRepository(Venue);
        const venues = await venueRepository.find();
        res.status(200).json({
            message: '成功取得場館資料',
            status: 'success',
            data: venues,
        });
    }
);

// ------------4. 取得熱門活動-------------
// 取得熱門活動, 首頁
// 先依據promotion權重降序，若promotion相同，再依visitCount排序
export const getPopularConcerts = handleErrorAsync(
    async (req: Request, res: Response) => {
        const concertRepository = AppDataSource.getRepository(Concert);
        const take = Number(req.query.take) || 3;

        const popularConcerts = await concertRepository.find({
            where: {
                conInfoStatus: 'published', // 僅顯示已發佈活動
            },
            order: {
                promotion: 'ASC',
                visitCount: 'ASC',
            },
            take,
            select: [
                'concertId',
                'conTitle',
                'conIntroduction',
                'imgBanner',
                'promotion',
                'visitCount',
            ],
        });

        if (!popularConcerts.length) {
            throw ApiError.notFound('熱門演唱會資料');
        }

        res.status(200).json({
            message: '取得資料成功',
            status: 'success',
            data: popularConcerts,
        });
    }
);

//------------5. 增加visitCount-------------
export const incrementVisitCount = handleErrorAsync(
    async (req: Request, res: Response) => {
        const concertId = req.params.concertId;
        const concertRepo = AppDataSource.getRepository(Concert);

        const concert = await concertRepo.findOne({ where: { concertId } });
        if (!concert) throw ApiError.notFound('演唱會不存在');

        concert.visitCount += 1;
        await concertRepo.save(concert);

        res.status(200).json({
            status: 'success',
            message: '參觀人數已增加',
            data: { visitCount: concert.visitCount },
        });
    }
);

//------------6. 設定promotion權重-------------
export const updatePromotion = handleErrorAsync(
    async (req: Request, res: Response) => {
        const concertId = req.params.concertId;
        const { promotion } = req.body as { promotion: number };

        if (typeof promotion !== 'number' || promotion < 0) {
            throw ApiError.invalidFormat('promotion 欄位必須為非負整數');
        }

        const concertRepo = AppDataSource.getRepository(Concert);
        const concert = await concertRepo.findOne({ where: { concertId } });

        if (!concert) throw ApiError.notFound('演唱會不存在');

        concert.promotion = promotion;
        await concertRepo.save(concert);

        res.status(200).json({
            status: 'success',
            message: 'promotion 權重更新成功',
            data: { concertId, promotion },
        });
    }
);

//------------7. 搜尋活動----------------
export const searchConcerts = handleErrorAsync(
    async (req: Request, res: Response) => {
        const concertRepository = AppDataSource.getRepository(Concert);
        const {
            keyword = '',
            locationTagId,
            musicTagId,
            startDate,
            endDate,
            page = 1,
            perPage = 10,
            sortedBy = 'newToOld',
        } = req.query as Record<string, string>;

        const take = parseInt(perPage.toString(), 10);
        const skip = (parseInt(page.toString(), 10) - 1) * take;

        const query = concertRepository
            .createQueryBuilder('concert')
            .leftJoinAndSelect('concert.venue', 'venue')
            .leftJoinAndSelect('concert.locationTag', 'locationTag')
            .leftJoinAndSelect('concert.musicTag', 'musicTag')
            .where('concert.conInfoStatus = :status', { status: 'published' });

        if (keyword) {
            query.andWhere(
                '(concert.conTitle ILIKE :keyword OR concert.conIntroduction ILIKE :keyword)',
                { keyword: `%${keyword}%` }
            );
        }

        if (locationTagId) {
            query.andWhere('concert.locationTagId = :locationTagId', {
                locationTagId,
            });
        }

        if (musicTagId) {
            query.andWhere('concert.musicTagId = :musicTagId', { musicTagId });
        }

        if (startDate) {
            query.andWhere('concert.eventStartDate >= :startDate', {
                startDate,
            });
        }

        if (endDate) {
            query.andWhere('concert.eventEndDate <= :endDate', { endDate });
        }

        if (sortedBy === 'newToOld') {
            query.orderBy('concert.eventStartDate', 'DESC');
        } else if (sortedBy === 'oldToNew') {
            query.orderBy('concert.eventStartDate', 'ASC');
        }

        const [concerts, count] = await query
            .skip(skip)
            .take(take)
            .getManyAndCount();

        const result = concerts.map(concert => ({
            concertId: concert.concertId,
            conTitle: concert.conTitle,
            conIntroduction: concert.conIntroduction,
            eventStartDate: concert.eventStartDate,
            eventEndDate: concert.eventEndDate,
            imgBanner: concert.imgBanner,
            venueName: (concert as any).venue?.venueName,
            locationTagName: (concert as any).locationTag?.locationTagName,
            musicTagName: (concert as any).musicTag?.musicTagName,
        }));

        if (!result.length) {
            throw ApiError.notFound('演唱會資料');
        }

        res.status(200).json({
            status: 'success',
            message: '成功取得搜尋資料',
            data: result,
            page: parseInt(page.toString(), 10),
            perPage: take,
            count,
            totalPages: Math.ceil(count / take),
            sortedBy,
        });
    }
);

//---------8. 獲得首頁promo的banner--------
export const getBannerConcerts = handleErrorAsync(
    async (req: Request, res: Response) => {
        const concertRepository = AppDataSource.getRepository(Concert);

        const concerts = await concertRepository.find({
            where: {
                conInfoStatus: 'published',
            },
            order: {
                promotion: 'ASC',
                visitCount: 'ASC',
            },
            select: [
                'concertId',
                'conTitle',
                'conIntroduction',
                'imgBanner',
                'promotion',
                'visitCount',
            ],
            take: 5,
        });

        if (!concerts.length) {
            throw ApiError.notFound('熱門活動banner');
        }

        res.status(200).json({
            message: '取得資料成功',
            status: 'success',
            data: concerts,
        });
    }
);

//---------9. 取消活動--------

export const deleteConcert = handleErrorAsync(
    async (req: Request, res: Response) => {
        const authenticatedUser = req.user as { userId: string };
        if (!authenticatedUser || !authenticatedUser.userId) {
            throw ApiError.unauthorized();
        }

        const concertId = req.params.concertId;
        const concertRepository = AppDataSource.getRepository(Concert);

        const concert = await concertRepository.findOne({
            where: { concertId },
        });

        if (!concert) {
            throw ApiError.notFound('演唱會不存在');
        }

        if (concert.conInfoStatus !== 'draft') {
            throw ApiError.badRequest('僅能刪除草稿中的演唱會');
        }

        await concertRepository.remove(concert);

        res.status(200).json({
            status: 'success',
            message: '演唱會已成功刪除',
        });
    }
);
