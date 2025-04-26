# Tickeasy 後端專案

這是一個使用 Express.js 和 TypeScript 構建的票務系統後端應用程式，提供一套完整的 API 服務，用於管理音樂會或活動的門票銷售與管理。

## 功能特點

- 用戶身份認證（本地和 Google OAuth 登入）
- 電子郵件驗證
- 帳號管理功能
- RESTful API 設計
- PostgreSQL 資料庫存儲
- TypeORM 物件關聯映射
- 安全性設計（Helmet 防護）
- API 參數驗證

## 技術棧

- **Node.js** + **Express**: 網頁應用框架
- **TypeScript**: 強型別的 JavaScript 超集
- **PostgreSQL**: 關聯式資料庫
- **TypeORM**: 物件關聯映射庫
- **JWT**: 使用者驗證
- **Passport.js**: 第三方身份驗證
- **Jest**: 單元測試框架

## 安裝與設定

### 先決條件

- Node.js (v14+)
- npm 或 yarn
- Docker 和 Docker Compose (推薦用於開發和部署)
- Supabase 帳號 (用於資料庫)

### 安裝步驟

1. 複製專案

   ```bash
   git clone <repository-url>
   cd tickeasy-backend
   ```

2. 安裝相依套件

   ```bash
   npm install
   ```

3. 環境變數設定
   建立 `.env` 檔案於專案根目錄，並根據您的 Supabase 和 Google OAuth 設定填寫以下變數：

   ```dotenv
   PORT=3000
   NODE_ENV=development

   # Supabase 資料庫連接資訊
   DB_HOST=aws-0-ap-northeast-1.pooler.supabase.com # 您的 Supabase 主機
   DB_PORT=5432
   DB_USERNAME=postgres # 您的 Supabase 用戶名
   DB_PASSWORD=your_supabase_password # 您的 Supabase 密碼
   DB_DATABASE=postgres # 您的 Supabase 資料庫名

   # JWT 設定
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRES_IN=7d

   # Email 設定 (根據您的郵件服務商提供)
   EMAIL_HOST=smtp.example.com
   EMAIL_PORT=587
   EMAIL_USER=your_email
   EMAIL_PASS=your_email_password

   # Google OAuth
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback # 開發時回調 URL

   # 前端 URL (用於 Google 登入成功/失敗跳轉)
   FRONTEND_URL=http://localhost:3010 # 您的前端應用程式 URL
   FRONTEND_LOGIN_FAIL_URL=http://localhost:3010/login/failed # 登入失敗跳轉 URL
   ```

4. 執行資料庫遷移 (連接到 Supabase)
   確保 `.env` 設定正確後，執行：
   ```bash
   npm run migrate
   ```
   _注意：首次運行或模型有變更時才需要執行遷移。_

## 啟動應用程式 (開發模式)

有兩種主要的開發方式：

### 方式一：使用 Docker Compose (推薦)

此方式使用 Docker 容器運行後端應用程式，但連接到您在 `.env` 中設定的外部 Supabase 資料庫。

1.  **確保 Docker Desktop 正在運行。**
2.  在專案根目錄執行：
    ```bash
    docker-compose up --build
    ```
    - `--build`：首次運行或修改 `Dockerfile` 後需要加上此參數。
    - 此命令會建立 Docker 映像、啟動容器，並使用 `nodemon` 監控程式碼變更以實現熱重載。
    - 應用程式將在 `http://localhost:3000` 上運行。

### 方式二：在本機直接運行

此方式直接使用您本地安裝的 Node.js 環境運行。

1.  確保已安裝所有相依套件 (`npm install`)。
2.  確保 `.env` 檔案已正確設定。
3.  在專案根目錄執行：
    ```bash
    npm run dev
    ```
    - 此命令同樣使用 `nodemon` 實現熱重載。
    - 應用程式將在 `http://localhost:3000` 上運行。

## 使用 Docker 部署 (生產模式)

對於生產環境部署，您可以直接使用 `Dockerfile` 建立最佳化的映像。

1.  建立生產環境用的 `.env.production` 檔案 (或使用其他環境變數管理方式)。
2.  建立 Docker 映像：
    ```bash
    docker build -t tickeasy-backend:latest .
    ```
3.  運行容器 (替換 `--env-file` 或使用其他方式注入生產環境變數):
    ```bash
    docker run -d -p 8080:3000 --env-file .env.production --name tickeasy-app tickeasy-backend:latest
    ```
    - `-d`: 在背景運行容器。
    - `-p 8080:3000`: 將主機的 8080 端口映射到容器的 3000 端口 (可依需求調整主機端口)。
    - `--name tickeasy-app`: 為容器命名。

## API 文檔

### 基礎 URL

`https://tickeasy-backend.onrender.com` 或本地 `http://localhost:3000`

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


## 專案結構

```
tickeasy-backend/
├── bin/                  # 應用程式入口點
├── config/               # 設定檔案
├── controllers/          # 業務邏輯控制器
├── middlewares/          # 中間件
├── models/               # 資料模型 (TypeORM 實體)
├── routes/               # API 路由
├── types/                # TypeScript 類型定義
├── utils/                # 工具函數
├── views/                # 視圖 (可選，用於管理介面)
├── public/               # 靜態檔案
├── app.ts                # Express 應用程式設定
├── package.json          # 相依性管理
└── tsconfig.json         # TypeScript 設定
```
