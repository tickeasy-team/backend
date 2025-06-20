/**
 * 靈活的智能回覆規則配置
 * 支援 FAQ 與圖文教學之間的輕鬆轉換
 */

export interface SmartReplyRule {
  id: string;                    // 唯一識別碼
  keywords: string[];            // 關鍵字陣列
  priority: number;              // 優先級 (1-3)
  category: string;              // 分類
  
  // 回覆類型配置
  replyType: 'tutorial' | 'faq'; // 回覆類型
  
  // 圖文教學相關 (當 replyType = 'tutorial' 時使用)
  tutorialTitle?: string;        // 教學標題
  tutorialUrl?: string;          // 教學連結
  tutorialDescription?: string;  // 教學描述
  
  // FAQ 相關 (當 replyType = 'faq' 時使用)
  faqAnswer?: string;           // FAQ 回答內容
  faqId?: string;               // FAQ 識別碼
  relatedQuestions?: string[];   // 相關問題
  
  // 共用欄位
  isActive?: boolean;           // 是否啟用 (預設 true)
  lastModified?: Date;          // 最後修改時間
  notes?: string;               // 備註說明
}

/**
 * 統一的智能回覆規則
 * 使用單一陣列管理所有規則，方便轉換類型
 */
export const SMART_REPLY_RULES: SmartReplyRule[] = [
  
  // ===========================================
  // 🔥 Priority 1 - 核心業務功能
  // ===========================================
  
  {
    id: 'buy-tickets',
    keywords: [
      // 核心動詞
      '購票', '買票', '下單', '訂票', '購買',
      // 完整短語
      '購買門票', '買門票', '線上購票', '網路購票',
      // 問句形式
      '如何購票', '怎麼買票', '要怎麼買', '哪裡買票',
      // 流程相關
      '購票流程', '買票步驟', '訂票流程', '購票教學',
      // 情境描述
      '想買票', '第一次購票', '不會買票', '買票方法'
    ],
    priority: 1,
    category: '核心功能',
    replyType: 'tutorial',
    tutorialTitle: '完整購票教學',
    tutorialUrl: '/help/tutorial/how-to-buy-tickets',
    tutorialDescription: '從選擇演出、選位到完成付款的完整購票流程圖文教學',
    isActive: true
  },

  {
    id: 'refund-tickets',
    keywords: [
      // 退票核心
      '退票', '取消訂單', '申請退款', '退錢', '退費',
      // 完整短語
      '怎麼退票', '如何退票', '退票流程', '退票申請',
      // 情境表達
      '不能去了', '想退票', '可以退嗎', '臨時有事',
      // 退款相關
      '退款流程', '退款時間', '退款方式'
    ],
    priority: 1,
    category: '核心功能',
    replyType: 'tutorial',
    tutorialTitle: '退票退款教學',
    tutorialUrl: '/help/tutorial/how-to-refund',
    tutorialDescription: '退票政策說明、退款流程與注意事項完整指南',
    isActive: true
  },

  {
    id: 'payment-methods',
    keywords: [
      // 付款方式
      '付款方式', '支付方法', '怎麼付錢', '可以刷卡嗎',
      // 支付工具
      '信用卡', '轉帳', '超商', 'ATM', '現金',
      // 行動支付
      'Apple Pay', 'Google Pay', 'Line Pay', '街口',
      // 問題表達
      '支援什麼付款', '有哪些付費方式', '付款選項'
    ],
    priority: 1,
    category: '付款相關',
    replyType: 'faq',
    faqAnswer: `我們支援多種便利的付款方式：

💳 **信用卡支付**
• Visa、MasterCard、JCB
• 支援分期付款（3期、6期、12期）

🏦 **銀行轉帳**
• ATM 轉帳
• 網路銀行轉帳

🏪 **超商代碼繳費**
• 7-11、全家、萊爾富、OK超商

📱 **行動支付**
• Apple Pay、Google Pay
• Line Pay、街口支付

💰 **其他方式**
• 現場購票（部分場館）

付款完成後，您將立即收到確認郵件和電子票券。`,
    faqId: 'payment-methods',
    relatedQuestions: [
      '可以分期付款嗎？',
      '付款後多久會收到票？',
      '可以開發票嗎？',
      '付款失敗怎麼辦？'
    ],
    isActive: true,
    notes: '如果前端製作了付款教學頁面，可以將 replyType 改為 tutorial'
  },

  {
    id: 'seat-selection',
    keywords: [
      // 座位相關
      '座位選擇', '選位', '座位圖', '位置', '視野',
      // 完整短語
      '怎麼選座位', '可以選位嗎', '座位在哪',
      // 座位問題
      '座位不好', '想換位子', '視野問題', '看不到舞台'
    ],
    priority: 1,
    category: '座位相關',
    replyType: 'faq',
    faqAnswer: `選位功能說明：

🎯 **選位步驟**
1. 選擇票種後點選「選擇座位」
2. 查看即時座位圖與價格
3. 點選您喜歡的位置
4. 確認座位後加入購物車

🚦 **座位狀態說明**
• 🟢 綠色：可選擇
• 🔴 紅色：已售出
• ⚫ 灰色：不開放銷售
• 🔵 藍色：您已選中

👁️ **視野參考**
• A區：正面最佳視野
• B區：側面良好視野  
• C區：後方完整視野

⚠️ **重要提醒**
選位完成並付款後無法更改，請仔細確認座位位置。`,
    faqId: 'seat-selection',
    relatedQuestions: [
      '可以改座位嗎？',
      '座位圖準確嗎？',
      '沒有選位會怎樣？',
      '哪個區域視野最好？'
    ],
    isActive: true,
    notes: '座位選擇如果有圖文教學，可以改為 tutorial 類型'
  },

  // ===========================================
  // 📱 Priority 2 - 重要輔助功能
  // ===========================================

  {
    id: 'eticket-usage',
    keywords: [
      // 電子票核心
      '電子票', 'QR code', 'QR碼', '二維碼', 'e-ticket',
      // 入場相關
      '入場', '驗票', '檢票', '掃碼', '進場',
      // 問題表達
      '票券怎麼用', '電子票在哪', '怎麼進場', '票在手機哪裡'
    ],
    priority: 2,
    category: '票券管理',
    replyType: 'tutorial',
    tutorialTitle: '電子票券使用教學',
    tutorialUrl: '/help/tutorial/how-to-use-eticket',
    tutorialDescription: '電子票下載、保存、入場使用完整說明',
    isActive: true
  },

  {
    id: 'customer-service',
    keywords: [
      // 客服時間
      '客服時間', '服務時間', '營業時間', '上班時間',
      // 完整短語
      '什麼時候有客服', '幾點到幾點', '週末有客服嗎',
      // 聯絡相關
      '怎麼聯絡', '客服電話', '客服信箱', '線上客服'
    ],
    priority: 2,
    category: '客服相關',
    replyType: 'faq',
    faqAnswer: `客服服務資訊：

⏰ **服務時間**
• 週一至週五：09:00-18:00
• 週六：09:00-17:00  
• 週日及國定假日：休息

📞 **聯絡方式**
• 客服專線：02-1234-5678
• 客服信箱：support@tickeasy.com
• 線上客服：網站右下角對話框
• LINE客服：@tickeasy

🚨 **緊急情況**
演出當日如有緊急問題，請直接撥打活動現場緊急專線。

💡 **建議**
非緊急問題建議使用線上客服或email，回覆較快速。`,
    faqId: 'service-hours',
    relatedQuestions: [
      '客服電話多少？',
      '可以用LINE聯絡嗎？',
      '假日有客服嗎？'
    ],
    isActive: true
  },

  // ===========================================
  // 💡 Priority 3 - 一般支援功能
  // ===========================================

  // 會員功能相關教學 (前端已完成圖文教學)
  {
    id: 'member-register',
    keywords: [
      // 註冊核心
      '註冊', '申請帳號', '開戶', '加入會員', '建立帳號',
      // 完整短語
      '如何註冊', '怎麼註冊', '註冊流程', '會員申請',
      // 問題表達
      '想要註冊', '要怎麼加入', '沒有帳號', '第一次使用',
      // 註冊問題
      '註冊不了', '註冊失敗', '無法註冊', '註冊問題'
    ],
    priority: 2,
    category: '會員管理',
    replyType: 'tutorial',
    tutorialTitle: '會員註冊教學',
    tutorialUrl: 'https://frontend-fz4o.onrender.com/question/detail?faqType=member',
    tutorialDescription: '完整的會員註冊流程與注意事項說明',
    isActive: true,
    notes: '前端已完成圖文教學，請更新實際教學網址'
  },

  {
    id: 'member-login',
    keywords: [
      // 登入核心
      '登入', '登錄', '簽到', '進入', '登入帳號',
      // 完整短語
      '如何登入', '怎麼登入', '登入方式', '登入流程',
      // 問題表達
      '要怎麼登入', '登入在哪', '登入問題', '無法登入',
      // 登入狀態
      '已登入', '登入狀態', '登入成功', '登入失敗'
    ],
    priority: 2,
    category: '會員管理',
    replyType: 'tutorial',
    tutorialTitle: '會員登入教學',
    tutorialUrl: 'https://frontend-fz4o.onrender.com/question/detail?faqType=member',
    tutorialDescription: '會員登入步驟與常見登入問題解決',
    isActive: true,
    notes: '前端已完成圖文教學，請更新實際教學網址'
  },

  {
    id: 'forgot-password',
    keywords: [
      // 密碼問題
      '忘記密碼', '密碼重設', '重設密碼', '找回密碼',
      // 完整短語
      '密碼忘了', '不記得密碼', '密碼不見了', '密碼遺失',
      // 問題表達
      '忘記密碼怎麼辦', '密碼重設流程', '如何重設密碼',
      // 相關問題
      '密碼錯誤', '密碼無效', '舊密碼不對'
    ],
    priority: 2,
    category: '會員管理',
    replyType: 'tutorial',
    tutorialTitle: '忘記密碼處理教學',
    tutorialUrl: 'https://frontend-fz4o.onrender.com/question/detail?faqType=member',
    tutorialDescription: '忘記密碼時的重設流程與驗證步驟',
    isActive: true,
    notes: '前端已完成圖文教學，請更新實際教學網址'
  },

  {
    id: 'edit-profile',
    keywords: [
      // 個人資訊
      '修改個人資訊', '編輯資料', '更新資料', '個人設定',
      // 完整短語
      '如何修改資料', '怎麼改個人資訊', '更改個人資料',
      // 具體項目
      '修改姓名', '更改電話', '改地址', '修改信箱',
      // 問題表達
      '個人資料在哪改', '資料怎麼修改', '要怎麼更新資料',
      // 相關功能
      '會員資料', '帳號資訊', '個人檔案'
    ],
    priority: 2,
    category: '會員管理',
    replyType: 'tutorial',
    tutorialTitle: '修改個人資訊教學',
    tutorialUrl: 'https://frontend-fz4o.onrender.com/question/detail?faqType=member',
    tutorialDescription: '修改會員個人資料的完整操作流程',
    isActive: true,
    notes: '前端已完成圖文教學，請更新實際教學網址'
  },

  {
    id: 'change-password',
    keywords: [
      // 修改密碼
      '修改密碼', '更改密碼', '改密碼', '換密碼',
      // 完整短語
      '如何修改密碼', '怎麼改密碼', '密碼修改流程',
      // 問題表達
      '要怎麼換密碼', '密碼在哪改', '想要改密碼',
      // 安全相關
      '密碼安全', '密碼強度', '新密碼設定',
      // 相關功能
      '密碼變更', '密碼更新'
    ],
    priority: 2,
    category: '會員管理',
    replyType: 'tutorial',
    tutorialTitle: '修改密碼教學',
    tutorialUrl: 'https://frontend-fz4o.onrender.com/question/detail?faqType=member',
    tutorialDescription: '安全修改會員密碼的步驟與注意事項',
    isActive: true,
    notes: '前端已完成圖文教學，請更新實際教學網址'
  }
];

/**
 * 輔助函數：根據類型過濾規則
 */
export const getRulesByType = (type: 'tutorial' | 'faq') => {
  return SMART_REPLY_RULES.filter(rule => rule.replyType === type && rule.isActive !== false);
};

/**
 * 輔助函數：根據優先級過濾規則
 */
export const getRulesByPriority = (priority: number) => {
  return SMART_REPLY_RULES.filter(rule => rule.priority === priority && rule.isActive !== false);
};

/**
 * 輔助函數：根據分類過濾規則
 */
export const getRulesByCategory = (category: string) => {
  return SMART_REPLY_RULES.filter(rule => rule.category === category && rule.isActive !== false);
};

/**
 * 輔助函數：根據 ID 查找規則
 */
export const getRuleById = (id: string) => {
  return SMART_REPLY_RULES.find(rule => rule.id === id);
};

/**
 * 輔助函數：轉換規則類型
 * 這是關鍵功能：輕鬆在 FAQ 和 Tutorial 之間轉換
 */
export const convertRuleType = (
  ruleId: string, 
  newType: 'tutorial' | 'faq',
  newConfig: {
    tutorialTitle?: string;
    tutorialUrl?: string;
    tutorialDescription?: string;
    faqAnswer?: string;
    faqId?: string;
    relatedQuestions?: string[];
  }
) => {
  const rule = getRuleById(ruleId);
  if (!rule) {
    throw new Error(`找不到規則 ID: ${ruleId}`);
  }

  // 更新規則類型
  rule.replyType = newType;
  rule.lastModified = new Date();

  if (newType === 'tutorial') {
    // 轉換為圖文教學
    rule.tutorialTitle = newConfig.tutorialTitle;
    rule.tutorialUrl = newConfig.tutorialUrl;
    rule.tutorialDescription = newConfig.tutorialDescription;
    // 清除 FAQ 相關欄位
    rule.faqAnswer = undefined;
    rule.faqId = undefined;
    rule.relatedQuestions = undefined;
  } else {
    // 轉換為 FAQ
    rule.faqAnswer = newConfig.faqAnswer;
    rule.faqId = newConfig.faqId;
    rule.relatedQuestions = newConfig.relatedQuestions;
    // 清除 Tutorial 相關欄位
    rule.tutorialTitle = undefined;
    rule.tutorialUrl = undefined;
    rule.tutorialDescription = undefined;
  }

  return rule;
};

/**
 * 規則統計資訊
 */
export const getRulesStats = () => {
  const activeRules = SMART_REPLY_RULES.filter(rule => rule.isActive !== false);
  
  return {
    total: activeRules.length,
    tutorials: activeRules.filter(rule => rule.replyType === 'tutorial').length,
    faqs: activeRules.filter(rule => rule.replyType === 'faq').length,
    byPriority: {
      priority1: activeRules.filter(rule => rule.priority === 1).length,
      priority2: activeRules.filter(rule => rule.priority === 2).length,
      priority3: activeRules.filter(rule => rule.priority === 3).length
    },
    categories: [...new Set(activeRules.map(rule => rule.category))],
    lastModified: Math.max(...activeRules.map(rule => 
      rule.lastModified ? rule.lastModified.getTime() : 0
    ))
  };
};

/**
 * 使用範例：
 * 
 * // 將付款方式從 FAQ 轉換為圖文教學
 * convertRuleType('payment-methods', 'tutorial', {
 *   tutorialTitle: '付款方式完整教學',
 *   tutorialUrl: '/help/tutorial/payment-methods',
 *   tutorialDescription: '各種付款方式的詳細操作說明'
 * });
 * 
 * // 將座位選擇從 FAQ 轉換為圖文教學
 * convertRuleType('seat-selection', 'tutorial', {
 *   tutorialTitle: '座位選擇教學',
 *   tutorialUrl: '/help/tutorial/seat-selection',
 *   tutorialDescription: '座位選擇技巧與注意事項'
 * });
 */ 