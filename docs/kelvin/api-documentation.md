# Tickeasy API 文檔

## 概述
Tickeasy 票務系統提供完整的 RESTful API，支援用戶管理、演唱會管理、票務系統、訂單處理等核心功能。

## 基本資訊
- **Base URL**: `https://api.tickeasy.com/api/v1`
- **認證方式**: Bearer Token (JWT)
- **回應格式**: JSON
- **字符編碼**: UTF-8

## 認證機制

### 取得 Token
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**回應:**
```json
{
  "status": "success",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "name": "使用者姓名"
    }
  }
}
```

### 使用 Token
```http
Authorization: Bearer your-access-token
```

## API 端點

### 1. 身份驗證 (Authentication)

#### 1.1 用戶登入
```http
POST /auth/login
```

**請求參數:**
| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| email | string | ✅ | 用戶電子郵件 |
| password | string | ✅ | 用戶密碼 |

#### 1.2 用戶註冊
```http
POST /auth/register
```

**請求參數:**
| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| name | string | ✅ | 用戶姓名 |
| email | string | ✅ | 電子郵件 |
| password | string | ✅ | 密碼 (最少8位) |
| confirmPassword | string | ✅ | 確認密碼 |

#### 1.3 Google OAuth 登入
```http
GET /auth/google
```

#### 1.4 重新整理 Token
```http
POST /auth/refresh
```

**請求參數:**
| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| refreshToken | string | ✅ | Refresh Token |

### 2. 用戶管理 (Users)

#### 2.1 取得用戶資料
```http
GET /users/profile
Authorization: Bearer {token}
```

**回應:**
```json
{
  "status": "success",
  "data": {
    "id": "user-uuid",
    "name": "使用者姓名",
    "email": "user@example.com",
    "avatar": "https://example.com/avatar.jpg",
    "isEmailVerified": true,
    "role": "user",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

#### 2.2 更新用戶資料
```http
PUT /users/profile
Authorization: Bearer {token}
```

**請求參數:**
| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| name | string | ❌ | 用戶姓名 |
| phone | string | ❌ | 電話號碼 |
| birthday | string | ❌ | 生日 (YYYY-MM-DD) |

### 3. 演唱會管理 (Concerts)

#### 3.1 取得演唱會列表
```http
GET /concerts
```

**查詢參數:**
| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| page | number | ❌ | 頁碼 (預設: 1) |
| limit | number | ❌ | 每頁筆數 (預設: 20) |
| category | string | ❌ | 分類篩選 |
| location | string | ❌ | 地點篩選 |
| startDate | string | ❌ | 開始日期 |
| endDate | string | ❌ | 結束日期 |

**回應:**
```json
{
  "status": "success",
  "data": {
    "concerts": [
      {
        "id": "concert-uuid",
        "title": "演唱會名稱",
        "description": "演唱會描述",
        "posterImage": "https://example.com/poster.jpg",
        "venue": {
          "name": "場地名稱",
          "address": "場地地址"
        },
        "sessions": [
          {
            "id": "session-uuid",
            "startTime": "2024-06-01T19:00:00Z",
            "endTime": "2024-06-01T22:00:00Z"
          }
        ],
        "ticketTypes": [
          {
            "id": "type-uuid",
            "name": "VIP座位",
            "price": 3000,
            "totalQuantity": 100,
            "availableQuantity": 85
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

#### 3.2 取得單一演唱會詳情
```http
GET /concerts/{concertId}
```

#### 3.3 建立演唱會 (需要主辦方權限)
```http
POST /concerts
Authorization: Bearer {token}
```

**請求參數:**
| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| title | string | ✅ | 演唱會標題 |
| description | string | ✅ | 演唱會描述 |
| posterImage | string | ❌ | 海報圖片 URL |
| venueId | string | ✅ | 場地 ID |
| organizationId | string | ✅ | 主辦組織 ID |
| sessions | array | ✅ | 場次資訊 |
| ticketTypes | array | ✅ | 票種資訊 |
| tags | array | ❌ | 標籤 |

### 4. 票務系統 (Tickets)

#### 4.1 取得可用票券
```http
GET /concerts/{concertId}/tickets
```

#### 4.2 預訂票券
```http
POST /tickets/reserve
Authorization: Bearer {token}
```

**請求參數:**
| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| sessionId | string | ✅ | 場次 ID |
| ticketTypeId | string | ✅ | 票種 ID |
| quantity | number | ✅ | 數量 |

### 5. 訂單管理 (Orders)

#### 5.1 建立訂單
```http
POST /orders
Authorization: Bearer {token}
```

**請求參數:**
| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| tickets | array | ✅ | 票券列表 |
| contactInfo | object | ✅ | 聯絡資訊 |

#### 5.2 取得訂單列表
```http
GET /orders
Authorization: Bearer {token}
```

#### 5.3 取得訂單詳情
```http
GET /orders/{orderId}
Authorization: Bearer {token}
```

### 6. 支付系統 (Payments)

#### 6.1 建立支付
```http
POST /payments
Authorization: Bearer {token}
```

**請求參數:**
| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| orderId | string | ✅ | 訂單 ID |
| paymentMethod | string | ✅ | 支付方式 |
| amount | number | ✅ | 支付金額 |

### 7. 智能客服 (Smart Reply)

#### 7.1 發送訊息
```http
POST /smart-reply/chat
Authorization: Bearer {token}
```

**請求參數:**
| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| sessionId | string | ✅ | 會話 ID |
| message | string | ✅ | 訊息內容 |

**回應:**
```json
{
  "status": "success",
  "data": {
    "reply": "AI 回覆內容",
    "confidence": 0.85,
    "suggestedActions": ["查看訂單", "聯絡客服"],
    "relatedTopics": ["退票政策", "座位選擇"]
  }
}
```

## 錯誤處理

### 錯誤回應格式
```json
{
  "status": "failed",
  "message": "錯誤訊息",
  "code": "ERROR_CODE",
  "details": {
    "field": "具體錯誤欄位",
    "reason": "錯誤原因"
  }
}
```

### 常見錯誤碼
| 狀態碼 | 錯誤碼 | 說明 |
|--------|--------|------|
| 400 | VALIDATION_ERROR | 資料驗證錯誤 |
| 401 | UNAUTHORIZED | 未授權存取 |
| 403 | FORBIDDEN | 權限不足 |
| 404 | NOT_FOUND | 資源不存在 |
| 409 | CONFLICT | 資源衝突 |
| 422 | UNPROCESSABLE_ENTITY | 無法處理的實體 |
| 429 | RATE_LIMIT_EXCEEDED | 請求頻率超限 |
| 500 | INTERNAL_SERVER_ERROR | 伺服器內部錯誤 |

## 速率限制

### 限制規則
- **一般 API**: 每分鐘 100 次請求
- **認證 API**: 每分鐘 10 次請求
- **檔案上傳**: 每分鐘 20 次請求

### 限制標頭
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## 分頁機制

### 查詢參數
```http
GET /concerts?page=1&limit=20
```

### 回應格式
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## WebSocket 連接

### 連接端點
```
wss://api.tickeasy.com/ws
```

### 認證
```javascript
// 連接時傳送認證資訊
{
  "type": "auth",
  "token": "your-access-token"
}
```

### 訊息格式
```javascript
// 客服訊息
{
  "type": "chat_message",
  "sessionId": "session-uuid",
  "message": "使用者訊息"
}

// 訂單狀態更新
{
  "type": "order_update",
  "orderId": "order-uuid",
  "status": "confirmed"
}
```

## SDK 和程式碼範例

### JavaScript/TypeScript
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.tickeasy.com/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

// 設定認證攔截器
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 取得演唱會列表
const getConcerts = async (params = {}) => {
  const response = await api.get('/concerts', { params });
  return response.data;
};

// 建立訂單
const createOrder = async (orderData) => {
  const response = await api.post('/orders', orderData);
  return response.data;
};
```

### Python
```python
import requests

class TickeasyAPI:
    def __init__(self, base_url="https://api.tickeasy.com/api/v1"):
        self.base_url = base_url
        self.token = None
    
    def login(self, email, password):
        response = requests.post(f"{self.base_url}/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code == 200:
            self.token = response.json()["data"]["accessToken"]
        return response.json()
    
    def get_concerts(self, **params):
        headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
        response = requests.get(f"{self.base_url}/concerts", 
                              params=params, headers=headers)
        return response.json()
```

## 變更日誌

### v1.2.0 (2024-03-01)
- ✅ 新增智能客服 API
- ✅ 支援 WebSocket 即時通訊
- ✅ 優化分頁機制

### v1.1.0 (2024-02-01)
- ✅ 新增訂單狀態即時更新
- ✅ 支援批量票券操作
- ✅ 改善錯誤處理機制

### v1.0.0 (2024-01-01)
- ✅ 初始版本發布
- ✅ 核心 API 功能完成 