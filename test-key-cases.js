import { AppDataSource } from './config/database.js';
import { smartReplyService } from './services/smart-reply-service.js';

async function testKeyCases() {
  try {
    await AppDataSource.initialize();
    console.log('🔗 資料庫連接成功');
    
    // 重點測試案例
    const keyCases = [
      {
        query: '流行音樂中心有什麼好吃的',
        expectedType: 'food_info',
        description: '🍽️ 邊界案例：美食查詢不應回傳演唱會'
      },
      {
        query: '流行音樂中心有什麼演唱會',
        expectedType: 'concert_search',
        description: '🎵 正常案例：演唱會查詢應該有結果'
      },
      {
        query: '板橋附近有飯店嗎',
        expectedType: 'hotel_info',
        description: '🏨 住宿查詢測試'
      },
      {
        query: '如何購票',
        expectedType: 'tutorial',
        description: '🎧 客服查詢應該找到教學'
      }
    ];
    
    for (const testCase of keyCases) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🧪 ${testCase.description}`);
      console.log(`📝 測試查詢: "${testCase.query}"`);
      console.log(`🎯 預期類型: ${testCase.expectedType}`);
      console.log(`${'='.repeat(60)}`);
      
      const response = await smartReplyService.getSmartReply(testCase.query);
      
      console.log(`✅ 實際類型: ${response.type}`);
      console.log(`🎯 測試結果: ${response.type === testCase.expectedType ? '✅ 通過' : '❌ 失敗'}`);
      
      if (response.metadata.intentAnalysis) {
        console.log(`🧠 意圖分析: ${response.metadata.intentAnalysis.primaryIntent} (${response.metadata.intentAnalysis.confidence})`);
      }
      
      console.log(`💬 回覆摘要: ${response.message.slice(0, 100)}...`);
    }
    
    await AppDataSource.destroy();
    console.log('\n🎉 關鍵案例測試完成！');
    
  } catch (error) {
    console.error('❌ 測試失敗:', error);
    await AppDataSource.destroy();
  }
}

testKeyCases(); 