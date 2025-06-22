# Tickeasy 票務管理系統後端

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen" alt="Node Version">
  <img src="https://img.shields.io/badge/typescript-5.8.3-blue" alt="TypeScript Version">
  <img src="https://img.shields.io/badge/express-4.18.2-yellow" alt="Express Version">
  <img src="https://img.shields.io/badge/license-ISC-green" alt="License">
</p>

這是一個使用 Express.js 和 TypeScript 構建的現代化票務管理系統後端，專為音樂會、演唱會等活動的票務銷售與管理而設計。系統整合了多種先進技術，提供完整的票務解決方案。

## 📋 目錄

- [核心功能](#核心功能)
- [技術架構](#技術架構)
- [快速開始](#快速開始)
- [API 文檔](#api-文檔)
- [資料庫架構](#資料庫架構)
- [開發指南](#開發指南)
- [測試](#測試)
- [部署](#部署)
- [常見問題](#常見問題)
- [貢獻指南](#貢獻指南)

## 🚀 核心功能

### 使用者管理
- **多重身份認證**：支援本地註冊和 Google OAuth 2.0 登入
- **電子郵件驗證**：註冊後自動發送驗證郵件
- **密碼管理**：支援密碼重設功能
- **個人資料管理**：使用者可更新個人資訊和頭像

### 組織管理
- **多組織支援**：單一使用者可管理多個組織
- **權限控制**：組織層級的權限管理
- **組織資訊維護**：包含組織詳情、聯絡資訊等

### 演唱會管理
- **完整演唱會資訊**：包含基本資訊、場地、時間、票價等
- **場次管理**：支援多場次演唱會
- **座位圖管理**：上傳和管理座位配置圖
- **熱門推薦**：基於瀏覽量的熱門演唱會推薦
- **搜尋功能**：支援關鍵字搜尋演唱會

### 票務系統
- **多票種支援**：不同價位和類型的票券設定
- **庫存管理**：即時票券庫存追蹤
- **票券狀態**：已售出、可用、保留等狀態管理

### 訂單與支付
- **訂單管理**：完整的訂單生命週期管理
- **金流整合**：整合 ECPay 綠界金流
- **訂單追蹤**：即時訂單狀態更新

### 智能客服系統
- **AI 智能回覆**：整合 OpenAI API 提供智能客服
- **知識庫管理**：可維護的 FAQ 知識庫
- **對話管理**：客服對話記錄與追蹤

### 其他功能
- **圖片處理**：使用 Sharp 進行圖片優化和處理
- **檔案上傳**：整合 Supabase Storage 進行檔案管理
- **排程任務**：使用 node-schedule 處理定時任務
- **郵件服務**：使用 Nodemailer 發送系統郵件

## 🛠 技術架構

### 核心框架
- **Node.js** (v14+) - JavaScript 執行環境
- **Express.js** (v4.18.2) - Web 應用框架
- **TypeScript** (v5.8.3) - 強型別的 JavaScript 超集

### 資料庫與 ORM
- **PostgreSQL** - 關聯式資料庫
- **TypeORM** (v0.3.23) - 物件關聯映射
- **Supabase** - 後端即服務平台

### 認證與安全
- **JWT** - JSON Web Token 認證
- **Passport.js** - 認證中間件
- **bcrypt** - 密碼加密
- **Helmet** - 安全標頭設定
- **CORS** - 跨域資源共享

### 第三方整合
- **Google OAuth 2.0** - Google 登入
- **ECPay** - 綠界金流
- **OpenAI API** - AI 智能回覆
- **Nodemailer** - 郵件服務

### 開發工具
- **ESLint** - 程式碼檢查
- **Jest** - 單元測試框架
- **tsx** - TypeScript 執行器
- **Docker** - 容器化部署

## 🚀 快速開始

### 先決條件

確保您的系統已安裝：
- Node.js (v14 或更高版本)
- npm 或 yarn
- Docker 和 Docker Compose (推薦用於開發和部署)
- Supabase 帳號

### 安裝步驟

1. **複製專案**
   ```bash
   git clone <repository-url>
   cd Tickeasy_backend_team
   ```

2. **安裝相依套件**
   ```bash
   npm install
   ```

3. **環境變數設定**
   
   複製範例檔案並修改設定：
   ```bash
   cp .env.example .env
   ```

   編輯 `.env` 檔案，填入以下必要設定：

   ```dotenv
   # 應用程式設定
   PORT=3000
   NODE_ENV=development
   
   # Supabase 資料庫連接
   DB_HOST=your-supabase-host.supabase.com
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=your_supabase_password
   DB_DATABASE=postgres
   
   # JWT 設定
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRES_IN=7d
   
   # Email 設定 (Nodemailer)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   
   # Google OAuth 2.0
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback
   
   # 前端 URL
   FRONTEND_URL=http://localhost:3010
   FRONTEND_LOGIN_FAIL_URL=http://localhost:3010/login/failed
   
   # Supabase Storage
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # ECPay 金流設定
   ECPAY_MERCHANT_ID=your_merchant_id
   ECPAY_HASH_KEY=your_hash_key
   ECPAY_HASH_IV=your_hash_iv
   
   # OpenAI API (選用)
   OPENAI_API_KEY=your_openai_api_key
   ```

4. **資料庫遷移**
   ```bash
   npm run migrate
   ```

5. **初始化知識庫 (選用)**
   ```bash
   npm run init:knowledge-base
   ```

## 🎯 開發模式

### 使用 Docker Compose (推薦)

1. 確保 Docker Desktop 正在運行
2. 啟動服務：
   ```bash
   docker-compose up --build
   ```
3. 應用程式將在 `http://localhost:3000` 運行

### 本地開發

1. 啟動開發伺服器：
   ```bash
   npm run dev
   ```
2. 應用程式將在 `http://localhost:3000` 運行，並支援熱重載

## 📚 API 文檔

完整的 API 文檔請參考 [API.md](./API.md)

### API 端點概覽

#### 認證相關 (`/api/v1/auth`)
- `POST /register` - 用戶註冊
- `POST /login` - 用戶登入
- `POST /verify-email` - 驗證電子郵件
- `POST /resend-verification` - 重新發送驗證郵件
- `POST /request-password-reset` - 請求重設密碼
- `POST /reset-password` - 重設密碼
- `GET /google` - Google OAuth 登入

#### 用戶管理 (`/api/v1/users`)
- `GET /profile` - 獲取用戶資料
- `PUT /profile` - 更新用戶資料

#### 組織管理 (`/api/v1/organizations`)
- `GET /` - 獲取用戶的所有組織
- `GET /:organizationId` - 獲取單個組織
- `POST /` - 創建組織
- `PUT /:organizationId` - 更新組織
- `DELETE /:organizationId` - 刪除組織

#### 演唱會管理 (`/api/v1/concerts`)
- `GET /` - 獲取演唱會列表
- `GET /:concertId` - 獲取單個演唱會
- `POST /` - 創建演唱會
- `PUT /:concertId` - 更新演唱會
- `GET /banners` - 獲取演唱會橫幅
- `GET /popular` - 獲取熱門演唱會
- `GET /search` - 搜尋演唱會
- `GET /venues` - 獲取場館列表

#### 票務管理 (`/api/v1/tickets`)
- `GET /types/:concertId` - 獲取演唱會票種
- `POST /types` - 創建票種
- `PUT /types/:ticketTypeId` - 更新票種

#### 訂單管理 (`/api/v1/orders`)
- `GET /` - 獲取用戶訂單
- `GET /:orderId` - 獲取訂單詳情
- `POST /` - 創建訂單
- `PUT /:orderId/status` - 更新訂單狀態

#### 支付 (`/api/v1/payment`)
- `POST /ecpay/checkout` - ECPay 結帳
- `POST /ecpay/callback` - ECPay 回調

#### 智能客服 (`/api/v1/smart-reply`)
- `POST /chat` - 發送聊天訊息
- `GET /sessions` - 獲取對話列表

#### 檔案上傳 (`/api/v1/upload`)
- `POST /image` - 上傳圖片

## 🗄 資料庫架構

### 主要資料表

#### users - 使用者
- 基本資訊 (姓名、email、密碼)
- Google OAuth 資訊
- 電子郵件驗證狀態
- 個人資料圖片

#### organizations - 組織
- 組織基本資訊
- 聯絡資訊
- 與使用者的關聯

#### concerts - 演唱會
- 演唱會詳細資訊
- 場地資訊
- 時間安排
- 圖片資源
- 熱門度追蹤

#### concert_sessions - 演唱會場次
- 場次時間
- 場地資訊
- 票券配置

#### ticket_types - 票種
- 票種名稱和描述
- 價格設定
- 庫存數量
- 銷售狀態

#### orders - 訂單
- 訂單資訊
- 付款狀態
- 訂單項目

#### tickets - 票券
- 票券狀態
- QR Code
- 使用記錄

### 資料關聯
- 使用者可擁有多個組織
- 組織可舉辦多場演唱會
- 演唱會可有多個場次
- 場次包含多種票種
- 訂單包含多張票券

## 🔧 開發指南

### 專案結構

```
tickeasy-backend/
├── bin/                    # 應用程式入口點
│   └── server.ts          # 伺服器啟動檔案
├── config/                 # 設定檔案
│   ├── database.ts        # 資料庫設定
│   └── auth.ts            # 認證設定
├── controllers/            # 控制器 (業務邏輯)
│   ├── auth.ts           # 認證控制器
│   ├── concert.ts         # 演唱會控制器
│   └── ...
├── middlewares/            # 中間件
│   ├── auth.ts           # 認證中間件
│   ├── error.ts          # 錯誤處理
│   └── validation.ts     # 資料驗證
├── models/                 # 資料模型 (TypeORM 實體)
│   ├── user.ts           # 使用者模型
│   ├── concert.ts        # 演唱會模型
│   └── ...
├── routes/                 # API 路由定義
│   ├── auth.ts           # 認證路由
│   ├── concert.ts        # 演唱會路由
│   └── ...
├── services/               # 服務層
│   ├── email.ts          # 郵件服務
│   ├── payment.ts        # 支付服務
│   └── ...
├── types/                  # TypeScript 類型定義
├── utils/                  # 工具函數
├── views/                  # 視圖模板
├── app.ts                  # Express 應用程式設定
└── package.json           # 專案設定
```

### 開發規範

#### Git 工作流程
請參考 [GitFlow.md](./GitFlow.md) 了解詳細的 Git 分支策略和協作流程。

#### 程式碼風格
- 使用 ESLint 進行程式碼檢查
- 執行 `npm run lint` 檢查程式碼
- 執行 `npm run lint:fix` 自動修正問題

#### TypeScript 最佳實踐
- 使用明確的類型定義
- 避免使用 `any` 類型
- 利用介面定義資料結構
- 使用列舉定義常數

#### API 設計原則
- 遵循 RESTful 設計規範
- 使用適當的 HTTP 狀態碼
- 統一的錯誤回應格式
- 版本化 API 路徑 (`/api/v1/`)

## 🧪 測試

### 執行測試
```bash
npm test
```

### 測試覆蓋率
```bash
npm run test:coverage
```

### 測試結構
- 單元測試：測試個別函數和模組
- 整合測試：測試 API 端點
- E2E 測試：測試完整的使用流程

## 🚀 部署

### 使用 Docker 部署

1. **建立生產環境映像**
   ```bash
   docker build -t tickeasy-backend:latest .
   ```

2. **執行容器**
   ```bash
   docker run -d \
     -p 8080:3000 \
     --env-file .env.production \
     --name tickeasy-backend \
     tickeasy-backend:latest
   ```

### 部署到雲端平台

#### Render
1. 連接 GitHub 儲存庫
2. 設定環境變數
3. 部署命令：`npm run build && npm start`

#### 其他平台
- Heroku
- Google Cloud Run
- AWS ECS
- Azure Container Instances

### 生產環境檢查清單
- [ ] 設定生產環境變數
- [ ] 啟用 HTTPS
- [ ] 設定資料庫備份
- [ ] 配置日誌記錄
- [ ] 設定監控和警報
- [ ] 壓力測試
- [ ] 安全性掃描

## ❓ 常見問題

### Q: 如何處理 CORS 錯誤？
A: 確保在 `.env` 中正確設定 `FRONTEND_URL`，並檢查 CORS 中間件設定。

### Q: 資料庫連接失敗怎麼辦？
A: 檢查 Supabase 連接字串是否正確，確認網路連接正常。

### Q: 如何新增 API 端點？
A: 1. 在 `routes/` 建立路由檔案
   2. 在 `controllers/` 實作業務邏輯
   3. 在 `app.ts` 註冊路由

### Q: 如何除錯應用程式？
A: 使用 VS Code 的除錯功能，或在程式碼中加入 `console.log`。

## 🤝 貢獻指南

我們歡迎所有形式的貢獻！請遵循以下步驟：

1. Fork 專案
2. 建立功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

### 貢獻準則
- 遵循現有的程式碼風格
- 為新功能撰寫測試
- 更新相關文檔
- 確保所有測試通過

## 📝 授權

本專案採用 ISC 授權條款 - 詳見 [LICENSE](LICENSE) 檔案

## 📞 聯絡資訊

- 專案維護者：Tickeasy Backend Team
- Email：support@tickeasy.com
- 問題回報：[GitHub Issues](https://github.com/your-repo/issues)

---

<p align="center">Made with ❤️ by Tickeasy Team</p>