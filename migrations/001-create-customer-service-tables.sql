-- 客服系統資料庫遷移檔案
-- 建立時間: 2025年06月

-- FAQ 分類表
CREATE TABLE IF NOT EXISTS faq_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES faq_categories(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FAQ 問題表
CREATE TABLE IF NOT EXISTS faqs (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES faq_categories(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    keywords TEXT[] DEFAULT '{}', -- 關鍵字陣列
    view_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0, -- 有用計數
    not_helpful_count INTEGER DEFAULT 0, -- 無用計數
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 客服會話表
CREATE TABLE IF NOT EXISTS support_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    session_type VARCHAR(20) DEFAULT 'bot' CHECK (session_type IN ('bot', 'human', 'mixed')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'waiting', 'closed', 'transferred')),
    agent_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- 客服人員 ID
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    category VARCHAR(50), -- 問題分類
    first_response_at TIMESTAMP, -- 首次回應時間
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,
    satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
    satisfaction_comment TEXT
);

-- 對話訊息表
CREATE TABLE IF NOT EXISTS support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES support_sessions(id) ON DELETE CASCADE,
    sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('user', 'bot', 'agent')),
    sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    message_text TEXT,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'quick_reply', 'faq_suggestion')),
    metadata JSONB DEFAULT '{}', -- 存儲額外數據如 AI 回應信心度、FAQ ID 等
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FAQ 使用統計表
CREATE TABLE IF NOT EXISTS faq_usage_stats (
    id SERIAL PRIMARY KEY,
    faq_id INTEGER REFERENCES faqs(id) ON DELETE CASCADE,
    session_id UUID REFERENCES support_sessions(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_helpful BOOLEAN,
    feedback_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 客服知識庫表（用於 AI 訓練和參考）
CREATE TABLE IF NOT EXISTS support_knowledge_base (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    category VARCHAR(50),
    embedding_vector VECTOR(1536), -- OpenAI text-embedding-3-small 的向量維度
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 客服工作時間表
CREATE TABLE IF NOT EXISTS support_schedules (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=星期日, 6=星期六
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 建立索引以提升查詢效率
CREATE INDEX IF NOT EXISTS idx_faq_categories_parent ON faq_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_faq_categories_active ON faq_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_faqs_category ON faqs(category_id);
CREATE INDEX IF NOT EXISTS idx_faqs_keywords ON faqs USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_faqs_active ON faqs(is_active);
CREATE INDEX IF NOT EXISTS idx_support_sessions_user ON support_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_support_sessions_agent ON support_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_support_sessions_status ON support_sessions(status);
CREATE INDEX IF NOT EXISTS idx_support_sessions_created ON support_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_support_messages_session ON support_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created ON support_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_faq_usage_faq ON faq_usage_stats(faq_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON support_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_tags ON support_knowledge_base USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_support_schedules_agent ON support_schedules(agent_id);

-- 建立更新時間觸發器函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 為需要的表格建立更新時間觸發器
CREATE TRIGGER update_faq_categories_updated_at BEFORE UPDATE ON faq_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_faqs_updated_at BEFORE UPDATE ON faqs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_knowledge_base_updated_at BEFORE UPDATE ON support_knowledge_base FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入預設 FAQ 分類
INSERT INTO faq_categories (name, description, sort_order) VALUES
('票務相關', '關於票券購買、退換票等問題', 1),
('演出資訊', '演出時間、地點、內容等查詢', 2),
('會員相關', '會員註冊、登入、個人資料等問題', 3),
('付款相關', '付款方式、訂單、發票等問題', 4),
('技術支援', '網站使用、APP 操作等技術問題', 5),
('其他', '其他未分類問題', 6);

-- 插入票務相關的子分類
INSERT INTO faq_categories (name, description, parent_id, sort_order) VALUES
('購票問題', '購票流程、選位等相關問題', 1, 1),
('退換票', '退票、換票政策和流程', 1, 2),
('票券使用', '入場方式、票券驗證等', 1, 3);

-- 插入一些常見的 FAQ
INSERT INTO faqs (category_id, question, answer, keywords) VALUES
(7, '如何購買演出票券？', '您可以在我們的網站上選擇想要的演出，選擇座位和票種，然後完成付款即可。詳細步驟：1. 搜尋或瀏覽演出 2. 選擇場次和座位 3. 確認訂單資訊 4. 完成付款', ARRAY['購票', '買票', '訂票', '購買']),
(8, '可以退票嗎？退票政策是什麼？', '退票政策依演出而異。一般情況下，演出前7天可申請退票，將收取票面金額10%手續費。演出前3天內恕不接受退票。詳細政策請查看各演出頁面或聯繫客服。', ARRAY['退票', '取消', '退款', '政策']),
(8, '如何換票？', '如需換票，請在演出前48小時聯繫客服。換票需視座位availability而定，可能需補價差。每張票券限換票一次。', ARRAY['換票', '更換', '改票']),
(9, '電子票券如何使用？', '購票成功後，您會收到電子票券QR Code。入場時請出示QR Code供工作人員掃描即可。建議提前截圖保存以防網路問題。', ARRAY['電子票', 'QR Code', '入場', '驗票']),
(4, '忘記密碼怎麼辦？', '請點擊登入頁面的「忘記密碼」連結，輸入您的註冊email，系統會發送重設密碼連結到您的信箱。', ARRAY['忘記密碼', '重設密碼', '無法登入']),
(5, '支援哪些付款方式？', '我們支援信用卡、ATM轉帳、超商付款等多種付款方式。信用卡支援Visa、MasterCard、JCB等國際卡，以及各大銀行信用卡。', ARRAY['付款', '信用卡', 'ATM', '超商']);

COMMENT ON TABLE faq_categories IS 'FAQ分類表';
COMMENT ON TABLE faqs IS 'FAQ問題答案表';
COMMENT ON TABLE support_sessions IS '客服會話表';
COMMENT ON TABLE support_messages IS '客服訊息表';
COMMENT ON TABLE faq_usage_stats IS 'FAQ使用統計表';
COMMENT ON TABLE support_knowledge_base IS '客服知識庫表';
COMMENT ON TABLE support_schedules IS '客服工作時間表';
