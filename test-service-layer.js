/**
 * 服務層直接測試
 * 不需要啟動服務器，直接測試核心服務功能
 */

import { AppDataSource } from './config/database.js';
import { openaiService } from './services/openai-service.js';
import dotenv from 'dotenv';

dotenv.config();

class ServiceLayerTester {
  
  async runServiceTests() {
    console.log('🧪 開始服務層測試 (無需服務器)\n');
    
    const results = {
      database: false,
      openaiBasic: false,
      openaiWithContext: false
    };

    try {
      // 1. 資料庫連接測試
      console.log('📡 測試 1: 資料庫連接');
      try {
        if (!AppDataSource.isInitialized) {
          await AppDataSource.initialize();
        }
        results.database = true;
        console.log('✅ 資料庫連接成功\n');
      } catch (error) {
        console.log(`❌ 資料庫連接失敗: ${error.message}\n`);
      }

      // 2. OpenAI 基本功能測試
      console.log('🤖 測試 2: OpenAI 基本對話');
      try {
        console.log('⏳ 正在生成 AI 回覆...');
        const response = await openaiService.generateResponse('你好，我想詢問購票問題');
        
        if (response.success && response.response) {
          results.openaiBasic = true;
          console.log('✅ OpenAI 基本對話成功');
          console.log(`📝 AI 回覆: ${response.response.substring(0, 100)}...`);
          console.log(`📊 信心度: ${response.confidence}`);
          console.log(`⚡ 處理時間: ${response.processingTime}ms`);
          console.log(`🔢 使用 tokens: ${response.tokens}\n`);
        } else {
          console.log(`❌ OpenAI 基本對話失敗: ${response.error}\n`);
        }
      } catch (error) {
        console.log(`❌ OpenAI 基本對話失敗: ${error.message}\n`);
      }

      // 3. OpenAI 知識庫整合測試
      console.log('📚 測試 3: OpenAI 知識庫整合');
      try {
        console.log('⏳ 正在測試知識庫整合...');
        const response = await openaiService.generateResponseWithFAQ('如何購買演唱會門票？');
        
        if (response.success && response.response) {
          results.openaiWithContext = true;
          console.log('✅ 知識庫整合成功');
          console.log(`📝 AI 回覆: ${response.response.substring(0, 100)}...`);
          console.log(`📊 信心度: ${response.confidence}`);
          
          if (response.faqSuggestions && response.faqSuggestions.length > 0) {
            console.log(`🔍 找到 ${response.faqSuggestions.length} 個相關 FAQ`);
          }
          if (response.knowledgeBaseSuggestions && response.knowledgeBaseSuggestions.length > 0) {
            console.log(`📚 找到 ${response.knowledgeBaseSuggestions.length} 個知識庫建議`);
          }
          console.log(`⚡ 處理時間: ${response.processingTime}ms\n`);
        } else {
          console.log(`❌ 知識庫整合失敗: ${response.error}\n`);
        }
      } catch (error) {
        console.log(`❌ 知識庫整合失敗: ${error.message}\n`);
      }

      // 顯示測試結果
      this.displayResults(results);

      return Object.values(results).every(Boolean);

    } catch (error) {
      console.error('💥 測試過程發生錯誤:', error);
      return false;
    } finally {
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
        console.log('📡 資料庫連接已關閉');
      }
    }
  }

  displayResults(results) {
    console.log('='.repeat(50));
    console.log('📊 服務層測試結果');
    console.log('='.repeat(50));
    
    const tests = [
      { name: '資料庫連接', key: 'database' },
      { name: 'OpenAI 基本對話', key: 'openaiBasic' },
      { name: 'OpenAI 知識庫整合', key: 'openaiWithContext' }
    ];

    for (const test of tests) {
      const status = results[test.key] ? '✅ 通過' : '❌ 失敗';
      console.log(`${test.name.padEnd(20)}: ${status}`);
    }

    const passedCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;
    
    console.log(`\n📈 總體通過率: ${passedCount}/${totalCount} (${Math.round(passedCount/totalCount*100)}%)`);
    
    if (passedCount === totalCount) {
      console.log('\n🎉 所有服務層測試通過！');
      console.log('🚀 系統核心功能正常，可以啟動服務器測試 API');
    } else if (passedCount >= 2) {
      console.log('\n⚠️  部分功能正常，基本可用');
    } else {
      console.log('\n❌ 核心功能有問題，需要檢查配置');
    }
    
    console.log('='.repeat(50));
  }
}

// 執行測試
async function runTest() {
  const tester = new ServiceLayerTester();
  
  console.log('🎯 服務層直接測試');
  console.log('- 不需要啟動服務器');
  console.log('- 直接測試核心服務功能');
  console.log('- 驗證重構後系統狀態\n');
  
  const success = await tester.runServiceTests();
  
  if (success) {
    console.log('\n🎯 下一步: 啟動服務器測試 API');
    console.log('1. npm run dev (啟動服務器)');
    console.log('2. npm run test:support (測試 API)');
  }
  
  process.exit(success ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runTest().catch(console.error);
}

export { ServiceLayerTester };
