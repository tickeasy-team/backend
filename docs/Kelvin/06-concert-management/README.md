# 第六章：演唱會管理系統

## 章節概述
本章節詳細介紹 Tickeasy 演唱會管理系統的核心功能，包括演唱會建立、場地管理、場次排程、搜尋功能等完整業務邏輯。

## 目錄
1. [演唱會 CRUD 操作](./01-concert-crud.md)
2. [場地管理系統](./02-venue-management.md)
3. [場次排程管理](./03-session-scheduling.md)
4. [演唱會搜尋功能](./04-concert-search.md)
5. [分類與標籤系統](./05-concert-categories.md)

## 核心實體
- **Concert**: 演唱會主體資訊
- **Venue**: 演出場地資訊
- **ConcertSession**: 演唱會場次
- **Organization**: 主辦組織

## 學習目標
完成本章節後，您將能夠：
1. 設計並實作演唱會的完整生命週期管理
2. 建立場地與演唱會的關聯關係
3. 實作場次排程與衝突檢測
4. 開發強大的演唱會搜尋功能
5. 設計分類與標籤系統

## 資料模型關係

```typescript
interface Concert {
  id: string;                 // UUID 主鍵
  title: string;              // 演唱會標題
  description: string;        // 演唱會描述
  posterImage?: string;       // 海報圖片 URL
  status: ConcertStatus;      // 演唱會狀態
  category: ConcertCategory;  // 演唱會分類
  venueId: string;           // 場地 ID (外鍵)
  organizationId: string;    // 主辦組織 ID (外鍵)
  tags: string[];            // 標籤陣列
  isFeatured: boolean;       // 是否精選
  saleStartTime?: Date;      // 售票開始時間
  saleEndTime?: Date;        // 售票結束時間
  createdAt: Date;           // 建立時間
  updatedAt: Date;           // 更新時間
  
  // 關聯關係
  venue: Venue;              // 場地資訊
  organization: Organization; // 主辦組織
  sessions: ConcertSession[]; // 演唱會場次
  ticketTypes: TicketType[];  // 票種設定
}

enum ConcertStatus {
  DRAFT = 'draft',           // 草稿
  PUBLISHED = 'published',   // 已發布
  ONGOING = 'ongoing',       // 進行中
  COMPLETED = 'completed',   // 已結束
  CANCELLED = 'cancelled'    // 已取消
}

enum ConcertCategory {
  POP = 'pop',              // 流行音樂
  ROCK = 'rock',            // 搖滾
  CLASSICAL = 'classical',   // 古典音樂
  JAZZ = 'jazz',            // 爵士樂
  ELECTRONIC = 'electronic', // 電子音樂
  FOLK = 'folk',            // 民謠
  OTHER = 'other'           // 其他
}
```

## API 端點概覽

```http
# 演唱會管理
GET    /api/v1/concerts              # 取得演唱會列表
GET    /api/v1/concerts/:id          # 取得單一演唱會
POST   /api/v1/concerts              # 建立演唱會
PUT    /api/v1/concerts/:id          # 更新演唱會
DELETE /api/v1/concerts/:id          # 刪除演唱會

# 演唱會搜尋
GET    /api/v1/concerts/search       # 搜尋演唱會
GET    /api/v1/concerts/featured     # 取得精選演唱會
GET    /api/v1/concerts/category/:category # 依分類取得演唱會

# 場次管理
POST   /api/v1/concerts/:id/sessions # 新增場次
PUT    /api/v1/concerts/:id/sessions/:sessionId # 更新場次
DELETE /api/v1/concerts/:id/sessions/:sessionId # 刪除場次

# 場地管理
GET    /api/v1/venues                # 取得場地列表
POST   /api/v1/venues                # 建立場地
PUT    /api/v1/venues/:id            # 更新場地
```

## 業務邏輯流程

### 演唱會建立流程
1. **權限檢查**: 確認用戶為主辦方或管理員
2. **資料驗證**: 驗證演唱會基本資訊
3. **場地檢查**: 確認場地存在且可用
4. **場次設定**: 建立演唱會場次
5. **票種設定**: 配置票種與價格
6. **狀態管理**: 設定為草稿狀態

### 演唱會搜尋邏輯
1. **關鍵字搜尋**: 標題、描述全文搜尋
2. **分類篩選**: 依音樂類型篩選
3. **地點篩選**: 依城市或場地篩選
4. **時間篩選**: 依演出時間範圍篩選
5. **狀態篩選**: 僅顯示已發布的演唱會
6. **排序選項**: 依時間、熱度、價格排序

## 核心特性
- ✅ 多場次演唱會支援
- ✅ 場地容量與座位配置
- ✅ 彈性的分類標籤系統
- ✅ 全文搜尋與篩選功能
- ✅ 演唱會狀態生命週期管理
- ✅ 主辦方權限控制

## 技術實作要點
- 使用 TypeORM 實體關聯
- PostgreSQL 全文搜尋功能
- Redis 快取熱門演唱會
- 圖片上傳與 CDN 整合
- 場次衝突檢測邏輯

## 相關檔案
- `models/Concert.ts` - 演唱會實體
- `models/Venue.ts` - 場地實體
- `models/ConcertSession.ts` - 場次實體
- `controllers/concertController.ts` - 演唱會控制器
- `routes/concert.ts` - 演唱會路由
- `services/concertService.ts` - 演唱會業務邏輯
