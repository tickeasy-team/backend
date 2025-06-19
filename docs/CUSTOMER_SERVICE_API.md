# 🤖 Tickeasy 客服系統 API 文件

## 📋 目錄

- [概述](#概述)
- [系統架構](#系統架構)
- [認證方式](#認證方式)
- [API 端點](#api-端點)
  - [系統狀態](#系統狀態)
  - [會話管理](#會話管理)
  - [AI 即時問答](#ai-即時問答)
  - [知識庫與 FAQ](#知識庫與-faq)
- [資料模型](#資料模型)
- [錯誤處理](#錯誤處理)
- [使用範例](#使用範例)
- [測試指南](#測試指南)

---

## 🎯 概述

Tickeasy 客服系統提供統一的 AI 驅動客戶服務，整合了會話管理、即時問答、知識庫搜尋等功能。系統支援匿名用戶和登入用戶，提供無縫的客服體驗。

### 主要特性

- 🤖 **智能 AI 回覆** - 基於 OpenAI GPT-4o-mini
- 💬 **會話管理** - 完整的對話歷史記錄
- 🔍 **知識庫搜尋** - 語義搜尋 FAQ 內容
- 👤 **匿名支援** - 無需登入即可使用客服
- 🔄 **人工轉接** - 智能判斷何時轉接人工客服
- 📊 **信心度評估** - AI 回覆品質評分

---

## 🏗️ 系統架構

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   前端應用      │    │   API Gateway    │    │  統一客服服務   │
│                 │◄──►│                  │◄──►│                 │
│ - Web App       │    │ - 路由管理       │    │ - AI 回覆生成   │
│ - Mobile App    │    │ - 認證檢查       │    │ - 會話管理      │
│ - 第三方整合    │    │ - 參數驗證       │    │ - 知識庫搜尋    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   OpenAI API    │    │   PostgreSQL    │
                       │                 │    │                 │
                       │ - GPT-4o-mini   │    │ - 會話記錄      │
                       │ - 文字生成      │    │ - 訊息歷史      │
                       │ - 語義理解      │    │ - 知識庫        │
                       └─────────────────┘    └─────────────────┘
```

---

## 🔐 認證方式

### JWT Token 認證（可選）

```http
Authorization: Bearer <your-jwt-token>
```

### 匿名訪問

大部分客服功能支援匿名訪問，無需提供認證 token。

### Token 格式

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "iat": 1642665600,
  "exp": 1642752000
}
```

---

## 📡 API 端點

### 🏥 系統狀態

#### 健康檢查

```http
GET /api/v1/support/health
```

**回應範例:**

```json
{
  "success": true,
  "message": "客服系統運行正常",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "services": {
    "openai": "connected",
    "database": "connected"
  }
}
```

#### AI 客服健康檢查

```http
GET /api/v1/ai-customer-service/health
```

---

### 💬 會話管理

#### 開始新的客服會話

```http
POST /api/v1/support/chat/start
```

**認證**: 可選（支援匿名）

**請求體:**

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000", // 可選，登入用戶提供
  "category": "票務問題", // 可選
  "initialMessage": "你好，我想詢問購票相關問題" // 可選
}
```

**回應範例:**

```json
{
  "success": true,
  "message": "會話已開始",
  "data": {
    "sessionId": "123e4567-e89b-12d3-a456-426614174000",
    "status": "active",
    "botMessage": {
      "messageId": "msg-123",
      "text": "您好！我是 Tickeasy 智能客服助理，很高興為您服務。請問有什麼可以幫助您的嗎？",
      "confidence": 0.95,
      "shouldTransfer": false,
      "faqSuggestions": [
        {
          "faqId": "faq-1",
          "question": "如何購買演唱會門票？",
          "confidence": 0.88
        }
      ]
    }
  }
}
```

#### 發送訊息

```http
POST /api/v1/support/chat/message
```

**認證**: 可選（支援匿名）

**請求體:**

```json
{
  "sessionId": "123e4567-e89b-12d3-a456-426614174000",
  "message": "請問購票流程是怎樣的？",
  "messageType": "text" // 可選: text, image, file
}
```

**回應範例:**

```json
{
  "success": true,
  "message": "訊息已發送",
  "data": {
    "userMessageId": "msg-124",
    "botMessage": {
      "messageId": "msg-125",
      "text": "購票流程很簡單：\n1. 在首頁搜尋想要的演唱會\n2. 選擇場次和座位\n3. 填寫購買資訊\n4. 完成付款\n5. 收到電子票券\n\n需要我詳細說明任何步驟嗎？",
      "confidence": 0.92,
      "shouldTransfer": false,
      "faqSuggestions": [],
      "intent": {
        "intent": "查詢",
        "category": "票務",
        "urgency": "中",
        "sentiment": "中性"
      }
    },
    "sessionStatus": "active"
  }
}
```

#### 獲取會話歷史

```http
GET /api/v1/support/chat/{sessionId}/history?limit=50&offset=0
```

**認證**: 可選（需會話權限）

**參數:**

- `limit` (可選): 返回訊息數量，預設 50
- `offset` (可選): 偏移量，預設 0

**回應範例:**

```json
{
  "success": true,
  "data": {
    "session": {
      "sessionId": "123e4567-e89b-12d3-a456-426614174000",
      "status": "active",
      "category": "票務問題",
      "createdAt": "2024-01-20T10:00:00.000Z",
      "userId": "550e8400-e29b-41d4-a716-446655440000"
    },
    "messages": [
      {
        "messageId": "msg-123",
        "senderType": "user",
        "text": "你好，我想詢問購票相關問題",
        "messageType": "text",
        "createdAt": "2024-01-20T10:00:00.000Z",
        "metadata": {},
        "sender": {
          "name": "張小明",
          "email": "user@example.com"
        }
      },
      {
        "messageId": "msg-124",
        "senderType": "bot",
        "text": "您好！我是 Tickeasy 智能客服助理...",
        "messageType": "text",
        "createdAt": "2024-01-20T10:00:01.000Z",
        "metadata": {
          "confidence": 0.95,
          "intent": "greeting"
        }
      }
    ],
    "pagination": {
      "total": 10,
      "limit": 50,
      "offset": 0,
      "hasMore": false
    }
  }
}
```

#### 請求轉接人工客服

```http
POST /api/v1/support/chat/{sessionId}/transfer
```

**認證**: 可選（需會話權限）

**請求體:**

```json
{
  "reason": "問題比較複雜，需要專業協助" // 可選
}
```

**回應範例:**

```json
{
  "success": true,
  "message": "已轉接至人工客服",
  "data": {
    "sessionStatus": "waiting",
    "estimatedWaitTime": "3-5分鐘",
    "queuePosition": 2
  }
}
```

#### 關閉會話

```http
POST /api/v1/support/chat/{sessionId}/close
```

**認證**: 可選（需會話權限）

**請求體:**

```json
{
  "satisfactionRating": 5, // 可選: 1-5
  "satisfactionComment": "服務很棒，問題解決了！" // 可選
}
```

**回應範例:**

```json
{
  "success": true,
  "message": "會話已關閉",
  "data": {
    "sessionId": "123e4567-e89b-12d3-a456-426614174000",
    "status": "closed",
    "closedAt": "2024-01-20T10:30:00.000Z",
    "satisfactionRating": 5
  }
}
```

#### 獲取用戶的所有會話

```http
GET /api/v1/support/chat/sessions?status=active&limit=20&offset=0
```

**認證**: 必需

**參數:**

- `status` (可選): active, waiting, closed, transferred
- `limit` (可選): 1-50，預設 20
- `offset` (可選): 偏移量，預設 0

---

### 🤖 AI 即時問答

#### 智能對話

```http
POST /api/v1/ai-customer-service/chat
```

**認證**: 不需要

**請求體:**

```json
{
  "message": "支援哪些付款方式？",
  "history": [
    // 可選，對話歷史
    {
      "role": "user",
      "content": "你好"
    },
    {
      "role": "assistant",
      "content": "您好！有什麼可以幫助您的嗎？"
    }
  ]
}
```

**回應範例:**

```json
{
  "success": true,
  "data": {
    "reply": "我們支援多種付款方式：\n\n💳 **信用卡**：Visa、MasterCard、JCB\n🏧 **ATM 轉帳**：各大銀行 ATM\n🏪 **超商付款**：7-11、全家、萊爾富\n📱 **電子支付**：LINE Pay、街口支付\n\n您比較偏好哪種付款方式呢？",
    "confidence": 0.95,
    "shouldTransfer": false,
    "intent": {
      "intent": "查詢",
      "category": "付款",
      "urgency": "低",
      "sentiment": "中性"
    },
    "faqSuggestions": [
      {
        "faqId": "faq-payment-001",
        "question": "信用卡付款失敗怎麼辦？",
        "confidence": 0.82
      }
    ]
  }
}
```

#### 獲取查詢建議

```http
GET /api/v1/ai-customer-service/suggestions?q=付款&limit=5
```

**參數:**

- `q`: 查詢關鍵字（1-100 字）
- `limit` (可選): 1-10，預設 5

**回應範例:**

```json
{
  "success": true,
  "data": {
    "suggestions": [
      "付款方式有哪些？",
      "付款失敗怎麼辦？",
      "如何申請退款？",
      "發票何時開立？",
      "分期付款可以嗎？"
    ]
  }
}
```

---

### 📚 知識庫與 FAQ

#### 獲取客服分類

```http
GET /api/v1/support/categories
```

**回應範例:**

```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "ticket",
        "name": "票務問題",
        "description": "購票、退票、改票相關問題"
      },
      {
        "id": "payment",
        "name": "付款問題",
        "description": "付款失敗、退款、發票等問題"
      },
      {
        "id": "account",
        "name": "帳號問題",
        "description": "註冊、登入、密碼重設等問題"
      },
      {
        "id": "event",
        "name": "活動資訊",
        "description": "演唱會時間、地點、座位等資訊"
      },
      {
        "id": "technical",
        "name": "技術問題",
        "description": "網站使用、App 問題等技術支援"
      },
      {
        "id": "other",
        "name": "其他問題",
        "description": "其他未分類的問題"
      }
    ]
  }
}
```

#### 獲取常見問題

```http
GET /api/v1/support/faq?category=ticket&limit=10
```

**參數:**

- `category` (可選): 分類篩選
- `limit` (可選): 返回數量，預設 10

**回應範例:**

```json
{
  "success": true,
  "data": {
    "faqs": [
      {
        "id": "faq-1",
        "category": "ticket",
        "question": "如何購買演唱會門票？",
        "answer": "您可以在我們的網站首頁搜尋想要的演唱會，選擇場次和座位後，按照購票流程完成付款即可。",
        "keywords": ["購票", "演唱會", "門票"],
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

#### 搜尋知識庫

```http
GET /api/v1/ai-customer-service/search?q=退票政策&limit=5&categories=ticket,payment
```

**參數:**

- `q`: 搜尋查詢（1-200 字）
- `limit` (可選): 1-20，預設 5
- `categories` (可選): 分類篩選，可多選

**回應範例:**

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "kb-001",
        "title": "退票政策說明",
        "content": "根據主辦單位規定，部分活動支援退票...",
        "category": "ticket",
        "score": 0.95,
        "source": "official_policy"
      }
    ],
    "query": "退票政策",
    "totalResults": 8
  }
}
```

#### 獲取常見問題列表

```http
GET /api/v1/ai-customer-service/common-questions
```

**回應範例:**

```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "id": "common-1",
        "question": "如何購買演唱會門票？",
        "category": "ticket",
        "clickCount": 1250
      },
      {
        "id": "common-2",
        "question": "支援哪些付款方式？",
        "category": "payment",
        "clickCount": 980
      }
    ]
  }
}
```

#### 獲取統計資料

```http
GET /api/v1/ai-customer-service/stats
```

**回應範例:**

```json
{
  "success": true,
  "data": {
    "totalQuestions": 15420,
    "avgConfidence": 0.87,
    "transferRate": 0.12,
    "topCategories": [
      {
        "category": "ticket",
        "count": 8500,
        "percentage": 55.1
      },
      {
        "category": "payment",
        "count": 3200,
        "percentage": 20.8
      }
    ],
    "period": "last_30_days"
  }
}
```

---

## 📊 資料模型

### 會話狀態

| 狀態          | 描述         |
| ------------- | ------------ |
| `active`      | 進行中       |
| `waiting`     | 等待人工客服 |
| `closed`      | 已關閉       |
| `transferred` | 已轉接       |

### 訊息類型

| 類型             | 描述     |
| ---------------- | -------- |
| `text`           | 文字訊息 |
| `image`          | 圖片     |
| `file`           | 檔案     |
| `quick_reply`    | 快速回覆 |
| `faq_suggestion` | FAQ 建議 |

### 信心度等級

| 等級 | 範圍    | 處理方式        |
| ---- | ------- | --------------- |
| 高   | 0.8-1.0 | 直接回覆        |
| 中   | 0.6-0.8 | 回覆 + FAQ 建議 |
| 低   | 0.4-0.6 | 建議轉接        |
| 很低 | 0.0-0.4 | 自動轉接        |

---

## ⚠️ 錯誤處理

### 錯誤回應格式

```json
{
  "success": false,
  "message": "錯誤描述",
  "error": "詳細錯誤訊息",
  "code": "ERROR_CODE"
}
```

### 常見錯誤碼

| 狀態碼 | 錯誤碼                | 描述           |
| ------ | --------------------- | -------------- |
| 400    | `VALIDATION_ERROR`    | 請求參數錯誤   |
| 401    | `UNAUTHORIZED`        | 未認證         |
| 403    | `FORBIDDEN`           | 權限不足       |
| 404    | `NOT_FOUND`           | 資源不存在     |
| 429    | `RATE_LIMIT`          | 請求頻率過高   |
| 500    | `INTERNAL_ERROR`      | 伺服器內部錯誤 |
| 503    | `SERVICE_UNAVAILABLE` | 服務暫時不可用 |

---

## 💻 使用範例

### JavaScript 前端整合

```javascript
class CustomerServiceClient {
  constructor(baseURL = "/api/v1", token = null) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    return await response.json();
  }

  // 開始會話
  async startSession(options = {}) {
    return await this.request("/support/chat/start", {
      method: "POST",
      body: JSON.stringify(options),
    });
  }

  // 發送訊息
  async sendMessage(sessionId, message, messageType = "text") {
    return await this.request("/support/chat/message", {
      method: "POST",
      body: JSON.stringify({
        sessionId,
        message,
        messageType,
      }),
    });
  }

  // AI 即時問答
  async aiChat(message, history = []) {
    return await this.request("/ai-customer-service/chat", {
      method: "POST",
      body: JSON.stringify({
        message,
        history,
      }),
    });
  }

  // 搜尋知識庫
  async searchKnowledgeBase(query, options = {}) {
    const params = new URLSearchParams({
      q: query,
      ...options,
    });

    return await this.request(`/ai-customer-service/search?${params}`);
  }
}

// 使用範例
const client = new CustomerServiceClient();

// 匿名用戶使用
const session = await client.startSession({
  category: "票務問題",
  initialMessage: "如何購買門票？",
});

// 繼續對話
const response = await client.sendMessage(
  session.data.sessionId,
  "我想買演唱會門票"
);

// AI 即時問答
const aiResponse = await client.aiChat("支援哪些付款方式？");
```

### React Hook 範例

```javascript
import { useState, useCallback } from "react";

export const useCustomerService = (token = null) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const client = new CustomerServiceClient("/api/v1", token);

  const startSession = useCallback(
    async (options) => {
      setLoading(true);
      setError(null);

      try {
        const result = await client.startSession(options);
        return result;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );

  const sendMessage = useCallback(
    async (sessionId, message) => {
      setLoading(true);
      setError(null);

      try {
        const result = await client.sendMessage(sessionId, message);
        return result;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );

  const aiChat = useCallback(
    async (message, history = []) => {
      setLoading(true);
      setError(null);

      try {
        const result = await client.aiChat(message, history);
        return result;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );

  return {
    startSession,
    sendMessage,
    aiChat,
    loading,
    error,
  };
};
```

---

## 🧪 測試指南

### 環境設定

```bash
# 安裝依賴
npm install

# 設定環境變數
cp .env.example .env
# 編輯 .env 檔案，設定 OPENAI_API_KEY

# 啟動開發服務器
npm run dev
```

### API 測試

#### 1. 健康檢查

```bash
curl -X GET http://localhost:3000/api/v1/support/health
```

#### 2. 匿名會話測試

```bash
# 開始會話
curl -X POST http://localhost:3000/api/v1/support/chat/start \
  -H "Content-Type: application/json" \
  -d '{
    "category": "測試",
    "initialMessage": "你好"
  }'

# 發送訊息
curl -X POST http://localhost:3000/api/v1/support/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "your-session-id",
    "message": "我需要幫助購票"
  }'
```

#### 3. AI 即時問答測試

```bash
curl -X POST http://localhost:3000/api/v1/ai-customer-service/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "支援哪些付款方式？"
  }'
```

#### 4. 知識庫搜尋測試

```bash
curl -X GET "http://localhost:3000/api/v1/ai-customer-service/search?q=退票&limit=3"
```

### 效能測試

```bash
# 使用 Apache Bench 進行壓力測試
ab -n 100 -c 10 http://localhost:3000/api/v1/support/health

# 測試 AI 回覆效能
ab -n 50 -c 5 -p test-data.json -T application/json \
   http://localhost:3000/api/v1/ai-customer-service/chat
```

---

## 📈 效能指標

### 回應時間目標

| 功能       | 目標時間 |
| ---------- | -------- |
| 健康檢查   | < 100ms  |
| 會話建立   | < 500ms  |
| 訊息發送   | < 2s     |
| AI 回覆    | < 3s     |
| 知識庫搜尋 | < 1s     |

### 可用性目標

- 系統正常運行時間: 99.9%
- AI 服務可用性: 99.5%
- 資料庫連接: 99.99%

---

## 🔧 配置選項

### 環境變數

```env
# OpenAI 配置
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.7

# 客服系統配置
CUSTOMER_SERVICE_DEFAULT_CONFIDENCE_THRESHOLD=0.6
CUSTOMER_SERVICE_AUTO_TRANSFER_THRESHOLD=0.4
CUSTOMER_SERVICE_SESSION_TIMEOUT_MINUTES=30
CUSTOMER_SERVICE_MAX_HISTORY_LENGTH=50

# 知識庫配置
FAQ_SEARCH_LIMIT=10
KNOWLEDGE_BASE_SIMILARITY_THRESHOLD=0.7
```

### 系統限制

| 項目         | 限制           |
| ------------ | -------------- |
| 訊息長度     | 1-1000 字      |
| 會話歷史     | 最多 50 則訊息 |
| 搜尋結果     | 最多 20 筆     |
| 會話超時     | 30 分鐘無活動  |
| API 請求頻率 | 100 次/分鐘    |

---

## 📞 技術支援

### 故障排除

1. **OpenAI API 錯誤**

   - 檢查 API Key 是否正確
   - 確認配額是否足夠
   - 查看 OpenAI 服務狀態

2. **資料庫連接問題**

   - 檢查資料庫連接字串
   - 確認資料庫服務運行正常
   - 查看連接池狀態

3. **會話權限錯誤**
   - 確認 sessionId 格式正確
   - 檢查用戶權限
   - 查看會話狀態

### 監控指標

- API 回應時間
- 錯誤率統計
- AI 信心度分佈
- 人工轉接率
- 用戶滿意度

### 聯繫方式

- 技術支援：tech-support@tickeasy.com
- 系統狀態：https://status.tickeasy.com
- 開發文檔：https://docs.tickeasy.com

---

_最後更新：2024-01-20_
_版本：v2.0.0_
