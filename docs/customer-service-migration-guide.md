# 客服系統統一化遷移指南

## 概述

此次更新將原本的雙軌客服系統（`openai-service` + `smart-customer-service`）統一為單一的 `unified-customer-service`，解決了架構重複、權限不一致等問題。

## 主要變更

### 1. 新增統一客服服務

- **檔案**: `services/unified-customer-service.ts`
- **功能**: 整合 AI 問答與會話管理
- **特點**: 支援匿名用戶與登入用戶

### 2. 權限中介軟體更新

- **檔案**: `middlewares/auth.ts`
- **新增**: `optionalAuth` - 彈性認證中介軟體
- **新增**: `checkSessionAccess` - 會話權限檢查

### 3. Controller 更新

- **SupportController**: 使用統一服務處理會話管理
- **SmartCustomerController**: 使用統一服務處理即時問答

### 4. 路由更新

- **support.ts**: 支援匿名用戶訪問
- **ai-customer-service.ts**: 保持原有 API 不變

## 環境變數配置

在 `.env` 檔案中添加以下配置：

```env
# OpenAI 配置
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# 客服系統配置（可選）
CUSTOMER_SERVICE_DEFAULT_CONFIDENCE_THRESHOLD=0.6
CUSTOMER_SERVICE_AUTO_TRANSFER_THRESHOLD=0.4
CUSTOMER_SERVICE_SESSION_TIMEOUT_MINUTES=30
```

## API 變更

### Support API (`/api/v1/support/*`)

#### 變更前

- 所有端點都需要認證
- 匿名用戶無法使用

#### 變更後

- 支援匿名用戶
- 使用 `optionalAuth` 中介軟體
- 會話權限自動檢查

#### 範例使用

```javascript
// 匿名用戶開始會話
const response = await fetch("/api/v1/support/chat/start", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    category: "購票問題",
    initialMessage: "如何購買演唱會門票？",
  }),
});

// 登入用戶開始會話
const response = await fetch("/api/v1/support/chat/start", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer " + token,
  },
  body: JSON.stringify({
    userId: "user-uuid",
    category: "購票問題",
    initialMessage: "如何購買演唱會門票？",
  }),
});
```

### AI Customer Service API (`/api/v1/ai-customer-service/*`)

#### 變更

- 後端使用統一服務
- API 介面保持不變
- 回應格式不變

## 資料庫變更

無需執行資料庫遷移，現有的 `SupportSession` 和 `SupportMessage` 模型保持不變。

## 測試

### 1. 匿名客服測試

```bash
# 測試匿名用戶開始會話
curl -X POST http://localhost:3000/api/v1/support/chat/start \
  -H "Content-Type: application/json" \
  -d '{
    "category": "測試",
    "initialMessage": "你好"
  }'

# 測試發送訊息
curl -X POST http://localhost:3000/api/v1/support/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session-uuid",
    "message": "我需要幫助"
  }'
```

### 2. 登入用戶測試

```bash
# 測試登入用戶會話
curl -X POST http://localhost:3000/api/v1/support/chat/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "userId": "user-uuid",
    "category": "購票問題",
    "initialMessage": "如何購買門票？"
  }'
```

### 3. AI 客服測試

```bash
# 測試 AI 即時問答
curl -X POST http://localhost:3000/api/v1/ai-customer-service/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "支援哪些付款方式？",
    "history": []
  }'
```

## 故障排除

### 1. OpenAI API 錯誤

- 檢查 `OPENAI_API_KEY` 是否正確設定
- 確認 API 配額是否足夠

### 2. 會話權限錯誤

- 確認 `sessionId` 是否正確
- 檢查用戶是否有權限訪問該會話

### 3. 匿名用戶功能異常

- 確認路由使用 `optionalAuth` 而非 `isAuthenticated`
- 檢查 controller 中的 `userId` 處理邏輯

## 效能優化建議

### 1. 快取策略

- 對常見問題啟用快取
- 快取知識庫搜尋結果

### 2. 資料庫優化

- 為 `SupportSession.userId` 和 `status` 添加索引
- 定期清理過期會話

### 3. 監控指標

- AI 回覆信心度分佈
- 人工轉接率
- 會話完成率
- 用戶滿意度

## 向後相容性

- 現有的 API 端點保持不變
- 資料庫結構無變更
- 舊的客戶端代碼無需修改

## 未來改進

1. **智能路由**: 根據問題類型自動選擇最佳處理方式
2. **多語言支援**: 支援多種語言的客服對話
3. **語音客服**: 整合語音識別和合成
4. **客服分析**: 提供詳細的客服效能分析報告
