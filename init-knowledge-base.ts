/**
 * 知識庫初始化腳本
 * 添加基本的客服知識庫數據
 */

import 'reflect-metadata';
import { AppDataSource } from './config/database.js';
import { SupportKnowledgeBase } from './models/support-knowledge-base.js';
import { embeddingService } from './services/embedding-service.js';

const initialKnowledgeBase = [
  {
    title: '如何購買演唱會門票',
    content: '購買演唱會門票的步驟：1. 註冊或登入 Tickeasy 帳號 2. 瀏覽演唱會活動頁面 3. 選擇場次和座位 4. 填寫購票資訊 5. 選擇付款方式 6. 完成付款並取得電子票券。購票時請注意票種限制和購票數量限制。建議提前註冊會員以加快購票流程。',
    category: '購票流程',
    tags: ['購票', '演唱會', '門票', '流程', '註冊']
  },
  {
    title: '票券退換票政策',
    content: '退換票政策說明：1. 一般情況下，門票售出後不得退換 2. 如因主辦方取消活動，可申請全額退款 3. 如因不可抗力因素（天災、疫情等）導致活動取消，可申請退款 4. 退票申請需在活動開始前7天提出 5. 退款處理時間為7-14個工作天 6. 退票需收取10%手續費。詳細退票條款請參考各活動頁面說明。',
    category: '退換票',
    tags: ['退票', '換票', '政策', '退款', '手續費']
  },
  {
    title: '支援的付款方式',
    content: 'Tickeasy 支援多種付款方式：1. 信用卡付款（Visa、MasterCard、JCB、美國運通） 2. 金融卡付款 3. ATM 轉帳 4. 超商代碼繳費（7-11、全家、萊爾富、OK mart） 5. 行動支付（Line Pay、街口支付、Apple Pay、Google Pay） 6. 銀行轉帳。推薦使用信用卡付款，可享有購物保障和分期付款服務。付款完成後會立即收到電子票券。',
    category: '付款',
    tags: ['付款', '信用卡', '轉帳', '超商', '行動支付', '分期']
  },
  {
    title: '電子票券使用說明',
    content: '電子票券使用方式：1. 購票成功後會收到電子票券 QR Code 2. 可透過手機 APP 或電子郵件查看票券 3. 入場時出示 QR Code 供工作人員掃描 4. 請確保手機電量充足和螢幕亮度足夠 5. 建議提前截圖保存票券資訊作為備份 6. 每張票券只能使用一次，請勿重複入場 7. 可將票券轉發給同行友人。遺失票券可聯繫客服協助重新發送。',
    category: '票券使用',
    tags: ['電子票券', 'QR Code', '入場', '手機', 'APP', '備份']
  },
  {
    title: '座位選擇和票種說明',
    content: '座位選擇指南：1. VIP 區域：最佳視野，包含特殊禮品和專屬服務，價格最高 2. 搖滾區：最接近舞台，站票形式，氣氛最熱烈，適合年輕觀眾 3. 內野區：坐票區域，視野良好，舒適度佳 4. 外野區：經濟實惠選擇，距離較遠但仍可清楚觀賞 5. 無障礙座位：提供輪椅使用者和行動不便者專用座位，需事先申請。購票時可透過互動式座位圖選擇喜好位置，採先搶先贏制度。',
    category: '座位票種',
    tags: ['座位', '票種', 'VIP', '搖滾區', '選擇', '無障礙']
  },
  {
    title: '會員註冊和帳號管理',
    content: '會員服務說明：1. 免費註冊 Tickeasy 會員享有多項優惠 2. 會員可獲得活動搶先購票資格 3. 累積購票金額可升級為 VIP 會員 4. 會員可設定感興趣的藝人，接收演出通知 5. 可管理個人購票記錄和電子票券 6. 忘記密碼可透過電子郵件重設 7. 可綁定社群帳號快速登入。建議完整填寫個人資料以加快購票流程。',
    category: '會員服務',
    tags: ['會員', '註冊', '帳號', 'VIP', '優惠', '通知']
  },
  {
    title: '活動取消和延期處理',
    content: '活動異動處理方式：1. 如主辦方宣布活動取消，將主動通知並提供全額退款 2. 活動延期時，原票券仍然有效，可使用於新日期 3. 無法參加延期活動者可申請退票 4. 因天災或不可抗力因素取消，提供全額退款且免手續費 5. 退款將依原付款方式退回 6. 相關異動消息會透過簡訊、電子郵件和官網公告。建議關注官方消息以獲得最新資訊。',
    category: '活動異動',
    tags: ['取消', '延期', '退款', '天災', '通知', '官方']
  },
  {
    title: '票券轉讓和贈送',
    content: '票券轉讓規則：1. 電子票券可透過系統進行合法轉讓 2. 轉讓需雙方同意並透過官方平台進行 3. 轉讓票券需符合主辦方規定 4. 禁止以超過原價販售票券（黃牛行為） 5. 可將票券贈送給親友，但需註明受贈人資訊 6. 部分限定活動不允許轉讓 7. 轉讓記錄會保留於系統中。違規轉售將被列入黑名單並取消購票資格。',
    category: '票券轉讓',
    tags: ['轉讓', '贈送', '黃牛', '規則', '黑名單', '限定']
  },
  {
    title: '客服聯繫方式',
    content: '客服服務管道：1. 線上客服聊天機器人（24小時服務） 2. 客服專線：02-1234-5678（週一至週五 9:00-18:00） 3. 客服信箱：support@tickeasy.com 4. 官方 LINE 客服 5. Facebook 粉絲專頁私訊 6. 現場服務櫃台（限活動當天） 7. 緊急聯繫電話：0800-123-456。建議優先使用線上客服或電子郵件，回覆速度較快。',
    category: '客服聯繫',
    tags: ['客服', '聯繫', '電話', '信箱', 'LINE', '緊急']
  },
  {
    title: '常見技術問題解決',
    content: '技術問題排除：1. 網頁無法開啟：清除瀏覽器快取和 Cookie 2. 付款失敗：檢查網路連線和信用卡資訊 3. APP 無法登入：更新到最新版本或重新安裝 4. QR Code 無法掃描：調整螢幕亮度和確保圖片清晰 5. 收不到電子票券：檢查垃圾信件匣和簡訊 6. 購票頁面卡住：重新整理頁面或使用其他瀏覽器 7. 系統維護時間：每週三凌晨 2:00-4:00。如問題持續，請聯繫技術客服。',
    category: '技術支援',
    tags: ['技術問題', '故障', '瀏覽器', '付款', 'APP', '維護']
  }
];

async function initializeKnowledgeBase() {
  try {
    console.log('🚀 開始初始化知識庫...');
    
    // 確保資料庫連接
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ 資料庫連接成功');
    }

    const knowledgeBaseRepo = AppDataSource.getRepository(SupportKnowledgeBase);
    
    // 檢查是否已有數據
    const existingCount = await knowledgeBaseRepo.count();
    if (existingCount > 0) {
      console.log(`⚠️  知識庫已有 ${existingCount} 筆資料`);
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise<string>((resolve) => {
        rl.question('是否要清空現有資料並重新初始化？(y/n): ', resolve);
      });
      
      rl.close();
      
      if (answer.toLowerCase() !== 'y') {
        console.log('❌ 使用者取消初始化');
        return;
      }
      
      // 清空現有資料
      await knowledgeBaseRepo.delete({});
      console.log('✅ 已清空現有知識庫資料');
    }

    let successCount = 0;
    let errorCount = 0;

    // 檢查嵌入服務是否可用
    const embeddingAvailable = await embeddingService.isServiceAvailable();
    if (!embeddingAvailable) {
      console.log('⚠️  嵌入服務不可用，將跳過向量生成');
    }

    for (const [index, data] of initialKnowledgeBase.entries()) {
      try {
        console.log(`\\n📝 創建第 ${index + 1}/${initialKnowledgeBase.length} 個知識庫項目...`);
        console.log(`   標題: ${data.title}`);
        
        // 創建知識庫項目
        const knowledgeBase = new SupportKnowledgeBase();
        knowledgeBase.title = data.title;
        knowledgeBase.content = data.content;
        knowledgeBase.category = data.category;
        knowledgeBase.tags = data.tags;
        knowledgeBase.isActive = true;

        // 儲存到資料庫
        const savedKB = await knowledgeBaseRepo.save(knowledgeBase);
        console.log(`   ✅ 基本資料儲存成功`);

        // 生成嵌入向量
        if (embeddingAvailable) {
          try {
            console.log(`   🧠 生成嵌入向量...`);
            const embedding = await embeddingService.generateKnowledgeBaseEmbedding(savedKB);
            savedKB.setEmbedding(embedding);
            await knowledgeBaseRepo.save(savedKB);
            console.log(`   ✅ 嵌入向量生成成功 (${embedding.length} 維度)`);
          } catch (embeddingError: any) {
            console.log(`   ⚠️  嵌入向量生成失敗: ${embeddingError.message}`);
          }
        }

        successCount++;

        // 避免 API 速率限制
        if (embeddingAvailable && index < initialKnowledgeBase.length - 1) {
          console.log(`   ⏳ 等待 1 秒避免 API 速率限制...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error: any) {
        console.error(`❌ 創建知識庫項目失敗: ${data.title}`, error.message);
        errorCount++;
      }
    }

    console.log('\\n' + '='.repeat(50));
    console.log('📊 知識庫初始化完成');
    console.log('='.repeat(50));
    console.log(`✅ 成功創建: ${successCount} 個項目`);
    console.log(`❌ 失敗: ${errorCount} 個項目`);
    
    if (embeddingAvailable) {
      console.log(`🧠 嵌入向量: 已為所有項目生成向量嵌入`);
    } else {
      console.log(`⚠️  嵌入向量: 未生成（需要 OpenAI API Key）`);
    }

    // 獲取最終統計
    const finalStats = await knowledgeBaseRepo.count();
    console.log(`📈 知識庫總數: ${finalStats} 個項目`);
    
    if (successCount > 0) {
      console.log('\\n🎉 知識庫初始化成功！');
      console.log('💡 現在可以測試語義搜尋功能：npm run test:semantic-search');
    }

  } catch (error) {
    console.error('💥 知識庫初始化失敗:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('✅ 資料庫連接已關閉');
    }
  }
}

// 檢查是否直接執行此腳本
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeKnowledgeBase().catch(console.error);
}

export { initializeKnowledgeBase, initialKnowledgeBase };