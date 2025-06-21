# 第十八章：效能優化策略

## 章節概述
本章節詳細介紹 Tickeasy 系統的效能優化策略與實作，包括資料庫優化、快取機制、API 效能調校、記憶體管理和系統擴展等關鍵技術。

## 目錄
1. [資料庫效能優化](./01-database-optimization.md)
2. [快取策略實作](./02-caching-strategy.md)
3. [API 效能優化](./03-api-optimization.md)
4. [記憶體管理](./04-memory-management.md)
5. [擴展策略](./05-scaling-strategies.md)

## 核心技術
- **資料庫**: PostgreSQL 查詢優化 + 索引策略
- **快取**: Redis + Memory Cache + CDN
- **負載平衡**: Nginx + 應用層負載分散
- **監控**: APM + 效能指標追蹤

## 學習目標
完成本章節後，您將能夠：
1. 識別和解決效能瓶頸
2. 設計有效的快取架構
3. 優化資料庫查詢效能
4. 實作可擴展的系統架構
5. 監控和調校系統效能

## 效能優化金字塔

### 效能優化層級
```
         Application Layer
        /                \
       /   Code Optimization  \
      /________________________\
     /                          \
    /    Database Optimization   \
   /______________________________\
  /                                \
 /        Infrastructure           \
/_____________________________________\
```

### 效能指標
- **回應時間**: API 回應時間 < 200ms (95th percentile)
- **吞吐量**: 每秒處理請求數 > 1000 RPS
- **可用性**: 系統可用性 > 99.9%
- **並發性**: 支援 10,000+ 並發用戶

## 資料庫效能優化

### 1. 索引策略
```typescript
// models/indexStrategies.ts

// 演唱會表索引設計
export const ConcertIndexes = {
  // 複合索引：狀態 + 分類 + 建立時間
  statusCategoryCreated: {
    name: 'idx_concerts_status_category_created',
    columns: ['status', 'category', 'created_at'],
    where: "status = 'published'" // 部分索引
  },

  // 全文搜尋索引
  fullTextSearch: {
    name: 'idx_concerts_fulltext',
    type: 'GIN',
    expression: "to_tsvector('english', title || ' ' || description)"
  },

  // 地理位置索引 (通過 venue 關聯)
  locationSearch: {
    name: 'idx_venues_location',
    type: 'GIST',
    columns: ['location'] // PostGIS point
  },

  // 時間範圍查詢索引
  sessionTimeRange: {
    name: 'idx_sessions_time_range',
    columns: ['start_time', 'end_time']
  }
};

// 訂單表索引設計
export const OrderIndexes = {
  // 用戶訂單查詢
  userOrders: {
    name: 'idx_orders_user_created',
    columns: ['user_id', 'created_at']
  },

  // 訂單狀態查詢
  orderStatus: {
    name: 'idx_orders_status_expires',
    columns: ['status', 'expires_at'],
    where: "status IN ('pending', 'confirmed')"
  },

  // 訂單編號唯一索引
  orderNumber: {
    name: 'idx_orders_number_unique',
    columns: ['order_number'],
    unique: true
  }
};

// 票券表索引設計
export const TicketIndexes = {
  // 場次票券查詢
  sessionTickets: {
    name: 'idx_tickets_session_status',
    columns: ['session_id', 'status']
  },

  // 票券類型庫存查詢
  ticketTypeAvailability: {
    name: 'idx_ticket_types_available',
    columns: ['concert_id', 'is_active', 'available_quantity'],
    where: 'is_active = true AND available_quantity > 0'
  }
};
```

### 2. 查詢優化
```typescript
// services/optimizedQueryService.ts
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Concert } from '../models/Concert';
import { Order } from '../models/Order';

class OptimizedQueryService {
  // ✅ 優化的演唱會搜尋查詢
  async searchConcertsOptimized(params: {
    search?: string;
    category?: string;
    city?: string;
    startDate?: Date;
    endDate?: Date;
    page: number;
    limit: number;
  }): Promise<{ concerts: Concert[]; total: number }> {
    
    const queryBuilder = Concert.createQueryBuilder('concert')
      .select([
        'concert.id',
        'concert.title', 
        'concert.posterImage',
        'concert.category',
        'venue.name',
        'venue.city',
        'organization.name'
      ])
      .leftJoin('concert.venue', 'venue')
      .leftJoin('concert.organization', 'organization')
      .where('concert.status = :status', { status: 'published' });

    // 使用索引進行過濾
    if (params.category) {
      queryBuilder.andWhere('concert.category = :category', { 
        category: params.category 
      });
    }

    if (params.city) {
      queryBuilder.andWhere('venue.city = :city', { city: params.city });
    }

    // 全文搜尋使用 PostgreSQL 的 ts_vector
    if (params.search) {
      queryBuilder.andWhere(
        `to_tsvector('english', concert.title || ' ' || concert.description) 
         @@ plainto_tsquery('english', :search)`,
        { search: params.search }
      );
    }

    // 日期範圍過濾（通過子查詢）
    if (params.startDate || params.endDate) {
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1 FROM concert_sessions cs 
          WHERE cs.concert_id = concert.id 
          AND (:startDate IS NULL OR cs.start_time >= :startDate)
          AND (:endDate IS NULL OR cs.start_time <= :endDate)
        )`,
        { startDate: params.startDate, endDate: params.endDate }
      );
    }

    // 分頁
    const offset = (params.page - 1) * params.limit;
    queryBuilder
      .skip(offset)
      .take(params.limit)
      .orderBy('concert.created_at', 'DESC');

    // 使用 getManyAndCount 一次性獲取數據和總數
    const [concerts, total] = await queryBuilder.getManyAndCount();

    return { concerts, total };
  }

  // ✅ 批量預載關聯資料
  async getConcertsWithDetails(concertIds: string[]): Promise<Concert[]> {
    return await Concert.createQueryBuilder('concert')
      .leftJoinAndSelect('concert.venue', 'venue')
      .leftJoinAndSelect('concert.organization', 'organization')
      .leftJoinAndSelect('concert.sessions', 'sessions')
      .leftJoinAndSelect('concert.ticketTypes', 'ticketTypes', 
        'ticketTypes.isActive = true')
      .where('concert.id IN (:...ids)', { ids: concertIds })
      .orderBy('sessions.startTime', 'ASC')
      .addOrderBy('ticketTypes.price', 'ASC')
      .getMany();
  }

  // ✅ 使用原生查詢進行複雜統計
  async getConcertStatistics(): Promise<any> {
    return await Concert.query(`
      WITH concert_stats AS (
        SELECT 
          c.id,
          c.title,
          COUNT(DISTINCT cs.id) as session_count,
          COUNT(DISTINCT t.id) as total_tickets,
          COUNT(DISTINCT CASE WHEN t.status = 'sold' THEN t.id END) as sold_tickets,
          COALESCE(SUM(CASE WHEN t.status = 'sold' THEN tt.price END), 0) as revenue
        FROM concerts c
        LEFT JOIN concert_sessions cs ON c.id = cs.concert_id
        LEFT JOIN tickets t ON cs.id = t.session_id  
        LEFT JOIN ticket_types tt ON t.ticket_type_id = tt.id
        WHERE c.status = 'published'
        GROUP BY c.id, c.title
      )
      SELECT 
        *,
        CASE 
          WHEN total_tickets > 0 
          THEN ROUND((sold_tickets::numeric / total_tickets) * 100, 2)
          ELSE 0 
        END as sell_rate
      FROM concert_stats
      ORDER BY revenue DESC
      LIMIT 20
    `);
  }

  // ✅ 連接池優化查詢
  async getPopularConcerts(limit: number = 10): Promise<Concert[]> {
    // 使用索引提示和查詢計劃優化
    return await Concert.query(`
      /*+ INDEX(concerts idx_concerts_status_category_created) */
      SELECT DISTINCT c.*, 
        COUNT(t.id) as ticket_sales
      FROM concerts c
      JOIN concert_sessions cs ON c.id = cs.concert_id
      JOIN tickets t ON cs.id = t.session_id
      WHERE c.status = 'published'
        AND t.status = 'sold'
        AND t.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY c.id
      ORDER BY ticket_sales DESC
      LIMIT $1
    `, [limit]);
  }
}

export const optimizedQueryService = new OptimizedQueryService();
```

### 3. 連接池優化
```typescript
// config/database.ts
export const optimizedDataSourceConfig = {
  type: 'postgres' as const,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  
  // 連接池優化
  extra: {
    // 最大連接數
    max: 20,
    // 最小連接數
    min: 5,
    // 獲取連接超時時間 (ms)
    acquire: 30000,
    // 連接空閒時間 (ms)
    idle: 10000,
    // 連接生存時間 (ms)
    evict: 60000,
    // 連接建立超時時間 (ms)
    createTimeoutMillis: 30000,
    // 連接驗證查詢
    acquireTimeoutMillis: 30000,
    // 連接池銷毀超時時間 (ms)
    destroyTimeoutMillis: 5000,
    // 連接池事件
    handleDisconnects: true,
    // PostgreSQL 特定優化
    application_name: 'tickeasy-backend',
    statement_timeout: 30000,
    query_timeout: 30000
  },

  // 查詢優化
  logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  maxQueryExecutionTime: 5000, // 記錄慢查詢
  
  // 快取優化
  cache: {
    type: 'redis',
    options: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    },
    duration: 60000 // 1 分鐘快取
  }
};
```

## 快取策略實作

### 1. 多層快取架構
```typescript
// services/cacheService.ts
import Redis from 'ioredis';
import NodeCache from 'node-cache';

// 快取層級定義
enum CacheLevel {
  MEMORY = 'memory',    // L1: 記憶體快取
  REDIS = 'redis',      // L2: Redis 快取
  DATABASE = 'database' // L3: 資料庫快取
}

interface CacheConfig {
  ttl: number;           // Time To Live (seconds)
  level: CacheLevel[];   // 快取層級
  serialize?: boolean;   // 是否序列化
}

class MultiLevelCacheService {
  private memoryCache: NodeCache;
  private redisCache: Redis;

  constructor() {
    // L1: 記憶體快取 (最快，容量小)
    this.memoryCache = new NodeCache({
      stdTTL: 300,        // 5 分鐘
      maxKeys: 1000,      // 最大 1000 個鍵
      useClones: false,   // 效能優化
      deleteOnExpire: true
    });

    // L2: Redis 快取 (較快，容量大)
    this.redisCache = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: 0,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });
  }

  // 通用快取獲取方法
  async get<T>(key: string, config: CacheConfig): Promise<T | null> {
    // L1: 記憶體快取
    if (config.level.includes(CacheLevel.MEMORY)) {
      const memValue = this.memoryCache.get<T>(key);
      if (memValue !== undefined) {
        return memValue;
      }
    }

    // L2: Redis 快取
    if (config.level.includes(CacheLevel.REDIS)) {
      try {
        const redisValue = await this.redisCache.get(key);
        if (redisValue) {
          const parsed = config.serialize ? JSON.parse(redisValue) : redisValue;
          
          // 回寫到記憶體快取
          if (config.level.includes(CacheLevel.MEMORY)) {
            this.memoryCache.set(key, parsed, config.ttl);
          }
          
          return parsed;
        }
      } catch (error) {
        console.error('Redis cache error:', error);
      }
    }

    return null;
  }

  // 通用快取設定方法
  async set<T>(key: string, value: T, config: CacheConfig): Promise<void> {
    // L1: 記憶體快取
    if (config.level.includes(CacheLevel.MEMORY)) {
      this.memoryCache.set(key, value, config.ttl);
    }

    // L2: Redis 快取
    if (config.level.includes(CacheLevel.REDIS)) {
      try {
        const serialized = config.serialize ? JSON.stringify(value) : value as string;
        await this.redisCache.setex(key, config.ttl, serialized);
      } catch (error) {
        console.error('Redis cache set error:', error);
      }
    }
  }

  // 刪除快取
  async delete(key: string): Promise<void> {
    this.memoryCache.del(key);
    
    try {
      await this.redisCache.del(key);
    } catch (error) {
      console.error('Redis cache delete error:', error);
    }
  }

  // 批量刪除快取
  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redisCache.keys(pattern);
      if (keys.length > 0) {
        await this.redisCache.del(...keys);
      }
    } catch (error) {
      console.error('Redis cache delete pattern error:', error);
    }
  }
}

export const cacheService = new MultiLevelCacheService();

// 業務快取服務
export class BusinessCacheService {
  // 演唱會快取
  static async getConcert(concertId: string): Promise<Concert | null> {
    const key = `concert:${concertId}`;
    
    let concert = await cacheService.get<Concert>(key, {
      ttl: 3600, // 1 小時
      level: [CacheLevel.MEMORY, CacheLevel.REDIS],
      serialize: true
    });

    if (!concert) {
      concert = await Concert.findOne({
        where: { id: concertId },
        relations: ['venue', 'organization', 'sessions', 'ticketTypes']
      });

      if (concert) {
        await cacheService.set(key, concert, {
          ttl: 3600,
          level: [CacheLevel.MEMORY, CacheLevel.REDIS],
          serialize: true
        });
      }
    }

    return concert;
  }

  // 用戶會話快取
  static async getUserSession(userId: string): Promise<any> {
    const key = `user_session:${userId}`;
    
    return await cacheService.get(key, {
      ttl: 1800, // 30 分鐘
      level: [CacheLevel.MEMORY, CacheLevel.REDIS],
      serialize: true
    });
  }

  // 熱門演唱會快取
  static async getPopularConcerts(): Promise<Concert[]> {
    const key = 'popular_concerts';
    
    let concerts = await cacheService.get<Concert[]>(key, {
      ttl: 900, // 15 分鐘
      level: [CacheLevel.MEMORY, CacheLevel.REDIS],
      serialize: true
    });

    if (!concerts) {
      concerts = await optimizedQueryService.getPopularConcerts(20);
      
      await cacheService.set(key, concerts, {
        ttl: 900,
        level: [CacheLevel.MEMORY, CacheLevel.REDIS],
        serialize: true
      });
    }

    return concerts;
  }

  // 票種可用性快取
  static async getTicketAvailability(concertId: string): Promise<any> {
    const key = `ticket_availability:${concertId}`;
    
    return await cacheService.get(key, {
      ttl: 60, // 1 分鐘 (高頻更新)
      level: [CacheLevel.REDIS], // 只使用 Redis
      serialize: true
    });
  }
}
```

### 2. 快取失效策略
```typescript
// services/cacheInvalidationService.ts
class CacheInvalidationService {
  // 演唱會相關快取失效
  async invalidateConcertCache(concertId: string): Promise<void> {
    const patterns = [
      `concert:${concertId}`,
      `concert_sessions:${concertId}*`,
      `ticket_availability:${concertId}`,
      'popular_concerts',
      'featured_concerts'
    ];

    await Promise.all(
      patterns.map(pattern => cacheService.deletePattern(pattern))
    );
  }

  // 用戶相關快取失效
  async invalidateUserCache(userId: string): Promise<void> {
    const patterns = [
      `user:${userId}*`,
      `user_session:${userId}`,
      `user_orders:${userId}*`
    ];

    await Promise.all(
      patterns.map(pattern => cacheService.deletePattern(pattern))
    );
  }

  // 訂單相關快取失效
  async invalidateOrderCache(orderId: string, userId: string): Promise<void> {
    const keys = [
      `order:${orderId}`,
      `user_orders:${userId}`,
      'order_statistics'
    ];

    await Promise.all(
      keys.map(key => cacheService.delete(key))
    );
  }

  // 系統級快取失效 (新版本部署時)
  async invalidateSystemCache(): Promise<void> {
    const patterns = [
      'system_config*',
      'api_metadata*',
      'feature_flags*'
    ];

    await Promise.all(
      patterns.map(pattern => cacheService.deletePattern(pattern))
    );
  }
}

export const cacheInvalidationService = new CacheInvalidationService();
```

## API 效能優化

### 1. 回應壓縮與優化
```typescript
// middlewares/responseOptimization.ts
import compression from 'compression';
import { Request, Response, NextFunction } from 'express';

// 智能壓縮中間件
export const smartCompression = compression({
  filter: (req: Request, res: Response) => {
    // 不壓縮已經壓縮的檔案
    if (req.headers['x-no-compression']) {
      return false;
    }

    // 檢查檔案類型
    const contentType = res.getHeader('content-type') as string;
    
    // 跳過圖片和影片檔案
    if (contentType && (
      contentType.startsWith('image/') ||
      contentType.startsWith('video/') ||
      contentType.startsWith('application/octet-stream')
    )) {
      return false;
    }

    return compression.filter(req, res);
  },
  level: 6, // 壓縮等級 (1-9, 6是平衡點)
  threshold: 1024 // 只壓縮 > 1KB 的回應
});

// 回應快取中間件
export const responseCaching = (duration: number = 300) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // 只對 GET 請求設定快取
    if (req.method === 'GET') {
      res.set({
        'Cache-Control': `public, max-age=${duration}`,
        'Expires': new Date(Date.now() + duration * 1000).toUTCString()
      });
    }
    
    next();
  };
};

// 條件請求支援 (ETag)
export const conditionalRequests = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  
  res.send = function(body: any) {
    if (req.method === 'GET' && res.statusCode === 200) {
      const etag = generateETag(body);
      res.set('ETag', etag);
      
      // 檢查 If-None-Match 標頭
      if (req.headers['if-none-match'] === etag) {
        return res.status(304).end();
      }
    }
    
    return originalSend.call(this, body);
  };
  
  next();
};

function generateETag(body: any): string {
  const crypto = require('crypto');
  return `"${crypto.createHash('md5').update(JSON.stringify(body)).digest('hex')}"`;
}
```

### 2. 資料庫查詢批次處理
```typescript
// services/batchProcessingService.ts
import DataLoader from 'dataloader';

class BatchProcessingService {
  private concertLoader: DataLoader<string, Concert>;
  private userLoader: DataLoader<string, User>;
  private venueLoader: DataLoader<string, Venue>;

  constructor() {
    // 演唱會批次載入器
    this.concertLoader = new DataLoader<string, Concert>(
      async (concertIds: string[]) => {
        const concerts = await Concert.findByIds(concertIds, {
          relations: ['venue', 'organization']
        });
        
        // 確保回傳順序與輸入一致
        return concertIds.map(id => 
          concerts.find(concert => concert.id === id) || null
        );
      },
      {
        maxBatchSize: 100,
        cache: true,
        cacheKeyFn: (key: string) => key
      }
    );

    // 用戶批次載入器
    this.userLoader = new DataLoader<string, User>(
      async (userIds: string[]) => {
        const users = await User.findByIds(userIds);
        return userIds.map(id => 
          users.find(user => user.id === id) || null
        );
      }
    );

    // 場地批次載入器
    this.venueLoader = new DataLoader<string, Venue>(
      async (venueIds: string[]) => {
        const venues = await Venue.findByIds(venueIds);
        return venueIds.map(id => 
          venues.find(venue => venue.id === id) || null
        );
      }
    );
  }

  // 批次載入演唱會
  async loadConcert(concertId: string): Promise<Concert> {
    return await this.concertLoader.load(concertId);
  }

  // 批次載入多個演唱會
  async loadConcerts(concertIds: string[]): Promise<Concert[]> {
    return await this.concertLoader.loadMany(concertIds);
  }

  // 批次載入用戶
  async loadUser(userId: string): Promise<User> {
    return await this.userLoader.load(userId);
  }

  // 批次載入場地
  async loadVenue(venueId: string): Promise<Venue> {
    return await this.venueLoader.load(venueId);
  }

  // 清除特定快取
  clearConcertCache(concertId: string): void {
    this.concertLoader.clear(concertId);
  }

  // 清除所有快取
  clearAllCache(): void {
    this.concertLoader.clearAll();
    this.userLoader.clearAll();
    this.venueLoader.clearAll();
  }
}

export const batchProcessingService = new BatchProcessingService();
```

### 3. 分頁與無限滾動優化
```typescript
// services/paginationService.ts
interface PaginationConfig {
  page: number;
  limit: number;
  maxLimit?: number;
  cursorBased?: boolean;
}

interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string;
    prevCursor?: string;
  };
}

class PaginationService {
  // 偏移分頁 (適合傳統分頁)
  static async offsetPagination<T>(
    queryBuilder: SelectQueryBuilder<T>,
    config: PaginationConfig
  ): Promise<PaginationResult<T>> {
    const { page, limit } = config;
    const maxLimit = config.maxLimit || 100;
    const effectiveLimit = Math.min(limit, maxLimit);
    
    const offset = (page - 1) * effectiveLimit;
    
    const [data, total] = await queryBuilder
      .skip(offset)
      .take(effectiveLimit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / effectiveLimit);

    return {
      data,
      pagination: {
        page,
        limit: effectiveLimit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  // 游標分頁 (適合無限滾動)
  static async cursorPagination<T>(
    queryBuilder: SelectQueryBuilder<T>,
    config: {
      limit: number;
      cursor?: string;
      cursorField: string;
      direction?: 'ASC' | 'DESC';
    }
  ): Promise<PaginationResult<T>> {
    const { limit, cursor, cursorField, direction = 'DESC' } = config;
    
    if (cursor) {
      const operator = direction === 'DESC' ? '<' : '>';
      queryBuilder.andWhere(`${cursorField} ${operator} :cursor`, { cursor });
    }

    const data = await queryBuilder
      .orderBy(cursorField, direction)
      .take(limit + 1) // 多取一個用來判斷是否有下一頁
      .getMany();

    const hasNext = data.length > limit;
    if (hasNext) {
      data.pop(); // 移除多取的一個
    }

    const nextCursor = hasNext && data.length > 0 
      ? data[data.length - 1][cursorField] 
      : undefined;

    return {
      data,
      pagination: {
        page: 1, // 游標分頁不使用頁碼
        limit,
        total: -1, // 游標分頁通常不計算總數
        totalPages: -1,
        hasNext,
        hasPrev: !!cursor,
        nextCursor
      }
    };
  }

  // 自適應分頁 (根據資料量選擇策略)
  static async adaptivePagination<T>(
    queryBuilder: SelectQueryBuilder<T>,
    config: PaginationConfig & { cursorField?: string }
  ): Promise<PaginationResult<T>> {
    // 小資料集使用偏移分頁
    if (config.page <= 100) {
      return this.offsetPagination(queryBuilder, config);
    }
    
    // 大資料集使用游標分頁
    if (config.cursorBased && config.cursorField) {
      return this.cursorPagination(queryBuilder, {
        limit: config.limit,
        cursorField: config.cursorField
      });
    }

    return this.offsetPagination(queryBuilder, config);
  }
}

export { PaginationService };
```

## 記憶體管理

### 1. 記憶體監控
```typescript
// services/memoryMonitoringService.ts
class MemoryMonitoringService {
  private memoryThresholds = {
    warning: 80,  // 80% 記憶體使用率警告
    critical: 90  // 90% 記憶體使用率重要警告
  };

  // 獲取記憶體使用情況
  getMemoryUsage(): MemoryUsage {
    const usage = process.memoryUsage();
    const totalMem = require('os').totalmem();
    
    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
      totalSystem: totalMem,
      heapUsagePercent: (usage.heapUsed / usage.heapTotal) * 100,
      systemUsagePercent: (usage.rss / totalMem) * 100
    };
  }

  // 檢查記憶體健康狀態
  checkMemoryHealth(): MemoryHealth {
    const usage = this.getMemoryUsage();
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    const alerts: string[] = [];

    if (usage.heapUsagePercent > this.memoryThresholds.critical) {
      status = 'critical';
      alerts.push(`Heap usage critical: ${usage.heapUsagePercent.toFixed(2)}%`);
    } else if (usage.heapUsagePercent > this.memoryThresholds.warning) {
      status = 'warning';
      alerts.push(`Heap usage high: ${usage.heapUsagePercent.toFixed(2)}%`);
    }

    if (usage.systemUsagePercent > this.memoryThresholds.critical) {
      status = 'critical';
      alerts.push(`System memory critical: ${usage.systemUsagePercent.toFixed(2)}%`);
    }

    return {
      status,
      usage,
      alerts,
      timestamp: new Date()
    };
  }

  // 強制垃圾回收 (謹慎使用)
  forceGarbageCollection(): void {
    if (global.gc) {
      global.gc();
      console.log('Manual garbage collection triggered');
    } else {
      console.warn('Garbage collection not available. Run with --expose-gc flag');
    }
  }

  // 記憶體洩漏檢測
  detectMemoryLeaks(): void {
    const initialUsage = this.getMemoryUsage();
    
    setTimeout(() => {
      const currentUsage = this.getMemoryUsage();
      const heapGrowth = currentUsage.heapUsed - initialUsage.heapUsed;
      
      if (heapGrowth > 50 * 1024 * 1024) { // 50MB 增長
        console.warn('Potential memory leak detected', {
          initialHeap: initialUsage.heapUsed,
          currentHeap: currentUsage.heapUsed,
          growth: heapGrowth
        });
      }
    }, 60000); // 1 分鐘後檢查
  }

  // 啟動記憶體監控
  startMonitoring(): void {
    setInterval(() => {
      const health = this.checkMemoryHealth();
      
      if (health.status !== 'healthy') {
        console.warn('Memory health check', health);
        
        if (health.status === 'critical') {
          // 發送告警
          this.sendMemoryAlert(health);
          
          // 嘗試釋放快取
          this.emergencyMemoryCleanup();
        }
      }
    }, 30000); // 每 30 秒檢查一次
  }

  private async sendMemoryAlert(health: MemoryHealth): Promise<void> {
    // 發送到監控系統
    console.error('Critical memory usage detected', health);
  }

  private emergencyMemoryCleanup(): void {
    // 清理快取
    cacheService.clearAllCache();
    
    // 強制垃圾回收
    this.forceGarbageCollection();
    
    console.log('Emergency memory cleanup completed');
  }
}

interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  totalSystem: number;
  heapUsagePercent: number;
  systemUsagePercent: number;
}

interface MemoryHealth {
  status: 'healthy' | 'warning' | 'critical';
  usage: MemoryUsage;
  alerts: string[];
  timestamp: Date;
}

export const memoryMonitoringService = new MemoryMonitoringService();
```

### 2. 物件池管理
```typescript
// services/objectPoolService.ts
class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn?: (obj: T) => void;
  private validateFn?: (obj: T) => boolean;
  private maxSize: number;
  private currentSize: number = 0;

  constructor(
    createFn: () => T,
    options: {
      maxSize?: number;
      resetFn?: (obj: T) => void;
      validateFn?: (obj: T) => boolean;
    } = {}
  ) {
    this.createFn = createFn;
    this.resetFn = options.resetFn;
    this.validateFn = options.validateFn;
    this.maxSize = options.maxSize || 50;
  }

  // 取得物件
  acquire(): T {
    let obj = this.pool.pop();
    
    if (!obj) {
      obj = this.createFn();
      this.currentSize++;
    } else if (this.validateFn && !this.validateFn(obj)) {
      // 物件無效，建立新的
      obj = this.createFn();
    } else if (this.resetFn) {
      // 重設物件狀態
      this.resetFn(obj);
    }
    
    return obj;
  }

  // 歸還物件
  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
    } else {
      this.currentSize--;
    }
  }

  // 清空池
  clear(): void {
    this.pool = [];
    this.currentSize = 0;
  }

  // 獲取統計資訊
  getStats(): PoolStats {
    return {
      available: this.pool.length,
      total: this.currentSize,
      maxSize: this.maxSize
    };
  }
}

interface PoolStats {
  available: number;
  total: number;
  maxSize: number;
}

// HTTP 請求物件池
class RequestObjectPool {
  private static pools = {
    queryBuilders: new ObjectPool(
      () => ({}),
      {
        maxSize: 100,
        resetFn: (obj: any) => {
          // 清空物件屬性
          Object.keys(obj).forEach(key => delete obj[key]);
        }
      }
    ),
    
    responseObjects: new ObjectPool(
      () => ({}),
      {
        maxSize: 50,
        resetFn: (obj: any) => {
          Object.keys(obj).forEach(key => delete obj[key]);
        }
      }
    )
  };

  static getQueryBuilder(): any {
    return this.pools.queryBuilders.acquire();
  }

  static releaseQueryBuilder(obj: any): void {
    this.pools.queryBuilders.release(obj);
  }

  static getResponseObject(): any {
    return this.pools.responseObjects.acquire();
  }

  static releaseResponseObject(obj: any): void {
    this.pools.responseObjects.release(obj);
  }

  static getPoolStats(): { [key: string]: PoolStats } {
    return {
      queryBuilders: this.pools.queryBuilders.getStats(),
      responseObjects: this.pools.responseObjects.getStats()
    };
  }
}

export { ObjectPool, RequestObjectPool };
```

## 核心特性
- ✅ 多層次快取架構 (Memory + Redis + CDN)
- ✅ 資料庫查詢優化與索引策略
- ✅ API 回應壓縮與快取
- ✅ 批次處理與 DataLoader 優化
- ✅ 智能分頁策略
- ✅ 記憶體監控與洩漏檢測
- ✅ 物件池管理

## 效能指標
- **API 回應時間**: < 200ms (95th percentile)
- **資料庫查詢**: < 100ms (平均)
- **快取命中率**: > 80%
- **記憶體使用**: < 80% (正常運行)
- **併發處理**: > 1000 RPS

## 最佳實務
1. **測量先於優化**: 先測量再優化，避免過早優化
2. **分層快取**: 根據資料特性選擇合適的快取層級
3. **資料庫優化**: 合理使用索引，避免 N+1 查詢
4. **記憶體管理**: 定期監控，及時清理
5. **持續監控**: 建立效能基準線，持續追蹤改進

## 相關檔案
- `services/cacheService.ts` - 快取服務
- `services/optimizedQueryService.ts` - 查詢優化
- `services/batchProcessingService.ts` - 批次處理
- `services/memoryMonitoringService.ts` - 記憶體監控
- `middlewares/responseOptimization.ts` - 回應優化
- `config/database.ts` - 資料庫優化配置