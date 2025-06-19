/**
 * 智能客服路由
 * /api/v1/ai-customer-service/*
 */

import { Router } from 'express';
import { SmartCustomerController } from '../controllers/smart-customer-controller.js';
import { body, query, validationResult } from 'express-validator';

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
 * 公開 API（不需要認證）
 */

// 系統健康檢查
router.get('/health', SmartCustomerController.healthCheck);

// 智能客服對話
router.post('/chat',
  [
    body('message')
      .isString()
      .isLength({ min: 1, max: 1000 })
      .withMessage('訊息必須在 1-1000 字之間'),
    body('history')
      .optional()
      .isArray()
      .withMessage('對話歷史必須是陣列格式'),
    body('history.*.role')
      .optional()
      .isIn(['user', 'assistant'])
      .withMessage('對話角色必須是 user 或 assistant'),
    body('history.*.content')
      .optional()
      .isString()
      .isLength({ min: 1, max: 1000 })
      .withMessage('對話內容必須在 1-1000 字之間'),
    handleValidationErrors
  ],
  SmartCustomerController.chat
);

// 獲取常見問題
router.get('/common-questions', SmartCustomerController.getCommonQuestions);

// 搜尋知識庫
router.get('/search',
  [
    query('q')
      .isString()
      .isLength({ min: 1, max: 200 })
      .withMessage('搜尋查詢必須在 1-200 字之間'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('限制數量必須在 1-20 之間'),
    query('categories')
      .optional()
      .custom((value) => {
        if (typeof value === 'string' || Array.isArray(value)) {
          return true;
        }
        throw new Error('分類參數格式不正確');
      }),
    handleValidationErrors
  ],
  SmartCustomerController.searchKnowledgeBase
);

// 獲取查詢建議
router.get('/suggestions',
  [
    query('q')
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('查詢參數必須在 1-100 字之間'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('限制數量必須在 1-10 之間'),
    handleValidationErrors
  ],
  SmartCustomerController.getQuerySuggestions
);

// 獲取統計資料
router.get('/stats', SmartCustomerController.getStats);

/**
 * 測試 API
 */

// 測試對話功能
router.get('/test/chat', SmartCustomerController.testChat);

export default router;