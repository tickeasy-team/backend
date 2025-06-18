/**
 * 詳細調試版本的客服 API 測試
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api/v1';

console.log('🚀 開始客服 API 調試測試...\n');
console.log('🔗 測試 URL:', `${API_BASE_URL}/support/health`);

async function debugTest() {
  try {
    console.log('📡 正在發送請求...');
    
    // 設置詳細的 axios 配置
    const response = await axios.get(`${API_BASE_URL}/support/health`, {
      timeout: 5000, // 5秒超時
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ 請求成功!');
    console.log('📊 狀態碼:', response.status);
    console.log('📋 回應內容:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ 請求失敗!');
    console.log('🔍 錯誤類型:', error.constructor.name);
    console.log('📝 錯誤訊息:', error.message);
    
    if (error.response) {
      console.log('📊 HTTP 狀態碼:', error.response.status);
      console.log('📋 錯誤回應:', error.response.data);
    } else if (error.request) {
      console.log('🌐 網路問題 - 沒有收到回應');
      console.log('📡 請求詳情:', error.request);
    } else {
      console.log('⚙️ 設定問題:', error.message);
    }
    
    console.log('🔧 完整錯誤對象:', error);
  }
}

console.log('🔍 檢查 axios 模組...');
console.log('📦 axios 版本:', axios.VERSION || 'unknown');

debugTest();