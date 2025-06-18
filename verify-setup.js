/**
 * 完整的設置驗證腳本 - 修復版
 */

import dotenv from 'dotenv';

// 載入環境變數
dotenv.config();

async function runValidation() {
  console.log('🚀 開始完整設置驗證...\n');

  let allPassed = true;

  try {
    // 1. 環境變數檢查
    console.log('🔍 檢查環境變數設置...');
    const requiredVars = {
      'SUPABASE_ACCESS_TOKEN': '用於 MCP Server 連接',
      'SUPABASE_PROJECT_REF': '您的 Supabase 專案 ID',
      'OPENAI_API_KEY': '用於 AI 對話功能',
      'DB_HOST': '資料庫連接'
    };

    let envPassed = true;
    for (const [varName, description] of Object.entries(requiredVars)) {
      const value = process.env[varName];
      if (!value) {
        console.log(`❌ ${varName}: 未設置 (${description})`);
        envPassed = false;
      } else if (value.includes('your_') || value.includes('here')) {
        console.log(`⚠️  ${varName}: 使用預設值，需要更新 (${description})`);
        envPassed = false;
      } else {
        console.log(`✅ ${varName}: 已正確設置`);
      }
    }

    if (!envPassed) {
      allPassed = false;
      console.log('\n💡 請到 Supabase Dashboard 獲取 Personal Access Token');
      console.log('   並更新 .env 檔案中的相關設定');
    }

    // 2. OpenAI 連接測試
    console.log('\n🔍 測試 OpenAI API 連接...');
    try {
      const { default: OpenAI } = await import('openai');
      
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('your_')) {
        console.log('❌ OpenAI API Key 未設置');
        allPassed = false;
      } else {
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });

        const response = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: '請回答：連接測試成功' }],
          max_tokens: 10
        });

        console.log('✅ OpenAI 連接成功');
        console.log(`🤖 測試回應: ${response.choices[0].message.content}`);
      }
    } catch (error) {
      console.log(`❌ OpenAI 連接失敗: ${error.message}`);
      if (error.message.includes('API key')) {
        console.log('💡 請檢查 OPENAI_API_KEY 是否正確');
      }
      allPassed = false;
    }

    // 3. Supabase 基本設定檢查
    console.log('\n🔍 檢查 Supabase 設定...');
    if (process.env.DB_URL && process.env.DB_ANON_KEY) {
      console.log('✅ Supabase 基本設定存在');
      
      // 檢查專案 ID 是否一致
      const projectRef = process.env.SUPABASE_PROJECT_REF;
      const dbUrl = process.env.DB_URL;
      
      if (projectRef && dbUrl.includes(projectRef)) {
        console.log('✅ 專案 ID 設定一致');
      } else {
        console.log('⚠️  專案 ID 可能不一致，請檢查設定');
      }
    } else {
      console.log('❌ Supabase 基本設定缺失');
      allPassed = false;
    }

    // 4. 顯示檔案檢查
    console.log('\n🔍 檢查必要檔案...');
    const files = [
      '.cursor/mcp.json',
      'services/mcp-service.js',
      'MCP_SETUP.md'
    ];

    for (const file of files) {
      try {
        const { existsSync } = await import('fs');
        if (existsSync(file)) {
          console.log(`✅ ${file}: 存在`);
        } else {
          console.log(`❌ ${file}: 不存在`);
        }
      } catch (error) {
        console.log(`⚠️  無法檢查檔案: ${file}`);
      }
    }

    // 總結
    console.log('\n' + '='.repeat(50));
    if (allPassed) {
      console.log('🎉 所有檢查通過！您可以開始下一步了！');
      console.log('📋 下一步: 建立基本的 OpenAI 對話功能');
      console.log('\n請回覆: "MCP 設置完成，準備開始第二步！"');
    } else {
      console.log('⚠️  部分檢查未通過，請按照上述建議進行修正');
      console.log('📖 詳細說明請參考: MCP_SETUP.md');
      console.log('\n修正後請重新執行: npm run verify:setup');
    }
    console.log('='.repeat(50));

    return allPassed;

  } catch (error) {
    console.error('❌ 驗證過程發生錯誤:', error.message);
    return false;
  }
}

// 執行驗證
runValidation()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('💥 驗證失敗:', error);
    process.exit(1);
  });