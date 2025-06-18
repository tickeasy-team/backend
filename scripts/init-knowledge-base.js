/**
 * 初始化知識庫測試數據
 * 直接插入數據到數據庫
 */

import { AppDataSource } from '../config/database.js';
import { SupportKnowledgeBase } from '../models/support-knowledge-base.js';
import { v4 as uuidv4 } from 'uuid';

const testData = [
  {
    title: '如何購買演唱會門票',
    content: '購買演唱會門票的步驟：1. 註冊或登入 Tickeasy 帳號 2. 瀏覽演唱會活動頁面 3. 選擇場次和座位 4. 填寫購票資訊 5. 選擇付款方式 6. 完成付款並取得電子票券。購票時請注意票種限制和購票數量限制。',
    category: '購票流程',
    tags: ['購票', '演唱會', '門票', '流程']
  },
  {
    title: '票券退換票政策',
    content: '退換票政策說明：1. 一般情況下，門票售出後不得退換 2. 如因主辦方取消活動，可申請全額退款 3. 如因不可抗力因素（天災、疫情等）導致活動取消，可申請退款 4. 退票申請需在活動開始前7天提出 5. 退款處理時間為7-14個工作天。詳細退票條款請參考各活動頁面說明。',
    category: '退換票',