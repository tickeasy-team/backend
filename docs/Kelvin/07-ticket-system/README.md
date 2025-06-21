# 第七章：票務系統核心

## 章節概述
本章節深入探討 Tickeasy 票務系統的核心邏輯，包括票種設定、座位管理、庫存控制、票券預訂和驗證機制等關鍵功能。

## 目錄
1. [票種設定與管理](./01-ticket-types.md)
2. [座位管理系統](./02-seat-management.md)
3. [庫存控制機制](./03-inventory-control.md)
4. [票券預訂系統](./04-reservation-system.md)
5. [票券驗證機制](./05-ticket-validation.md)

## 核心實體
- **TicketType**: 票種定義 (價格、數量、限制)
- **Ticket**: 個別票券 (座位、狀態、訂單)
- **Reservation**: 票券預訂 (暫時鎖定)

## 學習目標
完成本章節後，您將能夠：
1. 設計彈性的票種設定系統
2. 實作座位選擇與分配邏輯
3. 建立安全的庫存控制機制
4. 開發票券預訂與釋放流程
5. 實作票券驗證與防偽機制

## 票務資料模型

```typescript
interface TicketType {
  id: string;               // UUID 主鍵
  concertId: string;        // 演唱會 ID (外鍵)
  name: string;             // 票種名稱 (如: VIP座位、普通票)
  description?: string;     // 票種描述
  price: number;            // 票價
  totalQuantity: number;    // 總數量
  availableQuantity: number; // 可售數量
  minPurchase: number;      // 最低購買數量
  maxPurchase: number;      // 最高購買數量
  seatingAreas: SeatingArea[]; // 座位區域
  isActive: boolean;        // 是否啟用
  saleStartTime?: Date;     // 售票開始時間
  saleEndTime?: Date;       // 售票結束時間
  createdAt: Date;
  updatedAt: Date;
  
  // 關聯關係
  concert: Concert;         // 演唱會資訊
  tickets: Ticket[];        // 票券列表
}

interface Ticket {
  id: string;               // UUID 主鍵
  sessionId: string;        // 場次 ID (外鍵)
  ticketTypeId: string;     // 票種 ID (外鍵)
  orderId?: string;         // 訂單 ID (外鍵，可空)
  ticketNumber: string;     // 票券編號 (唯一)
  seatNumber?: string;      // 座位號碼
  status: TicketStatus;     // 票券狀態
  metadata?: any;           // 額外資料
  createdAt: Date;
  updatedAt: Date;
  
  // 關聯關係
  session: ConcertSession;  // 場次資訊
  ticketType: TicketType;   // 票種資訊
  order?: Order;            // 訂單資訊
}

enum TicketStatus {
  AVAILABLE = 'available',   // 可售
  RESERVED = 'reserved',     // 預訂中
  SOLD = 'sold',            // 已售出
  USED = 'used',            // 已使用
  CANCELLED = 'cancelled',   // 已取消
  REFUNDED = 'refunded'     // 已退款
}

interface SeatingArea {
  area: string;             // 區域名稱 (如: A區、B區)
  rows: SeatingRow[];       // 座位排列
}

interface SeatingRow {
  row: string;              // 排號 (如: 1排, 2排)
  seats: string[];          // 座位號 (如: ['1', '2', '3'])
}
```

## API 端點概覽

```http
# 票種管理
GET    /api/v1/concerts/:id/ticket-types    # 取得票種列表
POST   /api/v1/concerts/:id/ticket-types    # 建立票種
PUT    /api/v1/ticket-types/:id             # 更新票種
DELETE /api/v1/ticket-types/:id             # 刪除票種

# 票券查詢
GET    /api/v1/concerts/:id/tickets         # 取得可用票券
GET    /api/v1/sessions/:id/available-seats # 取得可用座位
GET    /api/v1/tickets/:id                  # 取得票券詳情

# 票券預訂
POST   /api/v1/tickets/reserve              # 預訂票券
POST   /api/v1/tickets/release              # 釋放預訂
POST   /api/v1/tickets/confirm              # 確認購買

# 票券驗證
POST   /api/v1/tickets/validate             # 驗證票券
GET    /api/v1/tickets/:id/qr-code          # 取得 QR Code
```

## 核心業務邏輯

### 票券預訂流程
1. **庫存檢查**: 確認票券可用性
2. **座位選擇**: 分配或選擇座位
3. **暫時鎖定**: 預訂狀態鎖定 (15分鐘)
4. **價格計算**: 計算總價與優惠
5. **預訂確認**: 回傳預訂資訊

### 庫存控制機制
```typescript
// 樂觀鎖定 - 防止超賣
async function reserveTickets(ticketTypeId: string, quantity: number) {
  return await AppDataSource.transaction(async manager => {
    // 檢查當前庫存
    const ticketType = await manager.findOne(TicketType, {
      where: { id: ticketTypeId },
      lock: { mode: 'pessimistic_write' }
    });
    
    if (ticketType.availableQuantity < quantity) {
      throw new Error('庫存不足');
    }
    
    // 扣除庫存
    await manager.update(TicketType, ticketTypeId, {
      availableQuantity: ticketType.availableQuantity - quantity
    });
    
    // 建立預訂記錄
    // ...
  });
}
```

### 座位分配策略
1. **指定座位**: 用戶手動選擇座位
2. **自動分配**: 系統最佳化分配
3. **區域選擇**: 依價位區域分配
4. **連續座位**: 優先分配連續座位

### 票券驗證機制
- **QR Code**: 每張票券唯一 QR Code
- **數位簽章**: 防偽簽章驗證
- **即時檢查**: 票券狀態即時驗證
- **重複檢查**: 防止重複使用

## 核心特性
- ✅ 多層級票種設定 (VIP、普通、早鳥)
- ✅ 彈性座位配置 (指定座、自由座)
- ✅ 強健的庫存控制 (防超賣)
- ✅ 票券預訂機制 (暫時鎖定)
- ✅ 安全的票券驗證 (QR Code + 簽章)
- ✅ 購買限制控制 (數量、時間)

## 技術挑戰與解決方案

### 1. 防止超賣
- 使用資料庫樂觀鎖定
- Redis 分散式鎖
- 庫存預留機制

### 2. 高併發處理
- 連接池優化
- 快取熱門票券資訊
- 非同步處理

### 3. 座位衝突
- 座位狀態即時同步
- 樂觀鎖更新機制
- 衝突檢測與重試

## 相關檔案
- `models/TicketType.ts` - 票種實體
- `models/Ticket.ts` - 票券實體
- `controllers/ticketController.ts` - 票券控制器
- `routes/ticket.ts` - 票券路由
- `services/ticketService.ts` - 票券業務邏輯
- `services/seatService.ts` - 座位管理服務
