# API 文檔

## Base URL

`https://tickeasy-team-backend.onrender.com` 或本地 `http://localhost:3000`

### 認證相關 API (前綴路徑：/api/v1/auth)

| 方法 | 路徑                    | 功能                 | 需要認證 |
| ---- | ----------------------- | -------------------- | -------- |
| POST | /register               | 用戶註冊             | 否       |
| POST | /login                  | 用戶登入             | 否       |
| POST | /verify-email           | 驗證電子郵件         | 否       |
| POST | /resend-verification    | 重新發送驗證郵件     | 否       |
| POST | /request-password-reset | 請求重設密碼         | 否       |
| POST | /reset-password         | 重設密碼             | 否       |
| GET  | /google                 | Google 登入（OAuth） | 否       |

- Google 登入前端重定向`https://frontend-fj47.onrender.com/callback`

### 用戶相關 API (前綴路徑：/api/v1/users)

| 方法 | 路徑     | 功能             | 需要認證 |
| ---- | -------- | ---------------- | -------- |
| GET  | /profile | 獲取用戶個人資料 | 是       |
| PUT  | /profile | 更新用戶個人資料 | 是       |

### 組織相關 API (前綴路徑：/api/v1/organizations)

| 方法   | 路徑             | 功能                   | 需要認證 |
| ------ | ---------------- | ---------------------- | -------- |
| GET    | /                | 獲取用戶擁有的所有組織 | 是       |
| GET    | /:organizationId | 獲取單個組織           | 是       |
| POST   | /                | 創建組織               | 是       |
| PUT    | /:organizationId | 更新組織               | 是       |
| DELETE | /:organizationId | 刪除組織               | 是       |

### 圖片上傳 API (前綴路徑：/api/v1/upload)

| 方法 | 路徑   | 功能           | 需要認證 |
| ---- | ------ | -------------- | -------- |
| POST | /image | 上傳並處理圖片 | 是       |


### 演唱會相關 API (前綴路徑：/api/v1/concerts)

| 方法   | 路徑                         | 功能               | 需要認證 |
| ------ | ---------------------------- | ------------------ | -------- |
| POST   | /                            | 建立演唱會         | 是       |
| PUT    | /:concertId                  | 更新演唱會         | 是       |
| GET    | /:concertId                  | 取得單一演唱會     | 否       |
| GET    | /banners                     | 取得演唱會圖片     | 否       |
| PATCH  | /:concertId/promotion        | 設定 promotion 權重 | 否       |
| PATCH  | /:concertId/visit            | 增加 visitCount    | 否       |
| GET    | /popular?take={數量}         | 取得熱門演唱會     | 否       |
| GET    | /venues                      | 取得場館資訊       | 否       |
| GET    | /search?keyword={關鍵字}     | 搜尋演唱會         | 否       |






**POST /image 詳細說明:**

- **功能：** 上傳圖片檔案（用戶頭像、場地照片、音樂會圖片等），進行優化處理後存儲至 Supabase。
- **請求格式：** `multipart/form-data`
- **標頭：**
  - `Authorization: Bearer {token}`
- **請求內容 (Form Data):**
  - `file`: (檔案) **必需**。支援 `image/jpeg`, `image/png`, `image/gif`, `image/webp` 格式，最大 5MB。
  - `uploadContext`: (字串) **必需**。指定圖片用途，必須是以下其中一個值：
    - `'USER_AVATAR'` (使用者頭像)
    - `'VENUE_PHOTO'` (場地照片)
    - `'CONCERT_SEATTABLE'` (音樂會座位表)
    - `'CONCERT_BANNER'` (音樂會橫幅)
  - `targetId`: (字串) **條件必需**。關聯目標的 ID (例如場地 ID、音樂會 ID)。
    - 當 `uploadContext` 為 `'USER_AVATAR'` 時 **不需要** 提供此欄位 (會使用 token 中的用戶 ID)。
    - 當 `uploadContext` 為其他值時 **必需** 提供此欄位。
- **成功回應 (Status Code: 200):**
  ```json
  {
    "status": "success",
    "message": "圖片上傳成功",
    "data": {
      "url": "圖片的公開存取 URL"
    }
  }
  ```
- **主要錯誤回應 (Status Code):**
  - `400 Bad Request`: 請求參數錯誤（缺少檔案、檔案類型/大小不符、缺少必要欄位、`uploadContext` 或 `targetId` 無效）。
  - `401 Unauthorized`: 未提供有效 Token 或 Token 過期。
  - `403 Forbidden`: (保留，未來可能用於更細緻的權限控制)。
  - `404 Not Found`: 提供的 `targetId` 找不到對應的資源（例如找不到用戶、場地或音樂會）。
  - `500 Internal Server Error`: 伺服器內部錯誤（圖片處理失敗、儲存失敗、資料庫更新失敗等）。


