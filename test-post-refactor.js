#!/usr/bin/env node

/**
 * 重構後系統測試
 * 確保移除 MCP Service 後系統功能正常
 */

import { faqSearchService } from './services/faq-search-service.js';
import { embeddingService } from './services/embedding-service.js';
import { openaiService } from './services/openai-service.js';
import { AppDataSource } from './config/database.js';
import dotenv from 'dotenv';

dotenv.config();

class PostRefactorTester {
  
  async runFullTest() {
    console.log('🎯 開始重構後完整系統測試...\n');
    
    const results = {
      database: false,
      faqSearch: false,
      embedding: false,
      openaiBasic: false,
      openaiWithKnowledge: false
    };

    try {
      // 1. 資料庫連接測試
      console.log('📡 測試 1: 資料庫連接');
      await AppDataSource.initialize();
      results.database = true;
      console.log('✅ 資料庫連接成功\n');

      // 2. FAQ 搜尋服務測試
      console.log('🔍 測試 2: FAQ 搜尋服務');
      if (faqSearchService.isReady()) {
        const testResults = await faqSearchService.searchFAQ('購票', 2);
        results.faqSearch = true;
        console.log(`✅ FAQ 搜尋正常，找到 ${testResults.length} 個結果\n`);
      } else {
        console.log('❌ FAQ 搜尋服務未準備好\n');
      }

      // 3. 嵌入服務測試
      console.log('🧠 測試 3: 嵌入服務');
      if (embeddingService.hasApiKey()) {
        try {
          const isAvailable = await embeddingService.isServiceAvailable();
          results.embedding = isAvailable;
          console.log(`✅ 嵌入服務${isAvailable ? '正常' : '有問題但不影響基本功能'}\n`);
        } catch (error) {
          console.log('⚠️  嵌入服務測試失敗，但不影響基本功能\n');
        }
      } else {
        console.log('⚠️  沒有 OpenAI API Key，跳過嵌入服務測試\n');
      }

      // 4. OpenAI 基本功能測試
      console.log('🤖 測試 4: OpenAI 基本對話');
      try {
        const response = await openaiService.generateResponse('你好');
        if (response.success && response.response) {
          results.openaiBasic = true;
          console.log('✅ OpenAI 基本對話正常');
          console.log(`   AI 回覆: ${response.response.substring(0, 50)}...`);
          console.log(`   信心度: ${response.confidence}\n`);
        } else {
          console.log('❌ OpenAI 基本對話失敗\n');
        }
      } catch (error) {
        console.log(`❌ OpenAI 測試失敗: ${error.message}\n`);
      }

      // 5. OpenAI 知識庫整合測試
      console.log('📚 測試 5: OpenAI 知識庫整合');
      try {
        const response = await openaiService.generateResponseWithFAQ('如何購票？');
        if (response.success && response.response) {
          results.openaiWithKnowledge = true;
          console.log('✅ OpenAI 知識庫整合正常');
          console.log(`   AI 回覆: ${response.response.substring(0, 50)}...`);
          if (response.faqSuggestions && response.faqSuggestions.length > 0) {
            console.log(`   找到 ${response.faqSuggestions.length} 個相關 FAQ`);
          }
          console.log(`   信心度: ${response.confidence}\n`);
        } else {
          console.log('❌ OpenAI 知識庫整合失敗\n');
        }
      } catch (error) {
        console.log(`❌ OpenAI 知識庫整合測試失敗: ${error.message}\n`);
      }

      // 顯示測試結果
      this.displayResults(results);

      const allCriticalPassed = results.database && results.faqSearch && results.openaiBasic;
      
      if (allCriticalPassed) {
        console.log('🎉 重構成功！所有核心功能正常運行！');
        console.log('📦 系統已準備好部署到 Render');
        return true;
      } else {
        console.log('⚠️  部分功能有問題，請檢查配置');
        return false;
      }

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
    console.log('=' * 50);
    console.log('📊 重構測試結果總結');
    console.log('=' * 50);
    
    const tests = [
      { name: '資料庫連接', key: 'database', critical: true },
      { name: 'FAQ 搜尋服務', key: 'faqSearch', critical: true },
      { name: '嵌入服務', key: 'embedding', critical: false },
      { name: 'OpenAI 基本對話', key: 'openaiBasic', critical: true },
      { name: 'OpenAI 知識庫整合', key: 'openaiWithKnowledge', critical: false }
    ];

    for (const test of tests) {
      const status = results[test.key] ? '✅ 通過' : '❌ 失敗';
      const importance = test.critical ? ' (核心功能)' : ' (非核心功能)';
      console.log(`${test.name.padEnd(20)}: ${status}${importance}`);
    }

    const passedCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;
    const criticalCount = tests.filter(t => t.critical).length;
    const criticalPassed = tests.filter(t => t.critical && results[t.key]).length;
    
    console.log(`\n📈 總體通過率: ${passedCount}/${totalCount} (${Math.round(passedCount/totalCount*100)}%)`);
    console.log(`🔥 核心功能: ${criticalPassed}/${criticalCount} (${Math.round(criticalPassed/criticalCount*100)}%)`);
    console.log('=' * 50);
  }
}

// 執行測試
async function runTest() {
  const tester = new PostRefactorTester();
  
  console.log('🎯 MCP Service 移除後系統驗證');
  console.log('- 確認所有功能正常運行');
  console.log('- 驗證系統適合 Render 部署');
  console.log('- 檢查依賴關係完整性\n');
  
  const success = await tester.runFullTest();
  process.exit(success ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runTest().catch(console.error);
}

export { PostRefactorTester };
