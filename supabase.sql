-- 啟用 UUID 支持 (如果尚未啟用)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 創建 ENUM 類型 (必須在創建使用它們的表之前)
CREATE TYPE "UserRole" AS ENUM ('user', 'admin', 'superuser');
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other');
CREATE TYPE "ReviewStatus" AS ENUM ('pending', 'approved', 'rejected', 'skipped');
CREATE TYPE "OrderStatus" AS ENUM ('held', 'expired', 'paid', 'cancelled', 'refunded');
CREATE TYPE "TicketStatus" AS ENUM ('purchased', 'refunded', 'used');
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE "ConInfoStatus" AS ENUM ('draft', 'reviewing', 'published', 'rejected', 'finished');
CREATE TYPE "SessionStatus" AS ENUM ('draft', 'published', 'finished');
CREATE TYPE "Region" AS ENUM ('北部', '南部', '東部', '中部', '離島', '海外');
CREATE TYPE "EventType" AS ENUM ('流行音樂', '搖滾', '電子音樂', '嘻哈', '爵士藍調', '古典音樂', '其他');

-- 客服系統 ENUM 類型
CREATE TYPE "SupportSessionType" AS ENUM ('bot', 'human', 'mixed');
CREATE TYPE "SupportSessionStatus" AS ENUM ('active', 'waiting', 'closed', 'transferred');
CREATE TYPE "SupportSessionPriority" AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE "SupportMessageSender" AS ENUM ('user', 'bot', 'agent');
CREATE TYPE "SupportMessageType" AS ENUM ('text', 'image', 'file', 'quick_reply', 'faq_suggestion');

-- 創建 表格

-- users 表
CREATE TABLE "users" (
    "userId" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "email" character varying(100) UNIQUE NOT NULL,
    "password" character varying(60) NULL,
    "name" character varying(50) NOT NULL,
    "nickname" character varying(20),
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "phone" character varying(20),
    "birthday" date,
    "gender" "Gender",
    "preferredRegions" "Region"[] DEFAULT '{}',
    "preferredEventTypes" "EventType"[] DEFAULT '{}',
    "country" character varying(20),
    "address" character varying(100),
    "avatar" character varying(255),
    "verificationToken" character varying(50),
    "verificationTokenExpires" timestamp without time zone,
    "isEmailVerified" boolean NOT NULL DEFAULT false,
    "passwordResetToken" character varying(50),
    "passwordResetExpires" timestamp without time zone,
    "lastVerificationAttempt" timestamp without time zone,
    "lastPasswordResetAttempt" timestamp without time zone,
    "oauthProviders" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "searchHistory" jsonb NULL,
    "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
    "updatedAt" timestamp without time zone NOT NULL DEFAULT now(),
    "deletedAt" timestamp without time zone
);

-- organization 表
CREATE TABLE "organization" (
    "organizationId" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" uuid NOT NULL,
    "orgName" character varying(100) UNIQUE NOT NULL,
    "orgAddress" character varying(100) NOT NULL,
    "orgMail" character varying(100),
    "orgContact" character varying(1000),
    "orgMobile" character varying(200),
    "orgPhone" character varying(200),
    "orgWebsite" character varying(200),
    "createdAt" timestamp without time zone NOT NULL DEFAULT now()
);

-- locationTag 表
CREATE TABLE "locationTag" (
    "locationTagId" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "locationTagName" character varying(50) NOT NULL,
    "subLabel" character varying(50)
);

-- musicTag 表
CREATE TABLE "musicTag" (
    "musicTagId" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "musicTagName" character varying(50) NOT NULL,
    "subLabel" character varying(100)
);

-- venues 表
CREATE TABLE "venues" (
    "venueId" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "venueName" character varying(100) NOT NULL,
    "venueDescription" text,
    "venueAddress" character varying(200) NOT NULL,
    "venueCapacity" integer,
    "venueImageUrl" character varying(255),
    "googleMapUrl" character varying(255),
    "isAccessible" boolean DEFAULT false,
    "hasParking" boolean DEFAULT false,
    "hasTransit" boolean DEFAULT false,
    "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
    "updatedAt" timestamp without time zone NOT NULL DEFAULT now()
);

-- concert 表
CREATE TABLE "concert" (
    "concertId" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "organizationId" uuid NOT NULL,
    "venueId" uuid,
    "locationTagId" uuid,
    "musicTagId" uuid, 
    "conTitle" character varying(50) NOT NULL,
    "conIntroduction" character varying(3000),
    "conLocation" character varying(50) ,
    "conAddress" character varying(200) ,
    "eventStartDate" date NULL,
    "eventEndDate" date NULL,
    "imgBanner" character varying(255) ,
    "ticketPurchaseMethod" character varying(1000) ,
    "precautions" character varying(2000),
    "refundPolicy" character varying(1000),
    "conInfoStatus" "ConInfoStatus" NOT NULL DEFAULT 'draft',
    "reviewStatus" "ReviewStatus" DEFAULT 'skipped',
    "reviewNote" text, -- 審核備註：記錄審核通過或退回的理由
    "visitCount" integer DEFAULT 0, -- 假設默認為 0
    "promotion" integer,
    "cancelledAt" timestamp without time zone,
    "updatedAt" timestamp without time zone NOT NULL DEFAULT now(),
    "createdAt" timestamp without time zone NOT NULL DEFAULT now()
);

-- concertSession 表
CREATE TABLE "concertSession" (
    "sessionId" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "concertId" uuid NOT NULL,
    "sessionDate" date,
    "sessionStart" time without time zone,
    "sessionEnd" time without time zone,
    "sessionTitle" character varying(100),
    "imgSeattable" text,
    "createdAt" timestamp without time zone NOT NULL DEFAULT now()
);

-- ticketType 表
CREATE TABLE "ticketType" (
    "ticketTypeId" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ticketTypeName" character varying(50),
    "entranceType" character varying(50),
    "ticketBenefits" text,
    "ticketRefundPolicy" text,
    "ticketTypePrice" numeric(10, 2),
    "totalQuantity" integer,
    "remainingQuantity" integer,
    "sellBeginDate" timestamp without time zone, -- datetime 映射為 timestamp
    "sellEndDate" timestamp without time zone,   -- datetime 映射為 timestamp
    "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
    "concertSessionId" uuid NOT NULL
);

-- order 表
CREATE TABLE "order" (
    "orderId" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ticketTypeId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    "orderStatus" "OrderStatus" NOT NULL,
    "isLocked" boolean NOT NULL DEFAULT true,
    "lockToken" character varying(100) NOT NULL, -- 應考慮是否需要 unique
    "lockExpireTime" timestamp without time zone NOT NULL,
    "purchaserName" character varying(50),
    "purchaserEmail" character varying(100),
    "purchaserPhone" character varying(50),
    "invoicePlatform" character varying(50),
    "invoiceType" character varying(50),
    "invoiceCarrier" character varying(100),
    "invoiceStatus" character varying(50),
    "invoiceNumber" character varying(50),
    "invoiceUrl" character varying(255),
    "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
    "updatedAt" timestamp without time zone
);

-- ticket 表
CREATE TABLE "ticket" (
    "ticketId" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "orderId" uuid NOT NULL,
    "ticketTypeId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    "purchaserName" character varying(100),
    "purchaserEmail" character varying(100),
    "concertStartTime" timestamp without time zone NOT NULL, -- datetime 映射為 timestamp
    "seatNumber" character varying(100),
    "qrCode" character varying(255) UNIQUE, -- <--- 添加 UNIQUE 約束
    "status" "TicketStatus" NOT NULL,
    "purchaseTime" timestamp without time zone NOT NULL
);

-- payment 表
CREATE TABLE "payment" (
    "paymentId" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "orderId" uuid NOT NULL,
    "method" character varying(50) NOT NULL,
    "provider" character varying(50),
    "status" "PaymentStatus" NOT NULL,
    "amount" numeric(10, 2) NOT NULL,
    "currency" character varying(10) DEFAULT 'TWD',
    "paidAt" timestamp without time zone,
    "transactionId" uuid UNIQUE, -- <--- 添加 UNIQUE 約束，類型改為 uuid
    "rawPayload" jsonb, -- 使用 jsonb 通常更好
    "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
    "updatedAt" timestamp without time zone
);

-- concertReview 審核記錄表
CREATE TABLE "concertReview" (
    "reviewId" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "concertId" uuid NOT NULL,
    "reviewType" character varying(20) NOT NULL, -- 'ai_auto', 'manual_admin', 'manual_system'
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'pending',
    "reviewNote" text, -- 詳細審核說明
    "aiResponse" jsonb, -- AI 審核的完整回應資料
    "reviewerId" character varying(100), -- 手動審核者 ID（AI 審核時為 null）
    "reviewerNote" text, -- 審核者補充備註
    "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
    "updatedAt" timestamp without time zone NOT NULL DEFAULT now()
);

-- ===========================================
-- 客服系統表格
-- ===========================================

-- FAQ Category table
CREATE TABLE "faqCategory" (
    "faqCategoryId" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" varchar(100) NOT NULL,
    "description" text,
    "parentId" uuid REFERENCES "faqCategory"("faqCategoryId") ON DELETE SET NULL,
    "sortOrder" integer DEFAULT 0,
    "isActive" boolean DEFAULT true,
    "createdAt" timestamp DEFAULT NOW(),
    "updatedAt" timestamp DEFAULT NOW()
);

-- FAQ table
CREATE TABLE "faq" (
    "faqId" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "categoryId" uuid REFERENCES "faqCategory"("faqCategoryId") ON DELETE CASCADE,
    "question" text NOT NULL,
    "answer" text NOT NULL,
    "keywords" text[] DEFAULT '{}',
    "viewCount" integer DEFAULT 0,
    "helpfulCount" integer DEFAULT 0,
    "notHelpfulCount" integer DEFAULT 0,
    "isActive" boolean DEFAULT true,
    "createdAt" timestamp DEFAULT NOW(),
    "updatedAt" timestamp DEFAULT NOW()
);

-- Support Session table
CREATE TABLE "supportSession" (
    "supportSessionId" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" uuid REFERENCES "users"("userId") ON DELETE SET NULL,
    "sessionType" "SupportSessionType" DEFAULT 'bot',
    "status" "SupportSessionStatus" DEFAULT 'active',
    "agentId" uuid REFERENCES "users"("userId") ON DELETE SET NULL,
    "priority" "SupportSessionPriority" DEFAULT 'normal',
    "category" varchar(50),
    "firstResponseAt" timestamp,
    "createdAt" timestamp DEFAULT NOW(),
    "closedAt" timestamp,
    "satisfactionRating" integer CHECK ("satisfactionRating" BETWEEN 1 AND 5),
    "satisfactionComment" text
);

-- Support Message table
CREATE TABLE "supportMessage" (
    "supportMessageId" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "sessionId" uuid REFERENCES "supportSession"("supportSessionId") ON DELETE CASCADE,
    "senderType" "SupportMessageSender" NOT NULL,
    "senderId" uuid REFERENCES "users"("userId") ON DELETE SET NULL,
    "messageText" text,
    "messageType" "SupportMessageType" DEFAULT 'text',
    "metadata" jsonb DEFAULT '{}'::jsonb,
    "isRead" boolean DEFAULT false,
    "createdAt" timestamp DEFAULT NOW()
);

-- FAQ Usage Stat table
CREATE TABLE "faqUsageStat" (
    "faqUsageStatId" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "faqId" uuid REFERENCES "faq"("faqId") ON DELETE CASCADE,
    "sessionId" uuid REFERENCES "supportSession"("supportSessionId") ON DELETE CASCADE,
    "userId" uuid REFERENCES "users"("userId") ON DELETE SET NULL,
    "isHelpful" boolean,
    "feedbackText" text,
    "createdAt" timestamp DEFAULT NOW()
);

-- Support Knowledge Base table
CREATE TABLE "supportKnowledgeBase" (
    "supportKBId" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "title" varchar(200) NOT NULL,
    "content" text NOT NULL,
    "tags" text[] DEFAULT '{}',
    "category" varchar(50),
    "embeddingVector" vector(1536),
    "isActive" boolean DEFAULT true,
    "createdAt" timestamp DEFAULT NOW(),
    "updatedAt" timestamp DEFAULT NOW()
);

-- Support Schedule table
CREATE TABLE "supportSchedule" (
    "supportScheduleId" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "agentId" uuid REFERENCES "users"("userId") ON DELETE CASCADE,
    "dayOfWeek" integer CHECK ("dayOfWeek" BETWEEN 0 AND 6),
    "startTime" time NOT NULL,
    "endTime" time NOT NULL,
    "isActive" boolean DEFAULT true,
    "createdAt" timestamp DEFAULT NOW()
);

-- 添加 外鍵 約束
ALTER TABLE "organization" ADD CONSTRAINT "FK_organization_userId" FOREIGN KEY ("userId") REFERENCES "users"("userId");
ALTER TABLE "concert" ADD CONSTRAINT "FK_concert_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organization"("organizationId");
ALTER TABLE "concert" ADD CONSTRAINT "FK_concert_venueId" FOREIGN KEY ("venueId") REFERENCES "venues"("venueId");
ALTER TABLE "concert" ADD CONSTRAINT "FK_concert_locationTagId" FOREIGN KEY ("locationTagId") REFERENCES "locationTag"("locationTagId");
ALTER TABLE "concert" ADD CONSTRAINT "FK_concert_musicTagId" FOREIGN KEY ("musicTagId") REFERENCES "musicTag"("musicTagId");
ALTER TABLE "concertReview" ADD CONSTRAINT "FK_concertReview_concertId" FOREIGN KEY ("concertId") REFERENCES "concert"("concertId") ON DELETE CASCADE;
ALTER TABLE "concertSession" ADD CONSTRAINT "FK_concertSession_concertId" FOREIGN KEY ("concertId") REFERENCES "concert"("concertId") ON DELETE CASCADE;
ALTER TABLE "ticketType" ADD CONSTRAINT "FK_ticketType_concertSessionId" FOREIGN KEY ("concertSessionId") REFERENCES "concertSession"("sessionId") ON DELETE CASCADE;
ALTER TABLE "order" ADD CONSTRAINT "FK_order_ticketTypeId" FOREIGN KEY ("ticketTypeId") REFERENCES "ticketType"("ticketTypeId");
ALTER TABLE "order" ADD CONSTRAINT "FK_order_userId" FOREIGN KEY ("userId") REFERENCES "users"("userId");
ALTER TABLE "ticket" ADD CONSTRAINT "FK_ticket_orderId" FOREIGN KEY ("orderId") REFERENCES "order"("orderId");
ALTER TABLE "ticket" ADD CONSTRAINT "FK_ticket_ticketTypeId" FOREIGN KEY ("ticketTypeId") REFERENCES "ticketType"("ticketTypeId");
ALTER TABLE "ticket" ADD CONSTRAINT "FK_ticket_userId" FOREIGN KEY ("userId") REFERENCES "users"("userId");
ALTER TABLE "payment" ADD CONSTRAINT "FK_payment_orderId" FOREIGN KEY ("orderId") REFERENCES "order"("orderId");

-- 創建 索引 (除了主鍵和唯一約束自帶的索引外)
CREATE INDEX "IDX_users_role" ON "users" ("role");
-- 為外鍵創建索引 (提高查詢性能)
CREATE INDEX "IDX_organization_userId" ON "organization" ("userId");
CREATE INDEX "IDX_concert_organizationId" ON "concert" ("organizationId");
CREATE INDEX "IDX_concert_venueId" ON "concert" ("venueId");
CREATE INDEX "IDX_concert_locationTagId" ON "concert" ("locationTagId");
CREATE INDEX "IDX_concert_musicTagId" ON "concert" ("musicTagId");
CREATE INDEX "IDX_concertReview_concertId" ON "concertReview" ("concertId");
CREATE INDEX "IDX_concertReview_reviewType" ON "concertReview" ("reviewType");
CREATE INDEX "IDX_concertReview_reviewStatus" ON "concertReview" ("reviewStatus");
CREATE INDEX "IDX_concertSession_concertId" ON "concertSession" ("concertId");
CREATE INDEX "IDX_order_ticketTypeId" ON "order" ("ticketTypeId");
CREATE INDEX "IDX_order_userId" ON "order" ("userId");
CREATE INDEX "IDX_ticket_orderId" ON "ticket" ("orderId");
CREATE INDEX "IDX_ticket_ticketTypeId" ON "ticket" ("ticketTypeId");
CREATE INDEX "IDX_ticket_userId" ON "ticket" ("userId");
CREATE INDEX "IDX_payment_orderId" ON "payment" ("orderId");

-- 客服系統索引
CREATE INDEX "IDX_faqCategory_parentId" ON "faqCategory"("parentId");
CREATE INDEX "IDX_faqCategory_isActive" ON "faqCategory"("isActive");
CREATE INDEX "IDX_faq_categoryId" ON "faq"("categoryId");
CREATE INDEX "IDX_faq_keywords" ON "faq" USING GIN("keywords");
CREATE INDEX "IDX_faq_isActive" ON "faq"("isActive");
CREATE INDEX "IDX_supportSession_userId" ON "supportSession"("userId");
CREATE INDEX "IDX_supportSession_agentId" ON "supportSession"("agentId");
CREATE INDEX "IDX_supportSession_status" ON "supportSession"("status");
CREATE INDEX "IDX_supportSession_createdAt" ON "supportSession"("createdAt");
CREATE INDEX "IDX_supportMessage_sessionId" ON "supportMessage"("sessionId");
CREATE INDEX "IDX_supportMessage_createdAt" ON "supportMessage"("createdAt");
CREATE INDEX "IDX_faqUsageStat_faqId" ON "faqUsageStat"("faqId");
CREATE INDEX "IDX_supportKnowledgeBase_category" ON "supportKnowledgeBase"("category");
CREATE INDEX "IDX_supportKnowledgeBase_tags" ON "supportKnowledgeBase" USING GIN("tags");
CREATE INDEX "IDX_supportSchedule_agentId" ON "supportSchedule"("agentId");

-- 創建觸發器函數更新 updatedAt
CREATE OR REPLACE FUNCTION "fn_updateUpdatedAt"()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- 為需要的表格創建觸發器
CREATE TRIGGER "TRG_faqCategory_updated" BEFORE UPDATE ON "faqCategory"
FOR EACH ROW EXECUTE FUNCTION "fn_updateUpdatedAt"();

CREATE TRIGGER "TRG_faq_updated" BEFORE UPDATE ON "faq"
FOR EACH ROW EXECUTE FUNCTION "fn_updateUpdatedAt"();

CREATE TRIGGER "TRG_supportKnowledgeBase_updated" BEFORE UPDATE ON "supportKnowledgeBase"
FOR EACH ROW EXECUTE FUNCTION "fn_updateUpdatedAt"();

-- 插入初始 FAQ 分類數據
INSERT INTO "faqCategory" ("name", "description", "sortOrder") VALUES
('票務相關', '關於票券購買、退換票等問題', 1),
('演出資訊', '演出時間、地點、內容等查詢', 2),
('會員相關', '會員註冊、登入、個人資料等問題', 3),
('付款相關', '付款方式、訂單、發票等問題', 4),
('技術支援', '網站使用、APP 操作等技術問題', 5),
('其他', '其他未分類問題', 6);

-- 插入票務相關的子分類
INSERT INTO "faqCategory" ("name", "description", "parentId", "sortOrder")
SELECT '購票問題', '購票流程、選位等相關問題', "faqCategoryId", 1 
FROM "faqCategory" WHERE "name" = '票務相關' LIMIT 1;

INSERT INTO "faqCategory" ("name", "description", "parentId", "sortOrder")
SELECT '退換票', '退票、換票政策和流程', "faqCategoryId", 2 
FROM "faqCategory" WHERE "name" = '票務相關' LIMIT 1;

INSERT INTO "faqCategory" ("name", "description", "parentId", "sortOrder")
SELECT '票券使用', '入場方式、票券驗證等', "faqCategoryId", 3 
FROM "faqCategory" WHERE "name" = '票務相關' LIMIT 1;

-- 插入一些常見的 FAQ
WITH cat AS (
    SELECT "faqCategoryId" FROM "faqCategory" WHERE "name" = '購票問題' LIMIT 1
)
INSERT INTO "faq" ("categoryId", "question", "answer", "keywords")
SELECT cat."faqCategoryId", '如何購買演出票券？',
'您可以在我們的網站上選擇想要的演出，選擇座位和票種，然後完成付款即可。詳細步驟：1. 搜尋或瀏覽演出 2. 選擇場次和座位 3. 確認訂單資訊 4. 完成付款',
ARRAY['購票', '買票', '訂票', '購買'] FROM cat;

WITH cat AS (
    SELECT "faqCategoryId" FROM "faqCategory" WHERE "name" = '退換票' LIMIT 1
)
INSERT INTO "faq" ("categoryId", "question", "answer", "keywords")
SELECT cat."faqCategoryId", '可以退票嗎？退票政策是什麼？',
'退票政策依演出而異。一般情況下，演出前7天可申請退票，將收取票面金額10%手續費。演出前3天內恕不接受退票。詳細政策請查看各演出頁面或聯繫客服。',
ARRAY['退票', '取消', '退款', '政策'] FROM cat;

WITH cat AS (
    SELECT "faqCategoryId" FROM "faqCategory" WHERE "name" = '退換票' LIMIT 1
)
INSERT INTO "faq" ("categoryId", "question", "answer", "keywords")
SELECT cat."faqCategoryId", '如何換票？',
'如需換票，請在演出前48小時聯繫客服。換票需視座位availability而定，可能需補價差。每張票券限換票一次。',
ARRAY['換票', '更換', '改票'] FROM cat;

WITH cat AS (
    SELECT "faqCategoryId" FROM "faqCategory" WHERE "name" = '票券使用' LIMIT 1
)
INSERT INTO "faq" ("categoryId", "question", "answer", "keywords")
SELECT cat."faqCategoryId", '電子票券如何使用？',
'購票成功後，您會收到電子票券QR Code。入場時請出示QR Code供工作人員掃描即可。建議提前截圖保存以防網路問題。',
ARRAY['電子票', 'QR Code', '入場', '驗票'] FROM cat;

WITH cat AS (
    SELECT "faqCategoryId" FROM "faqCategory" WHERE "name" = '會員相關' LIMIT 1
)
INSERT INTO "faq" ("categoryId", "question", "answer", "keywords")
SELECT cat."faqCategoryId", '忘記密碼怎麼辦？',
'請點擊登入頁面的「忘記密碼」連結，輸入您的註冊email，系統會發送重設密碼連結到您的信箱。',
ARRAY['忘記密碼', '重設密碼', '無法登入'] FROM cat;

WITH cat AS (
    SELECT "faqCategoryId" FROM "faqCategory" WHERE "name" = '付款相關' LIMIT 1
)
INSERT INTO "faq" ("categoryId", "question", "answer", "keywords")
SELECT cat."faqCategoryId", '支援哪些付款方式？',
'我們支援信用卡、ATM轉帳、超商付款等多種付款方式。信用卡支援Visa、MasterCard、JCB等國際卡，以及各大銀行信用卡。',
ARRAY['付款', '信用卡', 'ATM', '超商'] FROM cat;