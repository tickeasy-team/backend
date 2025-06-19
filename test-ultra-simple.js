/**
 * 超級簡單的重構驗證
 * 只測試最基本的 import 和服務初始化
 */

console.log('🎯 開始超級簡單重構驗證...\n');

try {
  // 測試 1: 基本 import
  console.log('📦 測試 1: 檢查基本 import');
  
  console.log('  - 導入 dotenv...');
  const dotenv = await import('dotenv');
  dotenv.config();
  console.log('  ✅ dotenv 導入成功');
  
  console.log('  - 檢查環境變數...');
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const hasDB = Boolean(process.env.DB_HOST);
  const hasMCP = Boolean(process.env.SUPABASE_ACCESS_TOKEN);
  
  console.log(`  - OPENAI_API_KEY: ${hasOpenAI ? '✅ 已設定' : '❌ 未設定'}`);
  console.log(`  - DB_HOST: ${hasDB ? '✅ 已設定' : '❌ 未設定'}`);
  console.log(`  - MCP Token: ${hasMCP ? '⚠️  仍存在' : '✅ 已移除'}`);
  
  // 測試 2: OpenAI 模組 import
  console.log('\n🤖 測試 2: OpenAI 模組導入');
  console.log('  - 導入 OpenAI...');
  const OpenAI = await import('openai');
  console.log('  ✅ OpenAI 模組導入成功');
  
  console.log('  - 測試 OpenAI 初始化...');
  if (hasOpenAI) {
    const openai = new OpenAI.default({
      apiKey: process.env.OPENAI_API_KEY
    });
    console.log('  ✅ OpenAI 實例創建成功');
  } else {
    console.log('  ⚠️  跳過 OpenAI 初始化（沒有 API Key）');
  }
  
  // 測試 3: 檢查編譯的 dist 目錄
  console.log('\n📁 測試 3: 檢查編譯狀態');
  const fs = await import('fs');
  const distExists = fs.existsSync('./dist');
  console.log(`  - dist 目錄: ${distExists ? '✅ 存在' : '❌ 不存在 (需要執行 npm run build)'}`);
  
  if (distExists) {
    const serverExists = fs.existsSync('./dist/bin/server.js');
    console.log(`  - 編譯的服務器: ${serverExists ? '✅ 存在' : '❌ 不存在'}`);
  }
  
  // 測試結果
  console.log('\n' + '='.repeat(50));
  console.log('📊 超級簡單驗證結果');
  console.log('='.repeat(50));
  
  const checks = [
    { name: '環境變數設定', pass: hasOpenAI && hasDB },
    { name: 'MCP 已移除', pass: !hasMCP },
    { name: 'OpenAI 模組', pass: true },
    { name: '編譯狀態', pass: distExists }
  ];
  
  checks.forEach(check => {
    const status = check.pass ? '✅ 通過' : '❌ 失敗';
    console.log(`${check.name.padEnd(15)}: ${status}`);
  });
  
  const passedCount = checks.filter(c => c.pass).length;
  console.log(`\n📈 通過率: ${passedCount}/${checks.length} (${Math.round(passedCount/checks.length*100)}%)`);
  
  if (passedCount >= 3) {
    console.log('\n🎉 基本重構驗證成功！');
    console.log('💡 建議下一步:');
    console.log('   1. npm run build (如果 dist 不存在)');
    console.log('   2. npm run dev (啟動服務器)');
    console.log('   3. npm run test:support (測試 API)');
  } else {
    console.log('\n⚠️  基本配置有問題，請檢查:');
    if (!hasOpenAI) console.log('   - 設定 OPENAI_API_KEY');
    if (!hasDB) console.log('   - 檢查資料庫配置');
    if (hasMCP) console.log('   - 移除 .env 中的 MCP 變數');
    if (!distExists) console.log('   - 執行 npm run build');
  }
  
  console.log('='.repeat(50));
  
} catch (error) {
  console.error('❌ 測試過程發生錯誤:', error.message);
  console.error('堆疊追蹤:', error.stack);
  process.exit(1);
}

console.log('\n✅ 超級簡單驗證完成！');
