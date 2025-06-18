/**
 * 簡化版客服 API 測試
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api/v1';

console.log('🚀 開始客服 API 測試...\n');

async function testSupportAPI() {
  try {
    // 1. 測試健康檢查
    console.log('🔍 測試健康檢查...');
    try {
      const healthResponse = await axios.get(`${API_BASE_URL}/support/health`);
      console.log('✅ 健康檢查成功');
      console.log('📊 服務狀態:', healthResponse.data.services);
    } catch (error) {
      console.log('❌ 健康檢查失敗:', error.message);
      console.log('💡 請確認服務器是否在 http://localhost:3000 運行');
      return;
    }

    // 2. 測試分類
    console.log('\n🔍 測試獲取分類...');
    try {
      const categoriesResponse = await axios.get(`${API_BASE_URL}/support/categories`);
      console.log('✅ 分類獲取成功');
      console.log('📋 分類數量:', categoriesResponse.data.data.categories.length);
    } catch (error) {
      console.log('❌ 分類獲取失敗:', error.message);
    }

    // 3. 測試 FAQ
    console.log('\n🔍 測試獲取 FAQ...');
    try {
      const faqResponse = await axios.get(`${API_BASE_URL}/support/faq`);
      console.log('✅ FAQ 獲取成功');
      console.log('❓ FAQ 數量:', faqResponse.data.data.faqs.length);
    } catch (error) {
      console.log('❌ FAQ 獲取失敗:', error.message);
    }

    // 4. 測試開始會話
    console.log('\n🔍 測試開始會話...');
    try {
      const startResponse = await axios.post(`${API_BASE_URL}/support/chat/start`, {
        // userId: '123e4567-e89b-12d3-a456-426614174000', // 暫時不提供 userId
        category: '票務問題',
        initialMessage: '你好，我想詢問購票問題'
      });
      
      console.log('✅ 會話開始成功');
      console.log('🆔 會話 ID:', startResponse.data.data.sessionId);
      
      if (startResponse.data.data.botMessage) {
        console.log('🤖 AI 回覆:', startResponse.data.data.botMessage.text.substring(0, 100) + '...');
        console.log('📊 信心度:', startResponse.data.data.botMessage.confidence);
      }
    } catch (error) {
      console.log('❌ 會話開始失敗:', error.message);
      if (error.response) {
        console.log('錯誤詳情:', error.response.data);
      }
    }

    console.log('\n🎉 測試完成！');

  } catch (error) {
    console.error('💥 測試過程發生錯誤:', error);
  }
}

// 執行測試
testSupportAPI();