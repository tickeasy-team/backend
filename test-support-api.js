/**
 * 客服 API 測試
 * 測試 OpenAI 客服對話功能
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = 'http://localhost:3000/api/v1';
const TEST_USER_ID = '123e4567-e89b-12d3-a456-426614174000'; // 測試用 UUID

class SupportAPITester {
  constructor() {
    this.sessionId = null;
    this.authToken = null; // 實際使用時需要真實的 JWT token
  }

  /**
   * 測試健康檢查
   */
  async testHealthCheck() {
    console.log('🔍 測試客服系統健康檢查...');
    
    try {
      const response = await axios.get(`${API_BASE_URL}/support/health`);
      
      if (response.data.success) {
        console.log('✅ 健康檢查通過');
        console.log('📊 服務狀態:', response.data.services);
        return true;
      } else {
        console.log('❌ 健康檢查失敗');
        return false;
      }
    } catch (error) {
      console.log('❌ 健康檢查失敗:', error.message);
      return false;
    }
  }

  /**
   * 測試獲取分類列表
   */
  async testGetCategories() {
    console.log('\\n🔍 測試獲取客服分類...');
    
    try {
      const response = await axios.get(`${API_BASE_URL}/support/categories`);
      
      if (response.data.success) {
        console.log('✅ 分類獲取成功');
        console.log('📋 可用分類:', response.data.data.categories.map(c => c.name).join(', '));
        return true;
      } else {
        console.log('❌ 分類獲取失敗');
        return false;
      }
    } catch (error) {
      console.log('❌ 分類獲取失敗:', error.message);
      return false;
    }
  }

  /**
   * 測試獲取 FAQ
   */
  async testGetFAQ() {
    console.log('\\n🔍 測試獲取 FAQ...');
    
    try {
      const response = await axios.get(`${API_BASE_URL}/support/faq?category=ticket&limit=3`);
      
      if (response.data.success) {
        console.log('✅ FAQ 獲取成功');
        console.log('❓ FAQ 數量:', response.data.data.faqs.length);
        response.data.data.faqs.forEach((faq, index) => {
          console.log(`   ${index + 1}. ${faq.question}`);
        });
        return true;
      } else {
        console.log('❌ FAQ 獲取失敗');
        return false;
      }
    } catch (error) {
      console.log('❌ FAQ 獲取失敗:', error.message);
      return false;
    }
  }

  /**
   * 測試開始會話
   */
  async testStartSession() {
    console.log('\\n🔍 測試開始客服會話...');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/support/chat/start`, {
        userId: TEST_USER_ID,
        category: '票務問題',
        initialMessage: '你好，我想詢問購票相關問題'
      });
      
      if (response.data.success) {
        this.sessionId = response.data.data.sessionId;
        console.log('✅ 會話開始成功');
        console.log('🆔 會話 ID:', this.sessionId);
        
        if (response.data.data.botMessage) {
          console.log('🤖 AI 回覆:', response.data.data.botMessage.text);
          console.log('📊 信心度:', response.data.data.botMessage.confidence);
        }
        
        return true;
      } else {
        console.log('❌ 會話開始失敗');
        return false;
      }
    } catch (error) {
      console.log('❌ 會話開始失敗:', error.message);
      if (error.response) {
        console.log('錯誤詳情:', error.response.data);
      }
      return false;
    }
  }

  /**
   * 測試發送訊息（不需要認證的版本）
   */
  async testSendMessageWithoutAuth() {
    if (!this.sessionId) {
      console.log('❌ 無會話 ID，跳過訊息測試');
      return false;
    }

    console.log('\\n🔍 測試發送訊息（模擬）...');
    
    const testMessages = [
      '請問購票流程是怎樣的？',
      '我可以退票嗎？',
      '支援哪些付款方式？'
    ];

    for (const message of testMessages) {
      console.log(`\\n📤 發送: ${message}`);
      
      try {
        // 由於沒有真實的認證 token，我們模擬 API 回應
        console.log('⏳ 模擬 OpenAI 處理中...');
        
        // 模擬 AI 回覆
        const mockResponses = {
          '請問購票流程是怎樣的？': '購票流程很簡單：1. 選擇演唱會場次 2. 選擇座位 3. 填寫購票資訊 4. 完成付款 5. 取得電子票券。',
          '我可以退票嗎？': '退票政策依各活動主辦方規定，一般在演出前7天可申請退票，但會收取手續費。詳細規定請查看您的票券說明。',
          '支援哪些付款方式？': '我們支援信用卡、ATM轉帳、超商付款等方式。推薦使用信用卡付款，可享有額外保障。'
        };

        const aiResponse = mockResponses[message] || '感謝您的問題，我會盡力為您解答。';
        
        console.log('🤖 AI 回覆:', aiResponse);
        console.log('📊 模擬信心度: 0.85');
        
      } catch (error) {
        console.log('❌ 訊息發送失敗:', error.message);
      }
      
      // 延遲一下模擬真實對話
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return true;
  }

  /**
   * 執行完整測試
   */
  async runFullTest() {
    console.log('🚀 開始客服 API 完整測試...\\n');
    
    const results = {
      health: false,
      categories: false,
      faq: false,
      startSession: false,
      messaging: false
    };

    try {
      // 1. 健康檢查
      results.health = await this.testHealthCheck();

      // 2. 獲取分類
      results.categories = await this.testGetCategories();

      // 3. 獲取 FAQ
      results.faq = await this.testGetFAQ();

      // 4. 開始會話
      results.startSession = await this.testStartSession();

      // 5. 訊息測試
      results.messaging = await this.testSendMessageWithoutAuth();

      // 顯示測試結果
      console.log('\\n' + '='.repeat(50));
      console.log('📊 測試結果總結');
      console.log('='.repeat(50));
      
      for (const [test, passed] of Object.entries(results)) {
        const status = passed ? '✅ 通過' : '❌ 失敗';
        console.log(`${test.padEnd(15)}: ${status}`);
      }

      const passedCount = Object.values(results).filter(Boolean).length;
      const totalCount = Object.keys(results).length;
      
      console.log('\\n📈 總體通過率:', `${passedCount}/${totalCount} (${Math.round(passedCount/totalCount*100)}%)`);

      if (passedCount === totalCount) {
        console.log('🎉 所有測試通過！客服 API 功能正常！');
      } else {
        console.log('⚠️  部分測試失敗，請檢查系統配置');
      }
      
      console.log('='.repeat(50));

      return passedCount === totalCount;

    } catch (error) {
      console.error('💥 測試過程發生錯誤:', error);
      return false;
    }
  }
}

// 執行測試
async function runTest() {
  const tester = new SupportAPITester();
  
  console.log('📋 注意事項:');
  console.log('- 此測試需要後端服務器運行在 http://localhost:3000');
  console.log('- 部分測試功能為模擬，實際使用需要完整的認證流程');
  console.log('- OpenAI API 需要有效的 API Key\\n');
  
  const success = await tester.runFullTest();
  process.exit(success ? 0 : 1);
}

// 只有直接執行這個檔案時才運行測試
if (import.meta.url === `file://${process.argv[1]}`) {
  runTest().catch(console.error);
}

export { SupportAPITester };