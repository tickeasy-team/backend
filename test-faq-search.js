/**
 * FAQ 搜尋服務測試
 * 測試直接使用 TypeORM 的 FAQ 搜尋功能
 */

import { faqSearchService } from './services/faq-search-service.js';
import { AppDataSource } from './config/database.js';
import dotenv from 'dotenv';

dotenv.config();

class FAQSearchTester {
  async testFAQSearch() {
    console.log('🧪 開始測試 FAQ 搜尋服務...\n');
    
    try {
      // 初始化資料庫連接
      console.log('📡 初始化資料庫連接...');
      await AppDataSource.initialize();
      console.log('✅ 資料庫連接成功!\n');

      // 測試 1: 檢查服務是否準備好
      console.log('🔍 測試 1: 檢查服務狀態');
      const isReady = faqSearchService.isReady();
      console.log(`服務狀態: ${isReady ? '✅ 準備就緒' : '❌ 未準備好'}\n`);

      // 測試 2: 獲取 FAQ 分類
      console.log('🔍 測試 2: 獲取 FAQ 分類');
      const categories = await faqSearchService.getCategories();
      console.log(`找到 ${categories.length} 個分類:`);
      categories.forEach(category => {
        console.log(`  - ${category.name}: ${category.description}`);
      });
      console.log('');

      // 測試 3: 關鍵字搜尋 FAQ
      console.log('🔍 測試 3: 關鍵字搜尋 FAQ');
      const searchKeywords = ['購票', '退票', '付款', '座位'];
      
      for (const keyword of searchKeywords) {
        console.log(`\n🔎 搜尋關鍵字: "${keyword}"`);
        const results = await faqSearchService.searchFAQ(keyword, 3);
        
        if (results.length > 0) {
          console.log(`✅ 找到 ${results.length} 個相關 FAQ:`);
          results.forEach((faq, index) => {
            console.log(`   ${index + 1}. ${faq.question}`);
            console.log(`      分類: ${faq.category_name || '未分類'}`);
            console.log(`      有用次數: ${faq.helpful_count} | 查看次數: ${faq.view_count}`);
          });
        } else {
          console.log('❌ 未找到相關 FAQ');
        }
      }

      // 測試 4: 獲取熱門 FAQ
      console.log('\n🔍 測試 4: 獲取熱門 FAQ');
      const popularFAQs = await faqSearchService.getPopularFAQs(5);
      if (popularFAQs.length > 0) {
        console.log(`✅ 找到 ${popularFAQs.length} 個熱門 FAQ:`);
        popularFAQs.forEach((faq, index) => {
          console.log(`   ${index + 1}. ${faq.question}`);
          console.log(`      查看次數: ${faq.view_count} | 有用次數: ${faq.helpful_count}`);
        });
      } else {
        console.log('❌ 沒有熱門 FAQ 資料');
      }

      // 測試 5: 按分類搜尋 FAQ
      if (categories.length > 0) {
        console.log('\n🔍 測試 5: 按分類搜尋 FAQ');
        const firstCategory = categories[0];
        console.log(`🗂️  搜尋分類: "${firstCategory.name}"`);
        
        const categoryFAQs = await faqSearchService.searchByCategory(firstCategory.id, 3);
        if (categoryFAQs.length > 0) {
          console.log(`✅ 找到 ${categoryFAQs.length} 個 FAQ:`);
          categoryFAQs.forEach((faq, index) => {
            console.log(`   ${index + 1}. ${faq.question}`);
          });
        } else {
          console.log('❌ 該分類下沒有 FAQ');
        }
      }

      console.log('\n🎉 FAQ 搜尋服務測試完成！');
      
      return true;
    } catch (error) {
      console.error('❌ FAQ 搜尋測試失敗:', error);
      return false;
    } finally {
      // 關閉資料庫連接
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
        console.log('📡 資料庫連接已關閉');
      }
    }
  }
}

// 執行測試
async function runTest() {
  const tester = new FAQSearchTester();
  
  console.log('📋 FAQ 搜尋服務測試');
  console.log('- 測試直接 TypeORM 查詢功能');
  console.log('- 驗證 MCP Service 移除後的功能完整性\n');
  
  const success = await tester.testFAQSearch();
  process.exit(success ? 0 : 1);
}

// 只有直接執行這個檔案時才運行測試
if (import.meta.url === `file://${process.argv[1]}`) {
  runTest().catch(console.error);
}

export { FAQSearchTester };
