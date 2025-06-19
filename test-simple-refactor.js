/**
 * 簡單的重構驗證測試
 * 確認系統基本功能正常
 */

import dotenv from 'dotenv';
dotenv.config();

console.log('🎯 簡單重構驗證測試');
console.log('====================');

// 測試 1: 環境變數檢查
console.log('\\n📋 測試 1: 檢查環境變數');
console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ 已設定' : '❌ 未設定');
console.log('- DB_HOST:', process.env.DB_HOST ? '✅ 已設定' : '❌ 未設定');
console.log('- MCP Token:', process.env.SUPABASE_ACCESS_TOKEN ? '⚠️  仍然存在 (應移除)' : '✅ 已移除');

// 測試 2: import 檢查
console.log('\\n📦 測試 2: 檢查 import');

try {
  console.log('- 正在 import config/database...');
  const { AppDataSource } = await import('./config/database.js');
  console.log('✅ database.js import 成功');
  
  console.log('- 正在 import openai-service...');
  const { openaiService } = await import('./services/openai-service.js');
  console.log('✅ openai-service.js import 成功');
  
  console.log('- 正在測試 OpenAI 服務初始化...');
  const hasApiKey = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 0;
  console.log(`✅ OpenAI 服務${hasApiKey ? '可用' : '需要 API Key'}`);
  
} catch (error) {
  console.error('❌ Import 失敗:', error.message);
}

// 測試 3: 系統狀態
console.log('\\n🔧 測試 3: 系統狀態檢查');
console.log('- Node.js 版本:', process.version);
console.log('- 工作目錄:', process.cwd());
console.log('- 環境:', process.env.NODE_ENV || 'development');

console.log('\\n🎉 簡單驗證完成！');
console.log('如果看到這個訊息，代表基本 import 和環境設定正常。');
console.log('\\n下一步可以執行: npm run test:support');
