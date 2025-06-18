# 🚀 Supabase MCP Server 設置指南

## 📋 **目前進度**
✅ MCP 配置檔案已建立 (`.cursor/mcp.json`)  
✅ 環境變數已設置  
✅ 測試腳本已建立 (`test-mcp.js`)  
⏳ **待完成**: 取得 Supabase Personal Access Token  

---

## 🔑 **第一步：取得 Supabase Personal Access Token**

### 1. 前往 Supabase Dashboard
- 開啟 [https://supabase.com/dashboard](https://supabase.com/dashboard)
- 登入您的帳號

### 2. 生成 Personal Access Token
1. 點擊右上角的 **頭像**
2. 選擇 **Access Tokens**
3. 點擊 **Generate new token**
4. 輸入名稱：`Tickeasy MCP Server`
5. **複製生成的 token**（請妥善保存！）

### 3. 更新環境變數
將剛才複製的 token 貼到 `.env` 檔案中：
```bash
SUPABASE_ACCESS_TOKEN=sbp_your_actual_token_here
```

---

## 🧪 **第二步：測試 MCP 連接**

### 執行測試腳本
```bash
node test-mcp.js
```

### 預期結果
- ✅ **成功**: 看到 "MCP 連接測試成功!" 
- ✅ **工具列表**: 顯示可用的 Supabase 工具
- ❌ **失敗**: 檢查 token 是否正確設置

---

## 🔧 **第三步：在 Cursor 中啟用 MCP**

### 如果您使用 Cursor IDE:
1. 重啟 Cursor
2. 開啟 **Settings** > **Features** > **Model Context Protocol**
3. 確認看到 "supabase" server 狀態為 **綠色**
4. 在 Cursor Chat 中測試：詢問關於您的 Supabase 資料庫

### 測試指令範例
```
請告訴我 supportSession 表格的結構？
```

---

## 📊 **可用的 MCP 工具**

一旦設置成功，AI 將可以：

### 🔍 **資料庫查詢**
- 查看表格結構
- 執行 SQL 查詢（只讀模式）
- 獲取統計資料

### 📋 **專案管理**
- 列出專案資訊
- 查看 API 設定
- 監控使用情況

### 🛡️ **安全設置**
- **只讀模式**: 防止意外修改資料
- **專案範圍**: 限制在當前專案
- **Token 認證**: 安全的身份驗證

---

## 🆘 **常見問題解決**

### ❌ "無法連接 MCP Server"
1. 檢查 `SUPABASE_ACCESS_TOKEN` 是否正確
2. 確認網路連接正常
3. 重新生成 Personal Access Token

### ❌ "權限不足"
1. 確認您是 Supabase 專案的 Owner 或 Admin
2. 檢查 token 權限範圍

### ❌ "工具無法使用"
1. 確認使用 `--read-only` 模式
2. 重啟 Cursor
3. 查看 MCP Server 日誌

---

## 🎯 **下一步**

設置完成後，我們將進行：
1. ✅ MCP Server 連接 ← **目前這步**
2. 🤖 建立基本 OpenAI 對話功能
3. 🔍 整合知識庫語義搜尋
4. 📊 添加會話管理功能
5. 👨‍💼 實作機器人轉人工流程

---

## 📞 **需要協助？**

設置過程中遇到問題，請提供：
1. 錯誤訊息截圖
2. `test-mcp.js` 的輸出結果
3. 您的 Supabase 專案設定狀態

讓我知道設置結果，我們就可以繼續下一步！🚀