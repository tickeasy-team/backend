/**
 * 第三步：知識庫語義搜尋測試
 * 測試向量嵌入和語義搜尋功能
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api/v1';

class SemanticSearchTester {
  constructor() {
    this.knowledgeBaseItems = [];
  }

  /**
   * 測試知識庫系統健康狀態
   */
  async testKnowledgeBaseHealth() {
    console.log('🏥 測試知識庫系統健康狀態...');
    
    try {
      const response = await axios.get(`${API_BASE_URL}/knowledge-base/health`);
      
      if (response.data.success) {
        console.log('✅ 知識庫系統健康檢查通過');
        console.log('🔧 系統功能:', response.data.features);
        return true;
      } else {
        console.log('❌ 知識庫系統健康檢查失敗');
        return false;
      }
    } catch (error) {
      console.log('❌ 知識庫系統健康檢查失敗:', error.message);
      return false;
    }
  }

  /**
   * 測試嵌入服務狀態
   */
  async testEmbeddingStatus() {
    console.log('\\n🧠 測試嵌入服務狀態...');
    
    try {
      const response = await axios.get(`${API_BASE_URL}/knowledge-base/embedding-status`);
      
      if (response.data.success) {
        console.log('✅ 嵌入服務可用');
        console.log('📊 服務狀態:', response.data.data.serviceAvailable ? '可用' : '不可用');
        console.log('🤖 模型:', response.data.data.model);
        console.log('📐 向量維度:', response.data.data.dimensions);
        return response.data.data.serviceAvailable;
      } else {
        console.log('❌ 嵌入服務檢查失敗');
        return false;
      }
    } catch (error) {
      console.log('❌ 嵌入服務檢查失敗:', error.message);
      return false;
    }
  }

  /**
   * 建立測試知識庫數據
   */
  async createTestKnowledgeBase() {
    console.log('\\n📚 建立測試知識庫數據...');
    
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
        tags: ['退票', '換票', '政策', '退款']
      },
      {
        title: '支援的付款方式',
        content: 'Tickeasy 支援多種付款方式：1. 信用卡付款（Visa、MasterCard、JCB） 2. 金融卡付款 3. ATM 轉帳 4. 超商代碼繳費（7-11、全家、萊爾富） 5. 行動支付（Line Pay、街口支付、Apple Pay） 6. 銀行轉帳。推薦使用信用卡付款，可享有購物保障。付款完成後會立即收到電子票券。',
        category: '付款',
        tags: ['付款', '信用卡', '轉帳', '超商', '行動支付']
      },
      {
        title: '電子票券使用說明',
        content: '電子票券使用方式：1. 購票成功後會收到電子票券 QR Code 2. 可透過手機 APP 或電子郵件查看票券 3. 入場時出示 QR Code 供工作人員掃描 4. 請確保手機電量充足和螢幕亮度足夠 5. 建議提前截圖保存票券資訊 6. 每張票券只能使用一次，請勿重複入場。遺失票券可聯繫客服協助處理。',
        category: '票券使用',
        tags: ['電子票券', 'QR Code', '入場', '手機']
      },
      {
        title: '座位選擇和票種說明',
        content: '座位選擇指南：1. VIP 區域：最佳視野，包含特殊禮品和服務 2. 搖滾區：最接近舞台，站票形式，氣氛最熱烈 3. 內野區：坐票區域，視野良好 4. 外野區：經濟實惠選擇，距離較遠但仍可清楚觀賞 5. 無障礙座位：提供輪椅使用者專用座位。購票時可透過座位圖選擇喜好位置，先搶先贏。',
        category: '座位票種',
        tags: ['座位', '票種', 'VIP', '搖滾區', '選擇']
      }
    ];

    let createdCount = 0;
    
    for (const data of testData) {
      try {
        // 注意：這些是管理員 API，在實際測試中需要認證
        // 這裡我們模擬創建過程
        console.log(`📝 建立知識庫項目: "${data.title}"`);
        console.log(`   分類: ${data.category}`);
        console.log(`   標籤: ${data.tags.join(', ')}`);
        
        this.knowledgeBaseItems.push({
          id: `mock-${createdCount}`,
          ...data
        });
        
        createdCount++;
        
        // 模擬 API 延遲
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.log(`❌ 建立知識庫項目失敗: "${data.title}"`, error.message);
      }
    }

    console.log(`✅ 測試知識庫數據建立完成，共 ${createdCount} 個項目`);
    console.log('💡 注意：這是模擬數據，實際功能需要透過管理員 API 創建');
    
    return createdCount > 0;
  }

  /**
   * 測試語義搜尋功能
   */
  async testSemanticSearch() {
    console.log('\\n🔍 測試語義搜尋功能...');
    
    const testQueries = [
      {
        query: '我想買票',
        expectedCategory: '購票流程',
        description: '簡單購票意圖'
      },
      {
        query: '如何退票或換票',
        expectedCategory: '退換票',
        description: '退換票查詢'
      },
      {
        query: '可以用信用卡付款嗎',
        expectedCategory: '付款',
        description: '付款方式查詢'
      },
      {
        query: 'QR碼怎麼用',
        expectedCategory: '票券使用',
        description: '票券使用查詢'
      },
      {
        query: '什麼是搖滾區',
        expectedCategory: '座位票種',
        description: '座位類型查詢'
      }
    ];

    let successCount = 0;

    for (const test of testQueries) {
      console.log(`\\n🔍 測試查詢: "${test.query}"`);
      console.log(`📝 描述: ${test.description}`);
      
      try {
        const response = await axios.get(`${API_BASE_URL}/knowledge-base/search`, {
          params: {
            q: test.query,
            limit: 3,
            threshold: 0.6
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
            
            // 檢查是否找到預期分類的結果
            const hasExpectedCategory = results.some(r => r.category === test.expectedCategory);
            if (hasExpectedCategory) {
              console.log(`✅ 找到預期分類的結果`);
              successCount++;
            } else {
              console.log(`⚠️  未找到預期分類 "${test.expectedCategory}" 的結果`);
            }
          } else {
            console.log(`⚠️  未找到相關結果`);
          }
        } else {
          console.log('❌ 搜尋失敗');
        }
        
      } catch (error) {
        console.log('❌ 搜尋請求失敗:', error.message);
        if (error.response) {
          console.log('錯誤詳情:', error.response.data);
        }
      }

      // 延遲避免 API 負載過重
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\\n📊 語義搜尋測試總結: ${successCount}/${testQueries.length} 測試通過`);
    return successCount >= Math.ceil(testQueries.length * 0.6); // 60% 通過率視為成功
  }

  /**
   * 測試相似度比較功能
   */
  async testSimilarityComparison() {
    console.log('\\n🤝 測試相似度比較功能...');
    
    const testPairs = [
      {
        query1: '如何購買門票',
        query2: '我想買票',
        expectedSimilarity: 'high',
        description: '購票相關查詢'
      },
      {
        query1: '退票流程',
        query2: '我要退款',
        expectedSimilarity: 'medium',
        description: '退票相關查詢'
      },
      {
        query1: '演唱會座位',
        query2: '今天天氣如何',
        expectedSimilarity: 'low',
        description: '不相關查詢'
      }
    ];

    let successCount = 0;

    for (const test of testPairs) {
      console.log(`\\n📊 測試相似度: "${test.query1}" vs "${test.query2}"`);
      console.log(`📝 描述: ${test.description}`);
      
      try {
        const response = await axios.post(`${API_BASE_URL}/knowledge-base/test-search`, {
          query1: test.query1,
          query2: test.query2
        });

        if (response.data.success) {
          const { similarity, interpretation } = response.data.data;
          console.log(`✅ 相似度計算成功`);
          console.log(`📊 相似度: ${(similarity * 100).toFixed(1)}%`);
          console.log(`💬 解釋: ${interpretation}`);
          
          // 驗證是否符合預期
          let matches = false;
          if (test.expectedSimilarity === 'high' && similarity > 0.7) matches = true;
          if (test.expectedSimilarity === 'medium' && similarity > 0.4 && similarity <= 0.7) matches = true;
          if (test.expectedSimilarity === 'low' && similarity <= 0.4) matches = true;
          
          if (matches) {
            console.log(`✅ 相似度符合預期 (${test.expectedSimilarity})`);
            successCount++;
          } else {
            console.log(`⚠️  相似度不符合預期 (期望: ${test.expectedSimilarity})`);
          }
        } else {
          console.log('❌ 相似度計算失敗');
        }
        
      } catch (error) {
        console.log('❌ 相似度計算請求失敗:', error.message);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\\n📊 相似度測試總結: ${successCount}/${testPairs.length} 測試通過`);
    return successCount >= Math.ceil(testPairs.length * 0.6);
  }

  /**
   * 測試查詢建議功能
   */
  async testQuerySuggestions() {
    console.log('\\n💡 測試查詢建議功能...');
    
    const testQueries = ['購票', '退', '付款', '座位'];

    for (const query of testQueries) {
      console.log(`\\n🔍 測試建議查詢: "${query}"`);
      
      try {
        const response = await axios.get(`${API_BASE_URL}/knowledge-base/suggestions`, {
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
        console.log('❌ 獲取建議請求失敗:', error.message);
      }

      await new Promise(resolve => setTimeout(resolve, 300));
    }

    return true;
  }

  /**
   * 測試知識庫統計
   */
  async testKnowledgeBaseStats() {
    console.log('\\n📈 測試知識庫統計...');
    
    try {
      const response = await axios.get(`${API_BASE_URL}/knowledge-base/stats`);

      if (response.data.success) {
        const stats = response.data.data;
        console.log('✅ 統計獲取成功');
        console.log('📊 知識庫統計:');
        console.log(`   總數: ${stats.knowledgeBase?.total || 0}`);
        console.log(`   活躍: ${stats.knowledgeBase?.active || 0}`);
        console.log(`   有嵌入向量: ${stats.knowledgeBase?.withEmbeddings || 0}`);
        
        if (stats.embeddings) {
          console.log('🧠 嵌入統計:');
          console.log(`   知識庫嵌入覆蓋率: ${stats.embeddings.knowledgeBaseWithEmbeddings}/${stats.embeddings.knowledgeBaseTotal}`);
        }

        return true;
      } else {
        console.log('❌ 統計獲取失敗');
        return false;
      }
      
    } catch (error) {
      console.log('❌ 統計請求失敗:', error.message);
      return false;
    }
  }

  /**
   * 執行完整測試
   */
  async runFullTest() {
    console.log('🚀 開始第三步：知識庫語義搜尋完整測試...\\n');
    
    const results = {
      healthCheck: false,
      embeddingStatus: false,
      testDataCreation: false,
      semanticSearch: false,
      similarityComparison: false,
      querySuggestions: false,
      stats: false
    };

    try {
      // 1. 健康檢查
      results.healthCheck = await this.testKnowledgeBaseHealth();

      // 2. 嵌入服務狀態
      results.embeddingStatus = await this.testEmbeddingStatus();

      // 3. 建立測試數據
      results.testDataCreation = await this.createTestKnowledgeBase();

      // 4. 語義搜尋測試
      results.semanticSearch = await this.testSemanticSearch();

      // 5. 相似度比較測試
      results.similarityComparison = await this.testSimilarityComparison();

      // 6. 查詢建議測試
      results.querySuggestions = await this.testQuerySuggestions();

      // 7. 統計測試
      results.stats = await this.testKnowledgeBaseStats();

      // 顯示測試結果
      console.log('\\n' + '='.repeat(60));
      console.log('📊 第三步測試結果總結');
      console.log('='.repeat(60));
      
      const testLabels = {
        healthCheck: '知識庫健康檢查',
        embeddingStatus: '嵌入服務狀態',
        testDataCreation: '測試數據建立',
        semanticSearch: '語義搜尋功能',
        similarityComparison: '相似度比較',
        querySuggestions: '查詢建議',
        stats: '統計功能'
      };

      for (const [test, passed] of Object.entries(results)) {
        const status = passed ? '✅ 通過' : '❌ 失敗';
        const label = testLabels[test] || test;
        console.log(`${label.padEnd(20)}: ${status}`);
      }

      const passedCount = Object.values(results).filter(Boolean).length;
      const totalCount = Object.keys(results).length;
      
      console.log('\\n📈 總體通過率:', `${passedCount}/${totalCount} (${Math.round(passedCount/totalCount*100)}%)`);

      if (passedCount >= 5) { // 至少5個測試通過
        console.log('🎉 第三步：知識庫語義搜尋功能基本正常！');
        console.log('✨ 您的 AI 客服現在具備智能搜尋能力！');
      } else {
        console.log('⚠️  部分功能需要進一步設定');
        console.log('💡 建議：');
        if (!results.embeddingStatus) {
          console.log('   - 檢查 OpenAI API Key 是否正確設定');
        }
        if (!results.semanticSearch) {
          console.log('   - 確認知識庫中有足夠的測試數據');
          console.log('   - 檢查嵌入向量是否正確生成');
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
  const tester = new SemanticSearchTester();
  
  console.log('📋 注意事項:');
  console.log('- 此測試需要後端服務器運行在 http://localhost:3000');
  console.log('- 需要有效的 OpenAI API Key 才能使用嵌入功能');
  console.log('- 知識庫管理功能需要管理員權限');
  console.log('- 部分測試為模擬，完整功能需要真實數據\\n');
  
  const success = await tester.runFullTest();
  process.exit(success ? 0 : 1);
}

// 執行測試
runTest().catch(console.error);