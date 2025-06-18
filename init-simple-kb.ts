/**
 * 簡化版知識庫初始化腳本
 */

import 'reflect-metadata';
import { AppDataSource } from './config/database.js';
import { SupportKnowledgeBase } from './models/support-knowledge-base.js';

const testData = [
  {
    title: '如何購買演唱會門票',
    content: '購買演唱會門票的步驟：1. 註冊或登入 Tickeasy 帳號 2. 瀏覽演唱會活動頁面 3. 選擇場次和座位 4. 填寫購票資訊 5. 選擇付款方式 6. 完成付款並取得電子票券。',
    category: '購票流程',
    tags: ['購票', '演唱會', '門票', '流程']
  },
  {
    title: '票券退換票政策',
    content: '退換票政策說明：1. 一般情況下，門票售出後不得退換 2. 如因主辦方取消活動，可申請全額退款 3. 退票申請需在活動開始前7天提出 4. 退款處理時間為7-14個工作天。',
    category: '退換票',
    tags: ['退票', '換票', '政策', '退款']
  },
  {
    title: '支援的付款方式',
    content: 'Tickeasy 支援多種付款方式：1. 信用卡付款（Visa、MasterCard、JCB） 2. ATM 轉帳 3. 超商代碼繳費 4. 行動支付（Line Pay、Apple Pay）。推薦使用信用卡付款。',
    category: '付款',
    tags: ['付款', '信用卡', '轉帳', '超商']
  }
];

async function initSimpleKnowledgeBase() {
  try {
    console.log('🚀 開始簡化版知識庫初始化...');
    
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ 資料庫連接成功');
    }

    const knowledgeBaseRepo = AppDataSource.getRepository(SupportKnowledgeBase);
    
    let successCount = 0;

    for (const data of testData) {
      try {
        console.log(`📝 創建: ${data.title}`);
        
        const knowledgeBase = new SupportKnowledgeBase();
        knowledgeBase.title = data.title;
        knowledgeBase.content = data.content;
        knowledgeBase.category = data.category;
        knowledgeBase.tags = data.tags;
        knowledgeBase.isActive = true;

        await knowledgeBaseRepo.save(knowledgeBase);
        console.log('✅ 儲存成功');
        
        successCount++;

      } catch (error) {
        console.error(`❌ 創建失敗: ${data.title}`, error.message);
      }
    }

    console.log(`🎉 完成！成功創建 ${successCount} 個知識庫項目`);

  } catch (error) {
    console.error('💥 初始化失敗:', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

initSimpleKnowledgeBase().catch(console.error);