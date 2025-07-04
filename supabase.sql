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



-- Support Knowledge Base table (整合智能回覆規則)
CREATE TABLE "supportKnowledgeBase" (
    "supportKBId" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "title" varchar(200) NOT NULL,
    "content" text NOT NULL,
    "tags" text[] DEFAULT '{}',
    "category" varchar(50),
    "embeddingVector" vector(1536),
    "isActive" boolean DEFAULT true,
    
    -- 智能回覆規則相關欄位
    "ruleId" varchar(100),
    "replyType" varchar(20),
    "keywords" text[] DEFAULT '{}',
    "priority" integer DEFAULT 3,
    
    -- Tutorial 相關欄位
    "tutorialUrl" varchar(500),
    "tutorialDescription" text,
    
    -- FAQ 相關欄位
    "faqAnswer" text,
    "relatedQuestions" text[] DEFAULT '{}',
    
    -- 統計欄位
    "viewCount" integer DEFAULT 0,
    "helpfulCount" integer DEFAULT 0,
    "notHelpfulCount" integer DEFAULT 0,
    
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
CREATE INDEX "IDX_supportSession_userId" ON "supportSession"("userId");
CREATE INDEX "IDX_supportSession_agentId" ON "supportSession"("agentId");
CREATE INDEX "IDX_supportSession_status" ON "supportSession"("status");
CREATE INDEX "IDX_supportSession_createdAt" ON "supportSession"("createdAt");
CREATE INDEX "IDX_supportMessage_sessionId" ON "supportMessage"("sessionId");
CREATE INDEX "IDX_supportMessage_createdAt" ON "supportMessage"("createdAt");
CREATE INDEX "IDX_supportKnowledgeBase_category" ON "supportKnowledgeBase"("category");
CREATE INDEX "IDX_supportKnowledgeBase_tags" ON "supportKnowledgeBase" USING GIN("tags");
CREATE INDEX "IDX_supportKnowledgeBase_ruleId" ON "supportKnowledgeBase"("ruleId");
CREATE INDEX "IDX_supportKnowledgeBase_replyType" ON "supportKnowledgeBase"("replyType");
CREATE INDEX "IDX_supportKnowledgeBase_keywords" ON "supportKnowledgeBase" USING GIN("keywords");
CREATE INDEX "IDX_supportKnowledgeBase_priority" ON "supportKnowledgeBase"("priority");
CREATE INDEX "IDX_supportKnowledgeBase_isActive_replyType" ON "supportKnowledgeBase"("isActive", "replyType");
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
CREATE TRIGGER "TRG_supportKnowledgeBase_updated" BEFORE UPDATE ON "supportKnowledgeBase"
FOR EACH ROW EXECUTE FUNCTION "fn_updateUpdatedAt"();

-- 新增 Knowledge Base 約束
ALTER TABLE "supportKnowledgeBase" 
ADD CONSTRAINT "CK_supportKnowledgeBase_replyType" 
CHECK ("replyType" IN ('tutorial', 'faq', 'knowledge') OR "replyType" IS NULL);

ALTER TABLE "supportKnowledgeBase" 
ADD CONSTRAINT "CK_supportKnowledgeBase_priority" 
CHECK ("priority" BETWEEN 1 AND 3);