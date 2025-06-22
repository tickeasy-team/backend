# Tickeasy API 文檔

## Base URL

- **生產環境**: `https://tickeasy-team-backend.onrender.com`
- **開發環境**: `http://localhost:3000`

## API 版本

當前版本：`v1`

所有 API 端點都以 `/api/v1` 為前綴。

## 認證方式

大部分 API 需要 JWT 認證。請在請求標頭中包含：

```
Authorization: Bearer {your_jwt_token}
```

## 錯誤回應格式

所有錯誤回應都遵循以下格式：

```json
{
  "status": "error",
  "message": "錯誤描述",
  "error": {
    "code": "ERROR_CODE",
    "details": {} // 可選的詳細錯誤資訊
  }
}
```

## API 端點詳細說明

### 認證相關 API (`/api/v1/auth`)

#### 用戶註冊
- **路徑**: `POST /api/v1/auth/register`
- **描述**: 創建新用戶帳號
- **需要認證**: 否
- **請求內容**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }
  ```
- **成功回應** (200):
  ```json
  {
    "status": "success",
    "message": "註冊成功，請檢查您的電子郵件進行驗證",
    "data": {
      "userId": "uuid",
      "email": "user@example.com"
    }
  }
  ```

#### 用戶登入
- **路徑**: `POST /api/v1/auth/login`
- **描述**: 用戶登入並獲取 JWT token
- **需要認證**: 否
- **請求內容**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **成功回應** (200):
  ```json
  {
    "status": "success",
    "message": "登入成功",
    "data": {
      "token": "jwt_token",
      "user": {
        "id": "uuid",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe"
      }
    }
  }
  ```

#### 驗證電子郵件
- **路徑**: `POST /api/v1/auth/verify-email`
- **描述**: 驗證用戶的電子郵件地址
- **需要認證**: 否
- **請求內容**:
  ```json
  {
    "token": "verification_token"
  }
  ```

#### Google OAuth 登入
- **路徑**: `GET /api/v1/auth/google`
- **描述**: 啟動 Google OAuth 流程
- **需要認證**: 否
- **重定向**: 成功後重定向到 `FRONTEND_URL`

### 用戶相關 API (`/api/v1/users`)

#### 獲取用戶資料
- **路徑**: `GET /api/v1/users/profile`
- **描述**: 獲取當前登入用戶的詳細資料
- **需要認證**: 是
- **成功回應** (200):
  ```json
  {
    "status": "success",
    "data": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "avatar": "https://storage.url/avatar.jpg",
      "emailVerified": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
  ```

#### 更新用戶資料
- **路徑**: `PUT /api/v1/users/profile`
- **描述**: 更新用戶個人資料
- **需要認證**: 是
- **請求內容**:
  ```json
  {
    "firstName": "Jane",
    "lastName": "Smith",
    "phone": "+886912345678"
  }
  ```

### 組織相關 API (`/api/v1/organizations`)

#### 獲取所有組織
- **路徑**: `GET /api/v1/organizations`
- **描述**: 獲取用戶擁有的所有組織
- **需要認證**: 是
- **查詢參數**:
  - `page`: 頁碼 (預設: 1)
  - `limit`: 每頁數量 (預設: 10)
- **成功回應** (200):
  ```json
  {
    "status": "success",
    "data": {
      "organizations": [
        {
          "id": "uuid",
          "name": "組織名稱",
          "description": "組織描述",
          "logo": "https://storage.url/logo.jpg",
          "createdAt": "2024-01-01T00:00:00Z"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 10,
        "total": 25,
        "totalPages": 3
      }
    }
  }
  ```

#### 創建組織
- **路徑**: `POST /api/v1/organizations`
- **描述**: 創建新組織
- **需要認證**: 是
- **請求內容**:
  ```json
  {
    "name": "新組織",
    "description": "組織描述",
    "contactEmail": "org@example.com",
    "contactPhone": "+886912345678",
    "address": "台北市信義區"
  }
  ```

### 演唱會相關 API (`/api/v1/concerts`)

#### 獲取演唱會列表
- **路徑**: `GET /api/v1/concerts`
- **描述**: 獲取所有公開的演唱會
- **需要認證**: 否
- **查詢參數**:
  - `page`: 頁碼
  - `limit`: 每頁數量
  - `status`: 狀態篩選 (upcoming, ongoing, ended)
  - `organizationId`: 按組織篩選
- **成功回應** (200):
  ```json
  {
    "status": "success",
    "data": {
      "concerts": [
        {
          "id": "uuid",
          "name": "演唱會名稱",
          "artist": "藝人名稱",
          "description": "演唱會描述",
          "banner": "https://storage.url/banner.jpg",
          "venue": {
            "id": "uuid",
            "name": "場館名稱",
            "address": "場館地址"
          },
          "startDate": "2024-06-01T19:00:00Z",
          "endDate": "2024-06-01T22:00:00Z",
          "minPrice": 1000,
          "maxPrice": 5000,
          "status": "upcoming",
          "visitCount": 1234
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 10,
        "total": 50,
        "totalPages": 5
      }
    }
  }
  ```

#### 獲取單個演唱會
- **路徑**: `GET /api/v1/concerts/:concertId`
- **描述**: 獲取演唱會詳細資訊
- **需要認證**: 否
- **成功回應** (200):
  ```json
  {
    "status": "success",
    "data": {
      "id": "uuid",
      "name": "演唱會名稱",
      "artist": "藝人名稱",
      "description": "詳細描述",
      "banner": "https://storage.url/banner.jpg",
      "seatTable": "https://storage.url/seattable.jpg",
      "venue": {
        "id": "uuid",
        "name": "場館名稱",
        "address": "場館地址",
        "capacity": 10000,
        "photos": ["photo1.jpg", "photo2.jpg"]
      },
      "sessions": [
        {
          "id": "uuid",
          "date": "2024-06-01",
          "startTime": "19:00",
          "endTime": "22:00",
          "status": "available"
        }
      ],
      "ticketTypes": [
        {
          "id": "uuid",
          "name": "VIP 票",
          "price": 5000,
          "description": "VIP 座位",
          "totalQuantity": 500,
          "availableQuantity": 100
        }
      ],
      "organization": {
        "id": "uuid",
        "name": "主辦單位"
      },
      "tags": {
        "music": ["流行", "搖滾"],
        "location": ["台北", "北部"]
      }
    }
  }
  ```

#### 創建演唱會
- **路徑**: `POST /api/v1/concerts`
- **描述**: 創建新演唱會
- **需要認證**: 是 (需要組織擁有者權限)
- **請求內容**:
  ```json
  {
    "name": "演唱會名稱",
    "artist": "藝人名稱",
    "description": "演唱會描述",
    "organizationId": "uuid",
    "venueId": "uuid",
    "sessions": [
      {
        "date": "2024-06-01",
        "startTime": "19:00",
        "endTime": "22:00"
      }
    ],
    "ticketTypes": [
      {
        "name": "VIP 票",
        "price": 5000,
        "description": "VIP 座位",
        "totalQuantity": 500
      }
    ],
    "musicTags": ["流行", "搖滾"],
    "locationTags": ["台北"]
  }
  ```

#### 搜尋演唱會
- **路徑**: `GET /api/v1/concerts/search`
- **描述**: 根據關鍵字搜尋演唱會
- **需要認證**: 否
- **查詢參數**:
  - `keyword`: 搜尋關鍵字 (必需)
  - `page`: 頁碼
  - `limit`: 每頁數量

#### 獲取熱門演唱會
- **路徑**: `GET /api/v1/concerts/popular`
- **描述**: 獲取熱門演唱會列表
- **需要認證**: 否
- **查詢參數**:
  - `take`: 獲取數量 (預設: 10)

### 票務相關 API (`/api/v1/tickets`)

#### 獲取演唱會票種
- **路徑**: `GET /api/v1/tickets/types/:concertId`
- **描述**: 獲取特定演唱會的所有票種
- **需要認證**: 否

#### 創建票種
- **路徑**: `POST /api/v1/tickets/types`
- **描述**: 為演唱會創建新票種
- **需要認證**: 是 (需要組織擁有者權限)

### 訂單相關 API (`/api/v1/orders`)

#### 獲取用戶訂單
- **路徑**: `GET /api/v1/orders`
- **描述**: 獲取當前用戶的所有訂單
- **需要認證**: 是
- **查詢參數**:
  - `status`: 訂單狀態篩選 (pending, paid, cancelled)
  - `page`: 頁碼
  - `limit`: 每頁數量

#### 創建訂單
- **路徑**: `POST /api/v1/orders`
- **描述**: 創建新訂單
- **需要認證**: 是
- **請求內容**:
  ```json
  {
    "concertSessionId": "uuid",
    "items": [
      {
        "ticketTypeId": "uuid",
        "quantity": 2
      }
    ],
    "contactInfo": {
      "name": "聯絡人姓名",
      "phone": "+886912345678",
      "email": "contact@example.com"
    }
  }
  ```

#### 獲取訂單詳情
- **路徑**: `GET /api/v1/orders/:orderId`
- **描述**: 獲取特定訂單的詳細資訊
- **需要認證**: 是

### 支付相關 API (`/api/v1/payment`)

#### ECPay 結帳
- **路徑**: `POST /api/v1/payment/ecpay/checkout`
- **描述**: 啟動 ECPay 金流結帳流程
- **需要認證**: 是
- **請求內容**:
  ```json
  {
    "orderId": "uuid"
  }
  ```

#### ECPay 回調
- **路徑**: `POST /api/v1/payment/ecpay/callback`
- **描述**: ECPay 支付完成後的回調端點
- **需要認證**: 否 (由 ECPay 呼叫)

### 智能客服 API (`/api/v1/smart-reply`)

#### 發送聊天訊息
- **路徑**: `POST /api/v1/smart-reply/chat`
- **描述**: 向智能客服發送訊息
- **需要認證**: 是
- **請求內容**:
  ```json
  {
    "message": "用戶訊息",
    "sessionId": "uuid" // 可選，如果沒有則創建新對話
  }
  ```
- **成功回應** (200):
  ```json
  {
    "status": "success",
    "data": {
      "reply": "AI 回覆內容",
      "sessionId": "uuid",
      "suggestedQuestions": [
        "建議問題1",
        "建議問題2"
      ]
    }
  }
  ```

### 檔案上傳 API (`/api/v1/upload`)

#### 上傳圖片
- **路徑**: `POST /api/v1/upload/image`
- **描述**: 上傳並處理圖片檔案
- **需要認證**: 是
- **請求格式**: `multipart/form-data`
- **請求參數**:
  - `file`: 圖片檔案 (必需，最大 5MB)
  - `uploadContext`: 上傳用途 (必需)
    - `USER_AVATAR`: 用戶頭像
    - `VENUE_PHOTO`: 場地照片
    - `CONCERT_SEATTABLE`: 演唱會座位表
    - `CONCERT_BANNER`: 演唱會橫幅
  - `targetId`: 目標 ID (條件必需)
- **成功回應** (200):
  ```json
  {
    "status": "success",
    "message": "圖片上傳成功",
    "data": {
      "url": "https://storage.url/processed-image.jpg"
    }
  }
  ```

### 健康檢查 API (`/api/v1/health`)

#### 健康檢查
- **路徑**: `GET /api/v1/health`
- **描述**: 檢查服務是否正常運行
- **需要認證**: 否
- **成功回應** (200):
  ```json
  {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00Z",
    "services": {
      "database": "connected",
      "storage": "connected"
    }
  }
  ```

## HTTP 狀態碼

| 狀態碼 | 說明 |
|--------|------|
| 200 | 成功 |
| 201 | 創建成功 |
| 400 | 錯誤的請求 |
| 401 | 未認證 |
| 403 | 禁止訪問 |
| 404 | 找不到資源 |
| 409 | 衝突 (如重複的資源) |
| 422 | 無法處理的實體 (驗證錯誤) |
| 500 | 伺服器內部錯誤 |

## 速率限制

API 實施速率限制以防止濫用：

- **認證端點**: 每個 IP 每分鐘 5 次請求
- **一般端點**: 每個用戶每分鐘 60 次請求
- **檔案上傳**: 每個用戶每分鐘 10 次請求

超過限制時將返回 `429 Too Many Requests` 狀態碼。

## 分頁

支援分頁的端點使用以下查詢參數：

- `page`: 頁碼 (從 1 開始)
- `limit`: 每頁項目數 (預設 10，最大 100)

分頁回應包含 `pagination` 物件：

```json
{
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## 版本更新日誌

### v1.0.0 (2024-01-01)
- 初始版本發布
- 基本的用戶認證和管理
- 演唱會和票務系統
- 訂單和支付整合
- 智能客服功能

---

如有任何問題或需要協助，請聯繫技術支援團隊。
