# 第五章：用戶管理系統

## 章節概述
本章節詳細介紹 Tickeasy 用戶管理系統的設計與實作，包括用戶註冊、個人資料管理、郵箱驗證、密碼重設等完整功能。

## 目錄
1. [用戶註冊流程](./01-user-registration.md)
2. [個人資料管理](./02-profile-management.md)
3. [郵箱驗證系統](./03-email-verification.md)
4. [密碼重設機制](./04-password-reset.md)
5. [用戶角色系統](./05-user-roles.md)

## 核心功能
- **用戶註冊**: 本地註冊 + Google OAuth
- **資料管理**: CRUD 操作 + 頭像上傳
- **安全機制**: 密碼加密 + 郵箱驗證
- **角色權限**: RBAC (Role-Based Access Control)

## 學習目標
完成本章節後，您將能夠：
1. 實作完整的用戶註冊與登入流程
2. 設計安全的密碼管理機制
3. 整合郵箱驗證功能
4. 建立基於角色的權限控制系統
5. 處理用戶個人資料的 CRUD 操作

## 用戶資料模型

```typescript
interface User {
  id: string;           // UUID 主鍵
  name: string;         // 用戶姓名
  email: string;        // 電子郵件 (唯一)
  passwordHash?: string; // 密碼雜湊 (OAuth 用戶可能為空)
  phone?: string;       // 電話號碼
  birthday?: Date;      // 生日
  avatar?: string;      // 頭像 URL
  googleId?: string;    // Google OAuth ID
  isEmailVerified: boolean; // 郵箱驗證狀態
  role: UserRole;       // 用戶角色
  createdAt: Date;      // 建立時間
  updatedAt: Date;      // 更新時間
}

enum UserRole {
  USER = 'user',
  ORGANIZER = 'organizer',
  ADMIN = 'admin'
}
```

## API 端點概覽

```http
# 用戶資料管理
GET    /api/v1/users/profile      # 取得用戶資料
PUT    /api/v1/users/profile      # 更新用戶資料
POST   /api/v1/users/avatar       # 上傳頭像
DELETE /api/v1/users/account      # 刪除帳號

# 密碼管理
POST   /api/v1/users/change-password    # 修改密碼
POST   /api/v1/users/forgot-password    # 忘記密碼
POST   /api/v1/users/reset-password     # 重設密碼

# 郵箱驗證
POST   /api/v1/users/send-verification  # 發送驗證郵件
POST   /api/v1/users/verify-email       # 驗證郵箱
```

## 安全特性
- ✅ bcrypt 密碼雜湊 (12 rounds)
- ✅ JWT 令牌認證
- ✅ 郵箱驗證機制
- ✅ 密碼強度檢查
- ✅ 防止暴力破解
- ✅ 個人資料加密

## 業務流程
1. **註冊流程**: 資料驗證 → 密碼加密 → 發送驗證郵件
2. **登入流程**: 身份驗證 → 產生 JWT → 回傳用戶資料
3. **資料更新**: 權限檢查 → 資料驗證 → 更新資料庫
4. **密碼重設**: 驗證身份 → 發送重設連結 → 更新密碼

## 相關檔案
- `models/User.ts` - 用戶實體模型
- `controllers/userController.ts` - 用戶控制器
- `routes/user.ts` - 用戶路由
- `services/userService.ts` - 用戶業務邏輯
- `middlewares/auth.ts` - 認證中間件
