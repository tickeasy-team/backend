/**
 * 使用 Node.js 內建 fetch 的測試
 */

const API_BASE_URL = 'http://localhost:3000/api/v1';

console.log('🚀 開始使用 fetch 測試...\n');

async function fetchTest() {
  try {
    console.log('📡 正在使用 fetch 發送請求...');
    
    const response = await fetch(`${API_BASE_URL}/support/health`);
    
    console.log('✅ fetch 請求成功!');
    console.log('📊 狀態碼:', response.status);
    
    const data = await response.json();
    console.log('📋 回應內容:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.log('❌ fetch 請求失敗!');
    console.log('📝 錯誤訊息:', error.message);
    console.log('🔧 完整錯誤:', error);
  }
}

fetchTest();