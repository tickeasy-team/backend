import { AppDataSource } from './config/database.js';
import { smartReplyService } from './services/smart-reply-service.js';

async function testIntentArchitecture() {
  try {
    await AppDataSource.initialize();
    console.log('🔗 資料庫連接成功');
    
    // 測試各種意圖的查詢
    const testQueries = [
      // 🎵 演唱會相關 (應該有結果)
      '流行音樂中心有什麼演唱會',
      '流行音樂中心有什麼活動',
      '板橋有什麼演出',
      
      // 🍽️ 美食相關 (邊界案例 - 重點測試)
      '流行音樂中心有什麼好吃的',
      '流行音樂中心附近有餐廳嗎',
      '板橋好吃的餐廳',
      
      // 🏨 住宿相關
      '流行音樂中心附近有飯店嗎',
      '台北住宿推薦',
      
      // 🚗 交通相關
      '流行音樂中心怎麼去',
      '板橋停車場',
      
      // 🎧 一般客服
      '如何購票',
      '退票流程',
      
      // ❓ 模糊查詢
      '流行音樂中心',
      '有什麼推薦的嗎'
    ];
    
    for (const query of testQueries) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔍 測試查詢: "${query}"`);
      console.log(`${'='.repeat(60)}`);
      
      const startTime = Date.now();
      const response = await smartReplyService.getSmartReply(query);
      const endTime = Date.now();
      
      console.log(`📝 回覆類型: ${response.type}`);
      console.log(`⏱️  處理時間: ${endTime - startTime}ms`);
      
      if (response.metadata.intentAnalysis) {
        const intent = response.metadata.intentAnalysis;
        console.log(`🎯 意圖分析:`);
        console.log(`   主要意圖: ${intent.primaryIntent}`);
        console.log(`   信心度: ${intent.confidence}`);
        console.log(`   關鍵詞: [${intent.keywords.join(', ')}]`);
        console.log(`   衝突檢測: ${intent.conflictDetected ? '⚠️ 是' : '✅ 否'}`);
        console.log(`   判斷理由: ${intent.reasoning}`);
      }
      
      console.log(`💬 回覆訊息:`);
      console.log(`${response.message.slice(0, 200)}${response.message.length > 200 ? '...' : ''}`);
      
      // 特別標記重要測試案例
      if (query.includes('好吃')) {
        console.log(`🎯 【重點測試】美食查詢是否正確路由到美食意圖: ${response.type === 'food_info' ? '✅ 成功' : '❌ 失敗'}`);
      }
      
      if (query.includes('演唱會') || query.includes('活動') || query.includes('演出')) {
        console.log(`🎵 【演唱會測試】是否正確識別: ${response.type === 'concert_search' ? '✅ 成功' : '❌ 失敗'}`);
      }
    }
    
    await AppDataSource.destroy();
    console.log('\n✅ 測試完成');
    
  } catch (error) {
    console.error('❌ 測試失敗:', error);
    await AppDataSource.destroy();
  }
}

// 如果直接執行這個檔案就運行測試，否則可以作為模組導入
if (import.meta.url === `file://${process.argv[1]}`) {
  testIntentArchitecture();
}

export { testIntentArchitecture }; 