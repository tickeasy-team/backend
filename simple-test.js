/**
 * 簡化版設置驗證
 */

import dotenv from 'dotenv';

// 載入環境變數
dotenv.config();

console.log('🚀 開始設置驗證...\n');

// 1. 檢查環境變數
console.log('🔍 檢查環境變數...');
const requiredVars = [
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_PROJECT_REF', 
  'OPENAI_API_KEY',
  'DB_HOST'
];

let envCheck = true;
for (const varName of requiredVars) {
  const value = process.env[varName];
  if (!value || value.includes('your_') || value.includes('here')) {
    console.log(`❌ ${varName}: 未設置或使用預設值`);
    envCheck = false;
  } else {
    console.log(`✅ ${varName}: 已設置`);
  }
}

// 2. 檢查 OpenAI
console.log('\n🔍 檢查 OpenAI 連接...');
try {
  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: '測試' }],
    max_tokens: 5
  });

  console.log('✅ OpenAI 連接成功');
  console.log(`🤖 回應: ${response.choices[0].message.content}`);
} catch (error) {
  console.log(`❌ OpenAI 連接失敗: ${error.message}`);
}

console.log('\n📋 驗證完成!');

if (envCheck) {
  console.log('🎉 環境設置正確，可以進行下一步！');
} else {
  console.log('⚠️ 請設置缺少的環境變數');
}