/**
 * 智能客服完整測試
 * 測試新的架構：直接 Supabase + OpenAI
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api/v1';

class SmartCustomerServiceTester {
  constructor() {
    this.testResults = {};
  }

  /**
   * 測試系統健康狀態
   */
  async testHealthCheck() {
    console.log('🏥 測試智能客服系統健康狀態...');
    
    try {
      const response = await axios.get(`${API_BASE_URL}/ai-customer-service/health`);
      
      if (response.data.success) {
        console.log('✅ 系統健康檢查通過');
        console.log('🔧 服務狀態:', response.data.data.services);
        console.log('💡 可用功能:', response.data.data.features);
        return true;
      } else {
        console.log('❌ 系統健康檢查失敗:', response.data.message);
        return false;
      }
    } catch (error) {
      console.log('❌ 系統健康檢查失敗:', error.message);
      return false;
    }
  }

  /**
   * 測試知識庫搜尋
   */
  async testKnowledgeBaseSearch() {
    console.log('\\n🔍 測試知識庫搜尋功能...');
    
    const testQueries = [
      {
        query: '購票',
        description: '購票相關查詢'
      },
      {
        query: '退票',
        description: '退票相關查詢'
      },
      {
        query: '付款',
        description: '付款相關查詢'
      },
      {
        query: 'QR',
        description: '票券使用查詢'
      }
    ];

    let successCount = 0;

    for (const test of testQueries) {
      console.log(`\\n🔍 測試搜尋: "${test.query}"`);
      console.log(`📝 描述: ${test.description}`);
      
      try {
        const response = await axios.get(`${API_BASE_URL}/ai-customer-service/search`, {
          params: {
            q: test.query,
            limit: 3
          }
        });

        if (response.data.success) {
          const results = response.data.data.results;
          console.log(`✅ 搜尋成功，找到 ${results.length} 個結果`);
          
          if (results.length > 0) {
            const topResult = results[0];
            console.log(`🎯 最相關結果: "${topResult.title}"`);
            console.log(`📊 相似度: ${(topResult.similarity * 100).toFixed(1)}%`);
            console.log(`📂 分類: ${topResult.category || '未分類'}`);
            successCount++;
          } else {
            console.log(`⚠️  未找到相關結果`);
          }
        } else {
          console.log('❌ 搜尋失敗:', response.data.message);
        }
        
      } catch (error) {
        console.log('❌ 搜尋請求失敗:', error.response?.data?.message || error.message);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\\n📊 搜尋測試總結: ${successCount}/${testQueries.length} 測試通過`);
    return successCount >= Math.ceil(testQueries.length * 0.5);
  }

  /**
   * 測試智能對話功能
   */
  async testSmartChat() {
    console.log('\\n🤖 測試智能對話功能...');
    
    const testQuestions = [
      {
        message: '我想買演唱會門票，怎麼買？',
        expectedKeywords: ['購票', '註冊', '登入', '選擇'],
        description: '購票流程諮詢'
      },
      {
        message: '買錯票了可以退票嗎？',
        expectedKeywords: ['退票', '政策', '申請', '退款'],
        description: '退票政策諮詢'
      },
      {
        message: '你們支援信用卡付款嗎？',
        expectedKeywords: ['信用卡', '付款', 'Visa', 'MasterCard'],
        description: '付款方式諮詢'
      },
      {
        message: '電子票券要怎麼用？',
        expectedKeywords: ['電子票券', 'QR', '掃描', '入場'],
        description: '票券使用諮詢'
      }
    ];

    let successCount = 0;

    for (const test of testQuestions) {
      console.log(`\\n💬 測試對話: "${test.message}"`);
      console.log(`📝 描述: ${test.description}`);
      
      try {
        const response = await axios.post(`${API_BASE_URL}/ai-customer-service/chat`, {
          message: test.message
        });

        if (response.data.success) {
          const { response: aiResponse, confidence, hasRelevantInfo, sources } = response.data.data;
          
          console.log(`✅ AI 回覆成功`);
          console.log(`📊 信心度: ${(confidence * 100).toFixed(1)}%`);
          console.log(`📚 找到相關資料: ${hasRelevantInfo ? '是' : '否'}`);
          console.log(`🔗 參考來源: ${sources.length} 個`);
          console.log(`💬 回覆預覽: "${aiResponse.slice(0, 100)}${aiResponse.length > 100 ? '...' : ''}"`);
          
          // 檢查回覆品質
          const hasExpectedKeywords = test.expectedKeywords.some(keyword => 
            aiResponse.toLowerCase().includes(keyword.toLowerCase())
          );
          
          if (hasExpectedKeywords && confidence > 0.3) {
            console.log(`✅ 回覆品質良好`);
            successCount++;
          } else {
            console.log(`⚠️  回覆品質需要改善`);
          }
        } else {
          console.log('❌ AI 回覆失敗:', response.data.message);
        }
        
      } catch (error) {
        console.log('❌ 對話請求失敗:', error.response?.data?.message || error.message);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\\n📊 對話測試總結: ${successCount}/${testQuestions.length} 測試通過`);
    return successCount >= Math.ceil(testQuestions.length * 0.5);
  }

  /**
   * 測試常見問題功能
   */
  async testCommonQuestions() {
    console.log('\\n💡 測試常見問題功能...');
    
    try {
      const response = await axios.get(`${API_BASE_URL}/ai-customer-service/common-questions`);

      if (response.data.success) {
        const questions = response.data.data.questions;
        console.log(`✅ 獲得 ${questions.length} 個常見問題`);
        questions.slice(0, 5).forEach((question, index) => {
          console.log(`   ${index + 1}. ${question}`);
        });
        return true;
      } else {
        console.log('❌ 獲取常見問題失敗');
        return false;
      }
      
    } catch (error) {
      console.log('❌ 常見問題請求失敗:', error.response?.data?.message || error.message);
      return false;
    }
  }

  /**
   * 測試查詢建議功能
   */
  async testQuerySuggestions() {
    console.log('\\n🔮 測試查詢建議功能...');
    
    const testQueries = ['購', '退', '付', '票'];

    for (const query of testQueries) {
      console.log(`\\n🔍 測試建議查詢: "${query}"`);
      
      try {
        const response = await axios.get(`${API_BASE_URL}/ai-customer-service/suggestions`, {
          params: {
            q: query,
            limit: 3
          }
        });

        if (response.data.success) {
          const suggestions = response.data.data.suggestions;
          console.log(`✅ 獲得 ${suggestions.length} 個建議`);
          suggestions.forEach((suggestion, index) => {
            console.log(`   ${index + 1}. ${suggestion}`);
          });
        } else {
          console.log('❌ 獲取建議失敗');
        }
        
      } catch (error) {
        console.log('❌ 建議請求失敗:', error.response?.data?.message || error.message);
      }

      await new Promise(resolve => setTimeout(resolve, 300));
    }

    return true;
  }

  /**
   * 測試統計功能
   */
  async testStats() {
    console.log('\\n📈 測試統計功能...');
    
    try {
      const response = await axios.get(`${API_BASE_URL}/ai-customer-service/stats`);

      if (response.data.success) {
        const { knowledgeBase, serviceStatus } = response.data.data;
        console.log('✅ 統計獲取成功');
        console.log('📊 知識庫統計:');
        console.log(`   總數: ${knowledgeBase.total}`);
        console.log(`   活躍: ${knowledgeBase.active}`);
        console.log(`   分類數: ${knowledgeBase.categories.length}`);
        console.log('🔧 服務狀態:');
        console.log(`   Supabase: ${serviceStatus.supabaseConnected ? '✅' : '❌'}`);
        console.log(`   OpenAI: ${serviceStatus.openaiAvailable ? '✅' : '❌'}`);
        return true;
      } else {
        console.log('❌ 統計獲取失敗');
        return false;
      }
      
    } catch (error) {
      console.log('❌ 統計請求失敗:', error.response?.data?.message || error.message);
      return false;
    }
  }

  /**
   * 測試對話功能完整性
   */
  async testChatFunctionality() {
    console.log('\\n🧪 測試對話功能完整性...');
    
    try {
      const response = await axios.get(`${API_BASE_URL}/ai-customer-service/test/chat`);

      if (response.data.success) {
        const { results, successRate, isHealthy } = response.data.data;
        console.log(`✅ 功能測試完成: ${response.data.message}`);
        console.log(`📊 成功率: ${(successRate * 100).toFixed(1)}%`);
        console.log(`🏥 系統健康: ${isHealthy ? '正常' : '異常'}`);
        
        results.forEach((result, index) => {
          const status = result.success ? '✅' : '❌';
          console.log(`   ${index + 1}. ${status} "${result.query}"`);
          if (result.success) {
            console.log(`      信心度: ${(result.confidence * 100).toFixed(1)}% | 來源: ${result.sourcesCount} 個`);
          }
        });
        
        return isHealthy;
      } else {
        console.log('❌ 功能測試失敗');
        return false;
      }
      
    } catch (error) {
      console.log('❌ 功能測試請求失敗:', error.response?.data?.message || error.message);
      return false;
    }
  }

  /**
   * 執行完整測試
   */
  async runFullTest() {
    console.log('🚀 開始智能客服完整測試...\\n');
    
    const results = {
      healthCheck: false,
      knowledgeBaseSearch: false,
      smartChat: false,
      commonQuestions: false,
      querySuggestions: false,
      stats: false,
      chatFunctionality: false
    };

    try {
      // 1. 健康檢查
      results.healthCheck = await this.testHealthCheck();

      // 2. 知識庫搜尋測試
      results.knowledgeBaseSearch = await this.testKnowledgeBaseSearch();

      // 3. 智能對話測試
      results.smartChat = await this.testSmartChat();

      // 4. 常見問題測試
      results.commonQuestions = await this.testCommonQuestions();

      // 5. 查詢建議測試
      results.querySuggestions = await this.testQuerySuggestions();

      // 6. 統計測試
      results.stats = await this.testStats();

      // 7. 對話功能完整性測試
      results.chatFunctionality = await this.testChatFunctionality();

      // 顯示測試結果
      console.log('\\n' + '='.repeat(60));
      console.log('📊 智能客服測試結果總結');
      console.log('='.repeat(60));
      
      const testLabels = {
        healthCheck: '系統健康檢查',
        knowledgeBaseSearch: '知識庫搜尋',
        smartChat: '智能對話',
        commonQuestions: '常見問題',
        querySuggestions: '查詢建議',
        stats: '統計功能',
        chatFunctionality: '對話功能完整性'
      };

      for (const [test, passed] of Object.entries(results)) {
        const status = passed ? '✅ 通過' : '❌ 失敗';
        const label = testLabels[test] || test;
        console.log(`${label.padEnd(20)}: ${status}`);
      }

      const passedCount = Object.values(results).filter(Boolean).length;
      const totalCount = Object.keys(results).length;
      
      console.log('\\n📈 總體通過率:', `${passedCount}/${totalCount} (${Math.round(passedCount/totalCount*100)}%)`);

      if (passedCount >= 5) {
        console.log('🎉 智能客服系統基本功能正常！');
        console.log('✨ 您的 AI 客服已準備好為用戶服務！');
        console.log('🌟 架構升級成功：用戶提問 → 後端 → OpenAI + Supabase → 智能回覆');
      } else {
        console.log('⚠️  部分功能需要進一步調整');
        console.log('💡 建議檢查：');
        if (!results.healthCheck) {
          console.log('   - Supabase 連接設定');
          console.log('   - OpenAI API Key 設定');
        }
        if (!results.knowledgeBaseSearch) {
          console.log('   - 知識庫數據是否存在');
        }
        if (!results.smartChat) {
          console.log('   - OpenAI 服務是否正常');
        }
      }
      
      console.log('='.repeat(60));

      return passedCount >= 5;

    } catch (error) {
      console.error('💥 測試過程發生錯誤:', error);
      return false;
    }
  }
}

// 執行測試
async function runTest() {
  const tester = new SmartCustomerServiceTester();
  
  console.log('📋 智能客服測試說明:');
  console.log('- 測試新架構: 直接 Supabase + OpenAI (移除 MCP)');
  console.log('- 需要後端服務器運行在 http://localhost:3000');
  console.log('- 需要有效的 OpenAI API Key');
  console.log('- 需要 Supabase 連接正常');
  console.log('- 適合生產環境部署到 Render\\n');
  
  const success = await tester.runFullTest();
  process.exit(success ? 0 : 1);
}

// 執行測試
runTest().catch(console.error);
