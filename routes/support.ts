/**
 * 客服系統路由
 * /api/v1/support/*
 */

import { Router } from 'express';
import { SupportController } from '../controllers/support-controller.js';
import { authenticateToken } from '../middlewares/auth.js'; // 假設有認證中介軟體
import { body, param, query, validationResult } from 'express-validator';

const router = Router();

// 驗證中介軟體
const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: '驗證失敗',
      errors: errors.array()
    });
  }
  next();
};

/**
 * 客服聊天相關路由
 */

// 開始新的客服會話
router.post('/chat/start',
  [
    body('userId').optional().isUUID().withMessage('用戶 ID 格式不正確'),
    body('category').optional().isString().withMessage('分類必須是字串'),
    body('initialMessage').optional().isString().isLength({ min: 1, max: 1000 }).withMessage('初始訊息長度必須在 1-1000 字之間'),
    handleValidationErrors
  ],
  SupportController.startSession
);

// 發送訊息
router.post('/chat/message',
  authenticateToken,
  [
    body('sessionId').isUUID().withMessage('會話 ID 格式不正確'),
    body('message').isString().isLength({ min: 1, max: 1000 }).withMessage('訊息長度必須在 1-1000 字之間'),
    body('messageType').optional().isIn(['text', 'image', 'file']).withMessage('訊息類型不正確'),
    handleValidationErrors
  ],
  SupportController.sendMessage
);

// 獲取會話歷史
router.get('/chat/:sessionId/history',
  authenticateToken,
  [
    param('sessionId').isUUID().withMessage('會話 ID 格式不正確'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('限制數量必須在 1-100 之間'),
    query('offset').optional().isInt({ min: 0 }).withMessage('偏移量必須大於等於 0'),
    handleValidationErrors
  ],
  SupportController.getSessionHistory
);

// 請求轉接人工客服
router.post('/chat/:sessionId/transfer',
  authenticateToken,
  [
    param('sessionId').isUUID().withMessage('會話 ID 格式不正確'),
    body('reason').optional().isString().isLength({ max: 200 }).withMessage('轉接原因不能超過 200 字'),
    handleValidationErrors
  ],
  SupportController.requestHumanTransfer
);

// 關閉會話
router.post('/chat/:sessionId/close',
  authenticateToken,
  [
    param('sessionId').isUUID().withMessage('會話 ID 格式不正確'),
    body('satisfactionRating').optional().isInt({ min: 1, max: 5 }).withMessage('滿意度評分必須在 1-5 之間'),
    body('satisfactionComment').optional().isString().isLength({ max: 500 }).withMessage('評價內容不能超過 500 字'),
    handleValidationErrors
  ],
  SupportController.closeSession
);

// 獲取用戶的所有會話
router.get('/chat/sessions',
  authenticateToken,
  [
    query('status').optional().isIn(['active', 'waiting', 'closed', 'transferred']).withMessage('狀態參數不正確'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('限制數量必須在 1-50 之間'),
    query('offset').optional().isInt({ min: 0 }).withMessage('偏移量必須大於等於 0'),
    handleValidationErrors
  ],
  SupportController.getUserSessions
);

/**
 * 公開 API（不需要認證）
 */

// 健康檢查
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '客服系統運行正常',
    timestamp: new Date().toISOString(),
    services: {
      openai: process.env.OPENAI_API_KEY ? 'connected' : 'not_configured',
      mcp: 'ready', // 可以加入實際的 MCP 狀態檢查
      database: 'connected'
    }
  });
});

// 獲取客服分類列表
router.get('/categories', (req, res) => {
  res.json({
    success: true,
    data: {
      categories: [
        { id: 'ticket', name: '票務問題', description: '購票、退票、改票相關問題' },
        { id: 'payment', name: '付款問題', description: '付款失敗、退款、發票等問題' },
        { id: 'account', name: '帳號問題', description: '註冊、登入、密碼重設等問題' },
        { id: 'event', name: '活動資訊', description: '演唱會時間、地點、座位等資訊' },
        { id: 'technical', name: '技術問題', description: '網站使用、App 問題等技術支援' },
        { id: 'other', name: '其他問題', description: '其他未分類的問題' }
      ]
    }
  });
});

// 獲取常見問題
router.get('/faq', async (req, res) => {
  try {
    const { category, limit = 10 } = req.query;
    
    // 這裡可以整合 MCP Service 來獲取實際的 FAQ 資料
    // 暫時返回靜態資料
    const mockFAQs = [
      {
        id: '1',
        category: 'ticket',
        question: '如何購買演唱會門票？',
        answer: '您可以在我們的網站首頁搜尋想要的演唱會，選擇場次和座位後，按照購票流程完成付款即可。',
        keywords: ['購票', '演唱會', '門票']
      },
      {
        id: '2',
        category: 'payment',
        question: '支援哪些付款方式？',
        answer: '我們支援信用卡、ATM 轉帳、超商付款等多種付款方式。您可以在結帳頁面選擇最方便的付款方式。',
        keywords: ['付款', '信用卡', 'ATM', '超商']
      },
      {
        id: '3',
        category: 'ticket',
        question: '可以退票嗎？',
        answer: '根據主辦單位規定，部分活動支援退票。詳細退票政策請查看各活動頁面的退票說明。',
        keywords: ['退票', '政策', '規定']
      }
    ];

    let filteredFAQs = mockFAQs;
    if (category) {
      filteredFAQs = mockFAQs.filter(faq => faq.category === category);
    }

    res.json({
      success: true,
      data: {
        faqs: filteredFAQs.slice(0, Number(limit))
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '獲取 FAQ 失敗',
      error: error.message
    });
  }
});

/**
 * 客服管理後台 API（需要管理員權限）
 */

// 獲取等待中的會話（供客服人員使用）
router.get('/admin/waiting-sessions',
  authenticateToken,
  // TODO: 添加管理員權限檢查中介軟體
  async (req, res) => {
    try {
      // 這裡可以實作客服管理後台的功能
      res.json({
        success: true,
        message: '客服管理功能開發中',
        data: {
          waitingSessions: []
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '獲取等待會話失敗',
        error: error.message
      });
    }
  }
);

export default router;