# 1.1 專案架構規劃

## 需求分析

### 功能需求
Tickeasy 是一個完整的票務管理系統，需要支援以下核心功能：

1. **用戶管理系統**
   - 用戶註冊與登入
   - Google OAuth 第三方登入
   - 用戶資料管理
   - 電子郵件驗證

2. **演唱會管理**
   - 演唱會建立與編輯
   - 演唱會場次管理
   - 演唱會審核流程
   - 演唱會搜尋與篩選

3. **票務系統**
   - 票種定義與配置
   - 庫存管理
   - 座位配置
   - 價格策略

4. **訂單與支付**
   - 購票流程
   - 訂單管理
   - 支付閘道整合
   - 訂單確認通知

5. **組織管理**
   - 主辦方管理
   - 權限控制

6. **智能客服**
   - AI 自動回覆
   - 知識庫管理
   - 語義搜尋

### 非功能需求
- **效能**：支援高併發購票場景
- **安全性**：用戶資料與支付資訊保護
- **可擴展性**：模組化設計，便於功能擴充
- **可維護性**：清晰的程式碼結構與文件

## 技術棧選型

### 後端技術棧
```
Node.js + Express.js
├── 語言：TypeScript
├── 資料庫：PostgreSQL (Supabase)
├── ORM：TypeORM
├── 身份驗證：JWT + Passport.js
├── 測試：Jest
├── 部署：Docker
└── AI：OpenAI API
```

### 選型理由

#### Node.js + Express.js
- ✅ JavaScript 生態系統豐富
- ✅ 非阻塞 I/O，適合高併發場景
- ✅ 團隊熟悉度高
- ✅ 社群支援完善

#### TypeScript
- ✅ 靜態型別檢查，減少執行時錯誤
- ✅ 更好的 IDE 支援與智能提示
- ✅ 大型專案維護性佳
- ✅ 與 JavaScript 完全相容

#### PostgreSQL + Supabase
- ✅ ACID 特性，資料一致性保證
- ✅ 複雜查詢支援
- ✅ Supabase 提供完整的 BaaS 服務
- ✅ 即時訂閱功能

#### TypeORM
- ✅ TypeScript 原生支援
- ✅ 裝飾器語法，程式碼簡潔
- ✅ 自動遷移功能
- ✅ 關聯查詢支援

## 專案結構設計

```
tickeasy-team-backend/
├── bin/                    # 應用程式入口點
│   └── server.ts          # 伺服器啟動檔案
├── config/                # 設定檔案
│   ├── database.ts        # 資料庫設定
│   └── passport.ts        # 身份驗證設定
├── controllers/           # 控制器層 (業務邏輯)
│   ├── auth.ts           # 身份驗證控制器
│   ├── user.ts           # 用戶管理控制器
│   ├── concert.ts        # 演唱會管理控制器
│   └── ...
├── middlewares/          # 中間件
│   ├── auth.ts           # 身份驗證中間件
│   └── upload.ts         # 檔案上傳中間件
├── models/               # 資料模型 (TypeORM 實體)
│   ├── user.ts           # 用戶實體
│   ├── concert.ts        # 演唱會實體
│   └── ...
├── routes/               # 路由層
│   ├── auth.ts           # 身份驗證路由
│   ├── user.ts           # 用戶管理路由
│   └── ...
├── services/             # 服務層 (業務邏輯)
│   ├── openaiService.ts  # OpenAI 服務
│   ├── emailService.ts   # 郵件服務
│   └── ...
├── types/                # TypeScript 型別定義
├── utils/                # 工具函數
│   ├── apiError.ts       # 錯誤處理
│   └── email.ts          # 郵件工具
├── app.ts                # Express 應用程式設定
├── package.json          # 依賴管理
├── tsconfig.json         # TypeScript 設定
├── Dockerfile            # Docker 設定
└── docker-compose.yml    # Docker Compose 設定
```

## 架構模式

### MVC 架構
採用經典的 MVC (Model-View-Controller) 架構模式：

- **Model (模型層)**：TypeORM 實體，負責資料結構定義
- **View (視圖層)**：RESTful API 回應格式
- **Controller (控制器層)**：業務邏輯處理

### 三層架構
```
Routes (路由層)
    ↓
Controllers (控制器層)
    ↓
Services (服務層)
    ↓
Models (資料層)
```

### 依賴注入
使用 TypeScript 裝飾器實現簡單的依賴注入，提高程式碼的可測試性。

## 開發規範

### 檔案命名規範
- 資料夾：kebab-case (例：`user-management`)
- 檔案：kebab-case (例：`user-controller.ts`)
- 類別：PascalCase (例：`UserController`)
- 函數/變數：camelCase (例：`getUserById`)

### API 設計規範
- RESTful API 設計原則
- 統一的回應格式
- HTTP 狀態碼標準化
- API 版本控制 (`/api/v1/`)

### Git 工作流程
採用 Git Flow 工作流程：
- `main`：生產環境分支
- `develop`：開發環境分支
- `feature/*`：功能開發分支
- `release/*`：版本發布分支
- `hotfix/*`：緊急修復分支

## 專案里程碑

### Phase 1：基礎架構 (週 1-2)
- [x] 專案初始化
- [x] 資料庫設計
- [x] 核心框架搭建
- [x] 身份驗證系統

### Phase 2：核心功能 (週 3-6)
- [x] 用戶管理系統
- [x] 演唱會管理系統
- [x] 票務系統
- [x] 訂單與支付系統

### Phase 3：進階功能 (週 7-8)
- [x] 檔案上傳處理
- [x] AI 智能客服
- [x] 排程任務系統

### Phase 4：測試與部署 (週 9-10)
- [x] 單元測試與整合測試
- [x] Docker 容器化
- [x] 生產環境部署
- [x] 監控與維護 