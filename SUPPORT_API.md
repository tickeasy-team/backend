# 🤖 Tickeasy 智能客服 API 文件

## 🎯 **概述**

Tickeasy 智能客服系統提供 AI 驅動的客戶服務，整合 OpenAI GPT 模型和 Supabase MCP Server，提供智能回覆、FAQ 搜尋和無縫的人工轉接功能。

---

## 🔧 **技術架構**

- **AI 引擎**: OpenAI GPT-4o-mini
- **資料存取**: Supabase MCP Server
- **對話管理**: TypeORM + PostgreSQL
- **認證**: JWT Token

---

## 📋 **API 端點**

### 🏥 **系統狀態**

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
    "mcp": "ready",
    "database": "connected"
  }
}
```

---

### 📚 **FAQ 與分類**

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
- `limit` (可選): 返回數量限制，預設 10

---

### 💬 **對話管理**

#### 開始新的客服會話
```http
POST /api/v1/support/chat/start
```

**請求體:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "category": "票務問題",
  "initialMessage": "你好，我想詢問購票相關問題"
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
      "text": "您好！我是 Tickeasy 智能客服助理，很高興為您服務...",
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
**需要認證**: Bearer Token

**請求體:**
```json
{
  "sessionId": "123e4567-e89b-12d3-a456-426614174000",
  "message": "請問購票流程是怎樣的？",
  "messageType": "text"
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
      "text": "購票流程很簡單：1. 選擇演唱會場次...",
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
**需要認證**: Bearer Token

**回應範例:**
```json
{
  "success": true,
  "data": {
    "session": {
      "sessionId": "123e4567-e89b-12d3-a456-426614174000",
      "status": "active",
      "category": "票務問題",
      "createdAt": "2024-01-20T10:00:00.000Z"
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
      }
    ]
  }
}
```

#### 請求轉接人工客服
```http
POST /api/v1/support/chat/{sessionId}/transfer
```
**需要認證**: Bearer Token

**請求體:**
```json
{
  "reason": "問題比較複雜，需要專業協助"
}
```

**回應範例:**
```json
{
  "success": true,
  "message": "已轉接至人工客服",
  "data": {
    "sessionStatus": "waiting",
    "estimatedWaitTime": "3-5分鐘"
  }
}
```

#### 關閉會話
```http
POST /api/v1/support/chat/{sessionId}/close
```
**需要認證**: Bearer Token

**請求體:**
```json
{
  "satisfactionRating": 5,
  "satisfactionComment": "服務很棒，問題解決了！"
}
```

#### 獲取用戶的所有會話
```http
GET /api/v1/support/chat/sessions?status=active&limit=20&offset=0
```
**需要認證**: Bearer Token

---

## 🔒 **認證**

### JWT Token 格式
```http
Authorization: Bearer <your-jwt-token>
```

### Token 包含欄位
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "iat": 1642665600,
  "exp": 1642752000
}
```

---

## 📊 **資料模型**

### 會話狀態
- `active`: 進行中
- `waiting`: 等待人工客服
- `closed`: 已關閉
- `transferred`: 已轉接

### 會話類型
- `bot`: 純 AI 對話
- `human`: 純人工客服
- `mixed`: 混合模式

### 訊息類型
- `text`: 文字訊息
- `image`: 圖片
- `file`: 檔案
- `quick_reply`: 快速回覆
- `faq_suggestion`: FAQ 建議

### 優先級
- `low`: 低優先級
- `normal`: 一般優先級
- `high`: 高優先級
- `urgent`: 緊急

---

## 🚀 **使用範例**

### JavaScript 前端整合
```javascript
// 開始會話
const startChat = async (userId, initialMessage) => {
  const response = await fetch('/api/v1/support/chat/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId,
      category: '一般諮詢',
      initialMessage
    })
  });
  
  const data = await response.json();
  return data.data.sessionId;
};

// 發送訊息
const sendMessage = async (sessionId, message, token) => {
  const response = await fetch('/api/v1/support/chat/message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      sessionId,
      message
    })
  });
  
  return await response.json();
};
```

### React Hook 範例
```javascript
import { useState, useEffect } from 'react';

const useSupportChat = (userId) => {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const startChat = async (initialMessage) => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/support/chat/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, initialMessage })
      });
      
      const data = await response.json();
      setSessionId(data.data.sessionId);
      
      if (data.data.botMessage) {
        setMessages([
          { type: 'user', text: initialMessage },
          { type: 'bot', text: data.data.botMessage.text }
        ]);
      }
    } catch (error) {
      console.error('開始聊天失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (message) => {
    if (!sessionId) return;
    
    setMessages(prev => [...prev, { type: 'user', text: message }]);
    setLoading(true);
    
    try {
      const response = await sendMessage(sessionId, message, token);
      if (response.success) {
        setMessages(prev => [...prev, {
          type: 'bot',
          text: response.data.botMessage.text
        }]);
      }
    } catch (error) {
      console.error('發送訊息失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  return { startChat, sendMessage, messages, loading };
};
```

---

## ⚠️ **錯誤處理**

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
- `401`: 未認證
- `403`: 權限不足
- `404`: 資源不存在
- `400`: 請求參數錯誤
- `500`: 伺服器內部錯誤

---

## 🔄 **狀態流程圖**

```
用戶開始對話 → 建立會話(active) → AI 回覆
                                    ↓
                              信心度足夠？
                                    ↓
                                   否 → 轉接等待(waiting) → 人工接手(transferred)
                                    ↓                              ↓
                                   是 → 繼續 AI 對話                關閉會話(closed)
                                    ↓
                              用戶滿意/結束 → 關閉會話(closed)
```

---

## 📈 **效能指標**

### 回應時間目標
- AI 回覆: < 3 秒
- FAQ 搜尋: < 1 秒
- 會話建立: < 500ms

### 可用性目標
- 系統正常運行時間: 99.9%
- AI 服務可用性: 99.5%

---

## 🧪 **測試**

### 執行 API 測試
```bash
# 健康檢查測試
npm run test:simple

# 完整客服 API 測試
npm run test:support

# 啟動開發服務器
npm run dev
```

### 測試環境
- 本地開發: `http://localhost:3000`
- 測試 API 需要有效的 OpenAI API Key

---

## 📞 **技術支援**

如有技術問題，請聯繫開發團隊或查看：
- 系統健康狀態: `/api/v1/support/health`
- 錯誤日誌: 服務器 console 輸出
- MCP 連接狀態: `npm run verify:setup`