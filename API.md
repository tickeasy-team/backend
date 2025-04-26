# API

## BaseURL = `https://tickeasy-backend.onrender.com`

## 認證相關 API (前綴路徑：/api/v1/auth)

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

## 用戶相關 API (前綴路徑：/api/v1/users)

| 方法 | 路徑     | 功能             | 需要認證 |
| ---- | -------- | ---------------- | -------- |
| GET  | /profile | 獲取用戶個人資料 | 是       |
| PUT  | /profile | 更新用戶個人資料 | 是       |

這些 API 已經配備了適當的中間件和錯誤處理，包括認證檢查、參數驗證等。系統使用 JWT 進行身份驗證，並且支持 Google OAuth 第三方登入。

## API 返回格式

### 成功響應

成功的 API 調用將返回以下格式：

```json
{
  "status": "success",
  "message": "操作結果訊息",
  "data": { ... } // 選擇性的數據內容
}
```

### 錯誤響應

失敗的 API 調用將返回以下格式：

```json
{
  "status": "failed",
  "message": "錯誤描述訊息",
  "code": "錯誤碼",
  "fieldErrors": { // 選擇性的字段錯誤信息
    "字段名": {
      "code": "錯誤碼",
      "message": "字段錯誤描述"
    },
    ...
  },
  "details": "..." // 僅在開發環境中提供的詳細錯誤堆棧
}
```

## 錯誤碼說明

錯誤碼分為以下幾類：

- A\*\*: 身份認證與授權相關錯誤
- V\*\*: 數據驗證錯誤
- D\*\*: 數據相關錯誤
- S\*\*: 系統錯誤
- U\*\*: 未知錯誤

常見錯誤碼：
| 錯誤碼 | 描述 |
|--------|------|
| A01 | Email 為必填欄位 |
| A02 | 密碼為必填欄位 |
| A05 | 登入憑證無效 |
| A06 | 未授權訪問 |
| V01 | 表單驗證失敗 |
| V03 | 密碼格式不正確 |
| D01 | 資源未找到 |
| S01 | 系統錯誤 |
| S03 | 請求頻率過高 |
