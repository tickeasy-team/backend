# 第三章：核心框架設計

## 章節概述
本章節深入探討 Tickeasy 後端系統的核心框架設計，包括 Express.js 應用程式架構、中間件配置、路由設計、錯誤處理機制等關鍵技術實作。

## 目錄
1. [Express 應用程式設定](./01-express-setup.md)
2. [中間件配置](./02-middleware-configuration.md)
3. [路由架構設計](./03-routing-architecture.md)
4. [錯誤處理機制](./04-error-handling.md)
5. [MVC 模式實作](./05-mvc-pattern.md)

## 核心技術
- **框架**: Express.js 4.18+
- **語言**: TypeScript 5.8+
- **中間件**: Helmet, CORS, Morgan
- **架構模式**: MVC (Model-View-Controller)

## 學習目標
完成本章節後，您將能夠：
1. 理解 Express.js 應用程式的完整設定流程
2. 掌握中間件的執行順序和配置技巧
3. 設計可維護的路由架構
4. 實作完善的錯誤處理機制
5. 應用 MVC 模式組織程式碼結構

## 架構概覽

```typescript
app.ts (主應用程式)
├── 中間件配置
│   ├── 安全性中間件 (Helmet, CORS)
│   ├── 日誌中間件 (Morgan)
│   ├── 解析中間件 (express.json, urlencoded)
│   └── 認證中間件 (Passport)
├── 路由設定
│   ├── /api/v1/auth (認證路由)
│   ├── /api/v1/users (用戶路由)
│   ├── /api/v1/concerts (演唱會路由)
│   ├── /api/v1/tickets (票務路由)
│   └── /api/v1/orders (訂單路由)
└── 錯誤處理
    ├── 404 處理器
    ├── 全域錯誤處理器
    └── 開發/生產環境錯誤回應
```

## 關鍵特性
- ✅ 模組化路由設計
- ✅ 統一錯誤處理機制
- ✅ 中間件管道架構
- ✅ TypeScript 型別安全
- ✅ 開發與生產環境分離

## 相關檔案
- `app.ts` - 主應用程式入口
- `routes/` - 路由模組目錄
- `controllers/` - 控制器目錄
- `middlewares/` - 自定義中間件目錄
