/**
 * 客服對話 Controller
 * 處理客服聊天 API 請求
 */

import { Request, Response } from 'express';
import { AppDataSource } from '../config/database.js';
import { SupportSession, SessionType, SessionStatus, Priority } from '../models/support-session.js';
import { SupportMessage, SenderType, MessageType } from '../models/support-message.js';
// import { User } from '../models/user.js'; // 暫時未使用
import { chatService } from '../services/chat-service.js';

export class SupportController {
  
  /**
   * 開始新的客服會話
   * POST /api/v1/support/chat/start
   */
  static async startSession(req: Request, res: Response) {
    try {
      const { userId, category, initialMessage } = req.body;

      const supportSessionRepo = AppDataSource.getRepository(SupportSession);

      // 如果有 userId，檢查是否已有活躍會話
      let existingSession = null;
      if (userId) {
        existingSession = await supportSessionRepo.findOne({
          where: {
            userId,
            status: SessionStatus.ACTIVE
          }
        });
      }

      let session: SupportSession;

      if (existingSession) {
        // 使用現有會話
        session = existingSession;
      } else {
        // 建立新會話
        session = new SupportSession();
        session.userId = userId || null; // 允許不提供 userId (匿名用戶)
        session.sessionType = SessionType.BOT;
        session.status = SessionStatus.ACTIVE;
        session.priority = Priority.NORMAL;
        session.category = category || '一般諮詢';
        
        session = await supportSessionRepo.save(session);
      }

      // 如果有初始訊息，使用統一客服服務處理
      if (initialMessage) {
        const aiResult = await chatService.chat(initialMessage, {
          category: session.category,
          createSession: true, // 讓統一服務處理訊息記錄
          userId: session.userId,
          sessionId: session.supportSessionId
        });

        // 檢查是否需要轉接人工
        if (aiResult.shouldTransfer) {
          session.status = SessionStatus.WAITING;
          await supportSessionRepo.save(session);
        }

        // 設定首次回應時間
        if (!session.firstResponseAt) {
          session.firstResponseAt = new Date();
          await supportSessionRepo.save(session);
        }

        res.status(201).json({
          success: true,
          message: '會話已開始',
          data: {
            sessionId: session.supportSessionId,
            status: session.status,
            botMessage: {
              text: aiResult.message,
              confidence: aiResult.confidence,
              shouldTransfer: aiResult.shouldTransfer,
              sources: aiResult.sources
            }
          }
        });
      } else {
        res.status(201).json({
          success: true,
          message: '會話已建立',
          data: {
            sessionId: session.supportSessionId,
            status: session.status
          }
        });
      }

    } catch (error: any) {
      console.error('❌ 開始會話失敗:', error);
      res.status(500).json({
        success: false,
        message: '開始會話失敗',
        error: error.message
      });
    }
  }

  /**
   * 發送訊息
   * POST /api/v1/support/chat/message
   */
  static async sendMessage(req: Request, res: Response) {
    try {
      const { sessionId, message } = req.body;
      const userId = (req.user as any)?.userId; // 可能為 null (匿名用戶)

      const supportSessionRepo = AppDataSource.getRepository(SupportSession);

      // 檢查會話是否存在
      const whereClause: any = { supportSessionId: sessionId };
      if (userId) {
        whereClause.userId = userId;
      }

      const session = await supportSessionRepo.findOne({
        where: whereClause,
        relations: ['messages']
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: '會話不存在或無權限'
        });
      }

      if (!session.isActive) {
        return res.status(400).json({
          success: false,
          message: '會話已關閉'
        });
      }

      // 如果會話狀態是等待人工客服，不生成 AI 回覆
      if (session.status === SessionStatus.WAITING) {
        return res.json({
          success: true,
          message: '訊息已發送，等待客服回覆',
          data: {
            status: 'waiting_for_agent',
            waitingMessage: '您的訊息已收到，客服人員將盡快回覆您。'
          }
        });
      }

      // 準備對話歷史（暫時不使用，使用 Responses API 的狀態管理）
      // const conversationHistory = session.messages
      //   ?.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      //   .slice(-10)
      //   .map(msg => ({
      //     role: msg.senderType === SenderType.USER ? 'user' as const : 'assistant' as const,
      //     content: msg.messageText
      //   })) || [];

      // 使用統一客服服務處理訊息
              const aiResult = await chatService.chat(message, {
          category: session.category,
        createSession: true, // 讓統一服務處理訊息記錄
        userId: session.userId,
        sessionId: session.supportSessionId
      });

      // 檢查是否需要轉接人工客服
      if (aiResult.shouldTransfer) {
        session.status = SessionStatus.WAITING;
        session.priority = Priority.NORMAL;
        await supportSessionRepo.save(session);
      }

      res.json({
        success: true,
        message: '訊息已發送',
        data: {
          botMessage: {
            text: aiResult.message,
            confidence: aiResult.confidence,
            shouldTransfer: aiResult.shouldTransfer,
            sources: aiResult.sources
          },
          sessionStatus: session.status
        }
      });

    } catch (error: any) {
      console.error('❌ 發送訊息失敗:', error);
      res.status(500).json({
        success: false,
        message: '發送訊息失敗',
        error: error.message
      });
    }
  }

  /**
   * 獲取會話歷史
   * GET /api/v1/support/chat/:sessionId/history
   */
  static async getSessionHistory(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      const userId = (req.user as any)?.userId;

      const supportSessionRepo = AppDataSource.getRepository(SupportSession);
      const supportMessageRepo = AppDataSource.getRepository(SupportMessage);

      // 檢查會話權限
      const whereClause: any = { supportSessionId: sessionId };
      if (userId) {
        whereClause.userId = userId;
      }

      const session = await supportSessionRepo.findOne({
        where: whereClause
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: '會話不存在或無權限'
        });
      }

      // 獲取訊息歷史
      const messages = await supportMessageRepo.find({
        where: { sessionId },
        order: { createdAt: 'DESC' },
        take: Number(limit),
        skip: Number(offset),
        relations: ['sender']
      });

      res.json({
        success: true,
        data: {
          sessionId,
          messages: messages.reverse().map(msg => ({
            messageId: msg.supportMessageId,
            senderType: msg.senderType,
            messageText: msg.messageText,
            messageType: msg.messageType,
            metadata: msg.metadata,
            createdAt: msg.createdAt,
            isRead: msg.isRead
          })),
          pagination: {
            limit: Number(limit),
            offset: Number(offset),
            total: messages.length
          }
        }
      });

    } catch (error: any) {
      console.error('❌ 獲取會話歷史失敗:', error);
      res.status(500).json({
        success: false,
        message: '獲取會話歷史失敗',
        error: error.message
      });
    }
  }

  /**
   * 請求轉接人工客服
   * POST /api/v1/support/chat/:sessionId/transfer
   */
  static async requestHumanTransfer(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const { reason } = req.body;
      const userId = (req.user as any)?.userId;

      const supportSessionRepo = AppDataSource.getRepository(SupportSession);

      // 檢查會話權限
      const whereClause: any = { supportSessionId: sessionId };
      if (userId) {
        whereClause.userId = userId;
      }

      const session = await supportSessionRepo.findOne({
        where: whereClause
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: '會話不存在或無權限'
        });
      }

      if (!session.isActive) {
        return res.status(400).json({
          success: false,
          message: '會話已關閉，無法轉接'
        });
      }

      // 更新會話狀態
      session.status = SessionStatus.WAITING;
      session.priority = Priority.HIGH; // 主動要求轉接設為高優先級
      await supportSessionRepo.save(session);

      // 記錄轉接原因（可選）
      if (reason) {
        const supportMessageRepo = AppDataSource.getRepository(SupportMessage);
        const transferMessage = new SupportMessage();
        transferMessage.sessionId = sessionId;
        transferMessage.senderType = SenderType.BOT;
        transferMessage.messageText = `用戶要求轉接人工客服。原因：${reason}`;
        transferMessage.messageType = MessageType.TEXT;
        transferMessage.metadata = { transferReason: reason };
        await supportMessageRepo.save(transferMessage);
      }

      res.json({
        success: true,
        message: '已申請轉接人工客服，請稍候',
        data: {
          sessionId,
          status: session.status,
          priority: session.priority,
          estimatedWaitTime: '5-10 分鐘'
        }
      });

    } catch (error: any) {
      console.error('❌ 轉接人工客服失敗:', error);
      res.status(500).json({
        success: false,
        message: '轉接申請失敗',
        error: error.message
      });
    }
  }

  /**
   * 關閉會話
   * POST /api/v1/support/chat/:sessionId/close
   */
  static async closeSession(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const { satisfactionRating, satisfactionComment } = req.body;
      const userId = (req.user as any)?.userId;

      const supportSessionRepo = AppDataSource.getRepository(SupportSession);

      // 檢查會話權限
      const whereClause: any = { supportSessionId: sessionId };
      if (userId) {
        whereClause.userId = userId;
      }

      const session = await supportSessionRepo.findOne({
        where: whereClause
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: '會話不存在或無權限'
        });
      }

      if (session.isClosed) {
        return res.status(400).json({
          success: false,
          message: '會話已經關閉'
        });
      }

      // 關閉會話
      session.close(satisfactionRating, satisfactionComment);
      await supportSessionRepo.save(session);

      res.json({
        success: true,
        message: '會話已關閉',
        data: {
          sessionId,
          status: session.status,
          closedAt: session.closedAt,
          satisfactionRating: session.satisfactionRating,
          durationMinutes: session.durationMinutes
        }
      });

    } catch (error: any) {
      console.error('❌ 關閉會話失敗:', error);
      res.status(500).json({
        success: false,
        message: '關閉會話失敗',
        error: error.message
      });
    }
  }

  /**
   * 獲取用戶的所有會話
   * GET /api/v1/support/chat/sessions
   */
  static async getUserSessions(req: Request, res: Response) {
    try {
      const { status, limit = 20, offset = 0 } = req.query;
      const userId = (req.user as any)?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '需要登入才能查看會話列表'
        });
      }

      const supportSessionRepo = AppDataSource.getRepository(SupportSession);

      // 構建查詢條件
      const whereClause: any = { userId };
      if (status && typeof status === 'string') {
        whereClause.status = status as SessionStatus;
      }

      const sessions = await supportSessionRepo.find({
        where: whereClause,
        order: { createdAt: 'DESC' },
        take: Number(limit),
        skip: Number(offset),
        relations: ['messages']
      });

      res.json({
        success: true,
        data: {
          sessions: sessions.map(session => ({
            sessionId: session.supportSessionId,
            status: session.status,
            category: session.category,
            priority: session.priority,
            createdAt: session.createdAt,
            closedAt: session.closedAt,
            messageCount: session.messageCount,
            satisfactionRating: session.satisfactionRating,
            durationMinutes: session.durationMinutes,
            lastActivity: session.messages && session.messages.length > 0 
              ? session.messages[session.messages.length - 1].createdAt 
              : session.createdAt
          })),
          pagination: {
            limit: Number(limit),
            offset: Number(offset),
            total: sessions.length
          }
        }
      });

    } catch (error: any) {
      console.error('❌ 獲取用戶會話失敗:', error);
      res.status(500).json({
        success: false,
        message: '獲取會話列表失敗',
        error: error.message
      });
    }
  }
}