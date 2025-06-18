/**
 * 客服對話 Controller
 * 處理客服聊天 API 請求
 */

import { Request, Response } from 'express';
import { AppDataSource } from '../config/database.js';
import { SupportSession, SessionType, SessionStatus, Priority } from '../models/support-session.js';
import { SupportMessage, SenderType, MessageType } from '../models/support-message.js';
import { User } from '../models/user.js';
import { openaiService } from '../services/openai-service.js';
import { mcpService } from '../services/mcp-service.js';

export class SupportController {
  
  /**
   * 開始新的客服會話
   * POST /api/v1/support/chat/start
   */
  static async startSession(req: Request, res: Response) {
    try {
      const { userId, category, initialMessage } = req.body;

      const supportSessionRepo = AppDataSource.getRepository(SupportSession);
      const supportMessageRepo = AppDataSource.getRepository(SupportMessage);

      // 檢查是否已有活躍會話
      const existingSession = await supportSessionRepo.findOne({
        where: {
          userId,
          status: SessionStatus.ACTIVE
        }
      });

      let session: SupportSession;

      if (existingSession) {
        // 使用現有會話
        session = existingSession;
      } else {
        // 建立新會話
        session = new SupportSession();
        session.userId = userId;
        session.sessionType = SessionType.BOT;
        session.status = SessionStatus.ACTIVE;
        session.priority = Priority.NORMAL;
        session.category = category || '一般諮詢';
        
        session = await supportSessionRepo.save(session);
      }

      // 如果有初始訊息，處理它
      if (initialMessage) {
        // 儲存用戶訊息
        const userMessage = new SupportMessage();
        userMessage.sessionId = session.supportSessionId;
        userMessage.senderType = SenderType.USER;
        userMessage.senderId = userId;
        userMessage.messageText = initialMessage;
        userMessage.messageType = MessageType.TEXT;
        
        await supportMessageRepo.save(userMessage);

        // 生成 AI 回覆
        const aiResult = await openaiService.generateResponseWithFAQ(
          initialMessage,
          [],
          { category: session.category }
        );

        // 儲存 AI 回覆
        const botMessage = new SupportMessage();
        botMessage.sessionId = session.supportSessionId;
        botMessage.senderType = SenderType.BOT;
        botMessage.messageText = aiResult.response;
        botMessage.messageType = MessageType.TEXT;
        botMessage.metadata = {
          confidence: aiResult.confidence,
          processingTime: aiResult.processingTime,
          model: aiResult.model,
          tokens: aiResult.tokens,
          faqSuggestions: aiResult.faqSuggestions
        };

        const savedBotMessage = await supportMessageRepo.save(botMessage);

        // 設定首次回應時間
        if (!session.firstResponseAt) {
          session.firstResponseAt = new Date();
          await supportSessionRepo.save(session);
        }

        // 檢查是否需要轉接人工
        if (aiResult.shouldTransfer) {
          session.status = SessionStatus.WAITING;
          await supportSessionRepo.save(session);
        }

        res.status(201).json({
          success: true,
          message: '會話已開始',
          data: {
            sessionId: session.supportSessionId,
            status: session.status,
            botMessage: {
              messageId: savedBotMessage.supportMessageId,
              text: savedBotMessage.messageText,
              confidence: aiResult.confidence,
              shouldTransfer: aiResult.shouldTransfer,
              faqSuggestions: aiResult.faqSuggestions
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

    } catch (error) {
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
      const { sessionId, message, messageType = MessageType.TEXT } = req.body;
      const userId = req.user?.userId; // 假設有認證中介軟體

      const supportSessionRepo = AppDataSource.getRepository(SupportSession);
      const supportMessageRepo = AppDataSource.getRepository(SupportMessage);

      // 檢查會話是否存在且活躍
      const session = await supportSessionRepo.findOne({
        where: { 
          supportSessionId: sessionId,
          userId 
        },
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

      // 儲存用戶訊息
      const userMessage = new SupportMessage();
      userMessage.sessionId = sessionId;
      userMessage.senderType = SenderType.USER;
      userMessage.senderId = userId;
      userMessage.messageText = message;
      userMessage.messageType = messageType;
      
      await supportMessageRepo.save(userMessage);

      // 如果會話狀態是等待人工客服，不生成 AI 回覆
      if (session.status === SessionStatus.WAITING) {
        return res.json({
          success: true,
          message: '訊息已發送，等待客服回覆',
          data: {
            messageId: userMessage.supportMessageId,
            status: 'waiting_for_agent',
            waitingMessage: '您的訊息已收到，客服人員將盡快回覆您。'
          }
        });
      }

      // 獲取對話歷史（最近 10 則）
      const conversationHistory = session.messages
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .slice(-10);

      // 分析用戶意圖
      const intentAnalysis = await openaiService.analyzeIntent(message);

      // 生成 AI 回覆
      const aiResult = await openaiService.generateResponseWithFAQ(
        message,
        conversationHistory,
        { 
          category: session.category,
          intent: intentAnalysis
        }
      );

      // 儲存 AI 回覆
      const botMessage = new SupportMessage();
      botMessage.sessionId = sessionId;
      botMessage.senderType = SenderType.BOT;
      botMessage.messageText = aiResult.response;
      botMessage.messageType = MessageType.TEXT;
      botMessage.metadata = {
        confidence: aiResult.confidence,
        processingTime: aiResult.processingTime,
        model: aiResult.model,
        tokens: aiResult.tokens,
        intentType: intentAnalysis.intent,
        sentiment: intentAnalysis.sentiment,
        faqSuggestions: aiResult.faqSuggestions
      };

      const savedBotMessage = await supportMessageRepo.save(botMessage);

      // 檢查是否需要轉接人工客服
      if (aiResult.shouldTransfer || intentAnalysis.urgency === '高') {
        session.status = SessionStatus.WAITING;
        session.priority = intentAnalysis.urgency === '高' ? Priority.HIGH : Priority.NORMAL;
        await supportSessionRepo.save(session);
      }

      res.json({
        success: true,
        message: '訊息已發送',
        data: {
          userMessageId: userMessage.supportMessageId,
          botMessage: {
            messageId: savedBotMessage.supportMessageId,
            text: savedBotMessage.messageText,
            confidence: aiResult.confidence,
            shouldTransfer: aiResult.shouldTransfer,
            faqSuggestions: aiResult.faqSuggestions,
            intent: intentAnalysis
          },
          sessionStatus: session.status
        }
      });

    } catch (error) {
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
      const userId = req.user?.userId;
      const { limit = 50, offset = 0 } = req.query;

      const supportSessionRepo = AppDataSource.getRepository(SupportSession);
      const supportMessageRepo = AppDataSource.getRepository(SupportMessage);

      // 檢查會話權限
      const session = await supportSessionRepo.findOne({
        where: { 
          supportSessionId: sessionId,
          userId 
        }
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
        relations: ['sender'],
        order: { createdAt: 'ASC' },
        skip: Number(offset),
        take: Number(limit)
      });

      res.json({
        success: true,
        data: {
          session: {
            sessionId: session.supportSessionId,
            status: session.status,
            category: session.category,
            createdAt: session.createdAt
          },
          messages: messages.map(msg => ({
            messageId: msg.supportMessageId,
            senderType: msg.senderType,
            text: msg.messageText,
            messageType: msg.messageType,
            createdAt: msg.createdAt,
            metadata: msg.metadata,
            sender: msg.sender ? {
              name: msg.sender.name,
              email: msg.sender.email
            } : null
          }))
        }
      });

    } catch (error) {
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
      const userId = req.user?.userId;

      const supportSessionRepo = AppDataSource.getRepository(SupportSession);

      const session = await supportSessionRepo.findOne({
        where: { 
          supportSessionId: sessionId,
          userId 
        }
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: '會話不存在或無權限'
        });
      }

      // 更新會話狀態
      session.status = SessionStatus.WAITING;
      session.sessionType = SessionType.MIXED;
      session.priority = Priority.HIGH; // 手動轉接設為高優先級
      
      await supportSessionRepo.save(session);

      // 記錄轉接訊息
      const supportMessageRepo = AppDataSource.getRepository(SupportMessage);
      const transferMessage = new SupportMessage();
      transferMessage.sessionId = sessionId;
      transferMessage.senderType = SenderType.BOT;
      transferMessage.messageText = '您的會話已轉接至人工客服，請稍候...';
      transferMessage.messageType = MessageType.TEXT;
      transferMessage.metadata = {
        transferReason: reason || '用戶手動要求轉接'
      };

      await supportMessageRepo.save(transferMessage);

      res.json({
        success: true,
        message: '已轉接至人工客服',
        data: {
          sessionStatus: session.status,
          estimatedWaitTime: '3-5分鐘' // 可以根據實際情況動態計算
        }
      });

    } catch (error) {
      console.error('❌ 轉接人工客服失敗:', error);
      res.status(500).json({
        success: false,
        message: '轉接失敗',
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
      const userId = req.user?.userId;

      const supportSessionRepo = AppDataSource.getRepository(SupportSession);

      const session = await supportSessionRepo.findOne({
        where: { 
          supportSessionId: sessionId,
          userId 
        }
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: '會話不存在或無權限'
        });
      }

      // 關閉會話
      session.close(satisfactionRating, satisfactionComment);
      await supportSessionRepo.save(session);

      res.json({
        success: true,
        message: '會話已關閉',
        data: {
          sessionId: session.supportSessionId,
          duration: session.durationMinutes,
          rating: session.satisfactionRating
        }
      });

    } catch (error) {
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
      const userId = req.user?.userId;
      const { status, limit = 20, offset = 0 } = req.query;

      const supportSessionRepo = AppDataSource.getRepository(SupportSession);

      const queryOptions: any = {
        where: { userId },
        order: { createdAt: 'DESC' },
        skip: Number(offset),
        take: Number(limit)
      };

      if (status) {
        queryOptions.where.status = status;
      }

      const sessions = await supportSessionRepo.find(queryOptions);

      res.json({
        success: true,
        data: {
          sessions: sessions.map(session => ({
            sessionId: session.supportSessionId,
            status: session.status,
            category: session.category,
            messageCount: session.messageCount,
            createdAt: session.createdAt,
            firstResponseTime: session.firstResponseMinutes,
            duration: session.durationMinutes,
            satisfactionRating: session.satisfactionRating
          }))
        }
      });

    } catch (error) {
      console.error('❌ 獲取用戶會話失敗:', error);
      res.status(500).json({
        success: false,
        message: '獲取會話列表失敗',
        error: error.message
      });
    }
  }
}