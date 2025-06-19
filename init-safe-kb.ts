/**
 * 安全的知識庫數據初始化腳本
 * 只有在數據庫為空時才插入測試數據
 */

import { supabaseService } from './services/supabase-service.js';

const testData = [
  {
    title: '如何購買演唱會門票',
    content: '購買演唱會門票的步驟：1. 註冊或登入 Tickeasy 帳號 2. 瀏覽演唱會活動頁面 3. 選擇場次和座位 4. 填寫購票資訊 5. 選擇付款方式 6. 完成付款並取得電子票券。購票時請注意票種限制和購票數量限制。',
    category: '購票流程',
    tags: ['購票', '演唱會', '門票', '流程']
  },
  {
    title: '票券退換票政策',
    content: '退換票政策說明：1. 一般情況下，門票售出後不得退換 2. 如因主辦方取消活動，可申請全額退款 3. 如因不可抗力因素（天災、疫情等）導致活動取消，可申請退款 4. 退票申請需在活動開始前7天提出 5. 退款處理時間為7-14個工作天。詳細退票條款請參考各活動頁面說明。',
    category: '退換票',
    tags: ['退票', '換票', '政策', '退款']
  },
  {
    title: '支援的付款方式',
    content: 'Tickeasy 支援多種付款方式：1. 信用卡付款（Visa、MasterCard、JCB） 2. 金融卡付款 3. ATM 轉帳 4. 超商代碼繳費（7-11、全家、萊爾富） 5. 行動支付（Line Pay、街口支付、Apple Pay） 6. 銀行轉帳。推薦使用信用卡付款，可享有購物保障。付款完成後會立即收到電子票券。',
    category: '付款',
    tags: ['付款', '信用卡', '轉帳', '超商', '行動支付']
  },
  {
    title: '電子票券使用說明',
    content: '電子票券使用方式：1. 購票成功後會收到電子票券 QR Code 2. 可透過手機 APP 或電子郵件查看票券 3. 入場時出示 QR Code 供工作人員掃描 4. 請確保手機電量充足和螢幕亮度足夠 5. 建議提前截圖保存票券資訊 6. 每張票券只能使用一次，請勿重複入場。遺失票券可聯繫客服協助處理。',
    category: '票券使用',
    tags: ['電子票券', 'QR Code', '入場', '手機']
  },
  {
    title: '座位選擇和票種說明',
    content: '座位選擇指南：1. VIP 區域：最佳視野，包含特殊禮品和服務 2. 搖滾區：最接近舞台，站票形式，氣氛最熱烈 3. 內野區：坐票區域，視野良好 4. 外野區：經濟實惠選擇，距離較遠但仍可清楚觀賞 5. 無障礙座位：提供輪椅使用者專用座位。購票時可透過座位圖選擇喜好位置，先搶先贏。',
    category: '座位票種',
    tags: ['座位', '票種', 'VIP', '搖滾區', '選擇']
  }
];

async function initKnowledgeBase(): Promise<void> {
  console.log('🚀 開始安全初始化知識庫數據...');
  
  try {
    // 1. 檢查 Supabase 連接
    console.log('🔗 檢查 Supabase 連接...');
    const isConnected = await supabaseService.testConnection();
    
    if (!isConnected) {
      console.error('❌ Supabase 連接失敗，請檢查環境變數設定');
      process.exit(1);
    }
    
    console.log('✅ Supabase 連接正常');

    // 2. 檢查現有數據
    console.log('📊 檢查現有知識庫數據...');
    const stats = await supabaseService.getKnowledgeBaseStats();
    
    console.log(`📈 當前知識庫統計: 總數 ${stats.total}, 活躍 ${stats.active}`);

    if (stats.active > 0) {
      console.log('⚠️  知識庫已有數據，跳過初始化');
      console.log('💡 如需重新初始化，請先清空知識庫或手動刪除現有數據');
      return;
    }

    // 3. 插入測試數據
    console.log('📝 開始插入測試數據...');
    const client = supabaseService.getClient();
    
    let successCount = 0;
    
    for (const data of testData) {
      try {
        console.log(`📄 插入: "${data.title}"`);
        
        const { data: insertResult, error } = await client
          .from('supportKnowledgeBase')
          .insert({
            title: data.title,
            content: data.content,
            category: data.category,
            tags: data.tags,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
          .select();

        if (error) {
          console.error(`❌ 插入失敗: "${data.title}"`, error.message);
        } else {
          console.log(`✅ 插入成功: "${data.title}"`);
          successCount++;
        }
        
        // 避免過快的請求
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error: any) {
        console.error(`❌ 插入異常: "${data.title}"`, error.message);
      }
    }

    // 4. 驗證插入結果
    console.log('\n🔍 驗證插入結果...');
    const finalStats = await supabaseService.getKnowledgeBaseStats();
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 初始化結果總結');
    console.log('='.repeat(50));
    console.log(`📝 嘗試插入: ${testData.length} 個項目`);
    console.log(`✅ 成功插入: ${successCount} 個項目`);
    console.log(`📈 最終統計: 總數 ${finalStats.total}, 活躍 ${finalStats.active}`);
    console.log(`📂 分類數量: ${finalStats.categories.length}`);
    
    if (finalStats.categories.length > 0) {
      console.log('\n📋 分類詳情:');
      finalStats.categories.forEach(cat => {
        console.log(`   - ${cat.name}: ${cat.count} 個項目`);
      });
    }

    if (successCount === testData.length) {
      console.log('\n🎉 知識庫初始化完成！');
      console.log('✨ 現在可以測試搜尋和智能客服功能了');
      console.log('🚀 執行測試: npm run test:smart-customer-service');
    } else {
      console.log('\n⚠️  部分數據插入失敗，請檢查錯誤訊息');
    }
    
    console.log('='.repeat(50));

  } catch (error: any) {
    console.error('💥 初始化過程發生錯誤:', error);
    console.error('🔧 請檢查:');
    console.error('   1. Supabase 連接設定');
    console.error('   2. 資料庫 schema 是否正確');
    console.error('   3. 環境變數是否完整');
    process.exit(1);
  }
}

// 執行初始化
async function run(): Promise<void> {
  console.log('📋 知識庫安全初始化');
  console.log('- 只在資料庫為空時插入數據');
  console.log('- 使用 Supabase 客戶端直接操作');
  console.log('- 適合生產環境使用\n');
  
  await initKnowledgeBase();
}

run().catch(console.error);
