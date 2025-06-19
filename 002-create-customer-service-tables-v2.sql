-- 客服暨 FAQ 系統 Schema (遵循 supabase.sql 命名規範)
BEGIN;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ENUM Types
CREATE TYPE "SupportSessionType"     AS ENUM ('bot', 'human', 'mixed');
CREATE TYPE "SupportSessionStatus"   AS ENUM ('active', 'waiting', 'closed', 'transferred');
CREATE TYPE "SupportSessionPriority" AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE "SupportMessageSender"   AS ENUM ('user', 'bot', 'agent');
CREATE TYPE "SupportMessageType"     AS ENUM ('text', 'image', 'file', 'quick_reply', 'faq_suggestion');

-- FAQ Category table
CREATE TABLE "faqCategory" (
    "faqCategoryId" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name"          varchar(100)  NOT NULL,
    "description"   text,
    "parentId"      uuid REFERENCES "faqCategory"("faqCategoryId") ON DELETE SET NULL,
    "sortOrder"     integer       DEFAULT 0,
    "isActive"      boolean       DEFAULT true,
    "createdAt"     timestamp     DEFAULT NOW(),
    "updatedAt"     timestamp     DEFAULT NOW()
);

-- FAQ table
CREATE TABLE "faq" (
    "faqId"       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "categoryId"  uuid      REFERENCES "faqCategory"("faqCategoryId") ON DELETE CASCADE,
    "question"    text      NOT NULL,
    "answer"      text      NOT NULL,
    "keywords"    text[]    DEFAULT '{}',
    "viewCount"        integer DEFAULT 0,
    "helpfulCount"     integer DEFAULT 0,
    "notHelpfulCount"  integer DEFAULT 0,
    "isActive"         boolean DEFAULT true,
    "createdAt" timestamp DEFAULT NOW(),
    "updatedAt" timestamp DEFAULT NOW()
);

-- Support Session table
CREATE TABLE "supportSession" (
    "supportSessionId" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId"   uuid REFERENCES "users"("userId") ON DELETE SET NULL,
    "sessionType" "SupportSessionType" DEFAULT 'bot',
    "status"       "SupportSessionStatus" DEFAULT 'active',
    "agentId"  uuid REFERENCES "users"("userId") ON DELETE SET NULL,
    "priority" "SupportSessionPriority" DEFAULT 'normal',
    "category" varchar(50),
    "firstResponseAt" timestamp,
    "createdAt" timestamp DEFAULT NOW(),
    "closedAt"  timestamp,
    "satisfactionRating"  integer CHECK ("satisfactionRating" BETWEEN 1 AND 5),
    "satisfactionComment" text
);

-- Support Message table
CREATE TABLE "supportMessage" (
    "supportMessageId" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "sessionId"  uuid REFERENCES "supportSession"("supportSessionId") ON DELETE CASCADE,
    "senderType" "SupportMessageSender" NOT NULL,
    "senderId"   uuid REFERENCES "users"("userId") ON DELETE SET NULL,
    "messageText" text,
    "messageType" "SupportMessageType" DEFAULT 'text',
    "metadata"    jsonb DEFAULT '{}'::jsonb,
    "isRead"      boolean DEFAULT false,
    "createdAt"   timestamp DEFAULT NOW()
);

-- FAQ Usage Stat table
CREATE TABLE "faqUsageStat" (
    "faqUsageStatId" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "faqId"     uuid REFERENCES "faq"("faqId") ON DELETE CASCADE,
    "sessionId" uuid REFERENCES "supportSession"("supportSessionId") ON DELETE CASCADE,
    "userId"    uuid REFERENCES "users"("userId") ON DELETE SET NULL,
    "isHelpful" boolean,
    "feedbackText" text,
    "createdAt" timestamp DEFAULT NOW()
);

-- Support Knowledge Base table
CREATE TABLE "supportKnowledgeBase" (
    "supportKBId" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "title"   varchar(200) NOT NULL,
    "content" text         NOT NULL,
    "tags"    text[]       DEFAULT '{}',
    "category" varchar(50),
    "embeddingVector" vector(1536),
    "isActive" boolean DEFAULT true,
    "createdAt" timestamp DEFAULT NOW(),
    "updatedAt" timestamp DEFAULT NOW()
);

-- Support Schedule table
CREATE TABLE "supportSchedule" (
    "supportScheduleId" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "agentId"   uuid REFERENCES "users"("userId") ON DELETE CASCADE,
    "dayOfWeek" integer CHECK ("dayOfWeek" BETWEEN 0 AND 6),
    "startTime" time NOT NULL,
    "endTime"   time NOT NULL,
    "isActive"  boolean DEFAULT true,
    "createdAt" timestamp DEFAULT NOW()
);

-- Indexes
CREATE INDEX "IDX_faqCategory_parentId"        ON "faqCategory"("parentId");
CREATE INDEX "IDX_faqCategory_isActive"        ON "faqCategory"("isActive");
CREATE INDEX "IDX_faq_categoryId"              ON "faq"("categoryId");
CREATE INDEX "IDX_faq_keywords"                ON "faq" USING GIN("keywords");
CREATE INDEX "IDX_faq_isActive"                ON "faq"("isActive");
CREATE INDEX "IDX_supportSession_userId"       ON "supportSession"("userId");
CREATE INDEX "IDX_supportSession_agentId"      ON "supportSession"("agentId");
CREATE INDEX "IDX_supportSession_status"       ON "supportSession"("status");
CREATE INDEX "IDX_supportSession_createdAt"    ON "supportSession"("createdAt");
CREATE INDEX "IDX_supportMessage_sessionId"    ON "supportMessage"("sessionId");
CREATE INDEX "IDX_supportMessage_createdAt"    ON "supportMessage"("createdAt");
CREATE INDEX "IDX_faqUsageStat_faqId"          ON "faqUsageStat"("faqId");
CREATE INDEX "IDX_supportKnowledgeBase_category" ON "supportKnowledgeBase"("category");
CREATE INDEX "IDX_supportKnowledgeBase_tags"     ON "supportKnowledgeBase" USING GIN("tags");
CREATE INDEX "IDX_supportSchedule_agentId"     ON "supportSchedule"("agentId");

-- Trigger function to update updatedAt
CREATE OR REPLACE FUNCTION "fn_updateUpdatedAt"()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Triggers
CREATE TRIGGER "TRG_faqCategory_updated" BEFORE UPDATE ON "faqCategory"
FOR EACH ROW EXECUTE FUNCTION "fn_updateUpdatedAt"();

CREATE TRIGGER "TRG_faq_updated" BEFORE UPDATE ON "faq"
FOR EACH ROW EXECUTE FUNCTION "fn_updateUpdatedAt"();

CREATE TRIGGER "TRG_supportKnowledgeBase_updated" BEFORE UPDATE ON "supportKnowledgeBase"
FOR EACH ROW EXECUTE FUNCTION "fn_updateUpdatedAt"();

-- Seed data: FAQ Categories
INSERT INTO "faqCategory" ("name", "description", "sortOrder") VALUES
('票務相關', '關於票券購買、退換票等問題', 1),
('演出資訊', '演出時間、地點、內容等查詢', 2),
('會員相關', '會員註冊、登入、個人資料等問題', 3),
('付款相關', '付款方式、訂單、發票等問題', 4),
('技術支援', '網站使用、APP 操作等技術問題', 5),
('其他',     '其他未分類問題', 6);

-- Seed data: FAQ Sub-categories under "票務相關"
INSERT INTO "faqCategory" ("name", "description", "parentId", "sortOrder")
SELECT '購票問題', '購票流程、選位等相關問題', "faqCategoryId", 1 FROM "faqCategory" WHERE "name" = '票務相關' LIMIT 1;

INSERT INTO "faqCategory" ("name", "description", "parentId", "sortOrder")
SELECT '退換票', '退票、換票政策和流程', "faqCategoryId", 2 FROM "faqCategory" WHERE "name" = '票務相關' LIMIT 1;

INSERT INTO "faqCategory" ("name", "description", "parentId", "sortOrder")
SELECT '票券使用', '入場方式、票券驗證等', "faqCategoryId", 3 FROM "faqCategory" WHERE "name" = '票務相關' LIMIT 1;

-- Seed data: Frequently asked questions
WITH cat AS (
    SELECT "faqCategoryId" FROM "faqCategory" WHERE "name" = '購票問題' LIMIT 1
)
INSERT INTO "faq" ("categoryId", "question", "answer", "keywords")
SELECT cat."faqCategoryId", '如何購買演出票券？',
'您可以在我們的網站上選擇想要的演出，選擇座位和票種，然後完成付款即可。詳細步驟：1. 搜尋或瀏覽演出 2. 選擇場次和座位 3. 確認訂單資訊 4. 完成付款',
ARRAY['購票', '買票', '訂票', '購買'] FROM cat;

-- 其它 FAQ (
WITH cat AS (
    SELECT "faqCategoryId" FROM "faqCategory" WHERE "name" = '退換票' LIMIT 1
)
INSERT INTO "faq" ("categoryId", "question", "answer", "keywords")
SELECT cat."faqCategoryId", '可以退票嗎？退票政策是什麼？',
'退票政策依演出而異。一般情況下，演出前7天可申請退票，將收取票面金額10%手續費。演出前3天內恕不接受退票。詳細政策請查看各演出頁面或聯繫客服。',
ARRAY['退票', '取消', '退款', '政策'] FROM cat;

-- commit
COMMIT; 