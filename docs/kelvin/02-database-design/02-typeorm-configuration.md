# TypeORM 設定與配置

## 概述
本文檔詳細說明 TypeORM 在 Tickeasy 專案中的設定與配置，包括資料源配置、環境變數管理、連接池設定以及進階功能的使用。

## 基礎配置

### 1. 資料源配置檔案
```typescript
// src/config/database.config.ts
import { DataSource, DataSourceOptions } from 'typeorm';
import { User } from '@/models/User';
import { Concert } from '@/models/Concert';
import { Ticket } from '@/models/Ticket';
import { Order } from '@/models/Order';
import { Organization } from '@/models/Organization';
import { Venue } from '@/models/Venue';
import { ConcertSession } from '@/models/ConcertSession';
import { TicketType } from '@/models/TicketType';
import { OrderItem } from '@/models/OrderItem';
import { Payment } from '@/models/Payment';

// 環境特定配置
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || (isTest ? 'tickeasy_test' : 'tickeasy'),
  
  // SSL 設定（生產環境）
  ssl: isProduction ? {
    rejectUnauthorized: false,
    ca: process.env.DB_CA_CERT,
    key: process.env.DB_CLIENT_KEY,
    cert: process.env.DB_CLIENT_CERT,
  } : false,
  
  // 實體定義
  entities: [
    User,
    Organization,
    Concert,
    ConcertSession,
    Venue,
    TicketType,
    Ticket,
    Order,
    OrderItem,
    Payment,
  ],
  
  // 遷移設定
  migrations: [
    isDevelopment ? 'src/migrations/*.ts' : 'dist/migrations/*.js'
  ],
  migrationsTableName: 'typeorm_migrations',
  migrationsRun: false, // 手動控制遷移執行
  
  // 開發設定
  synchronize: false, // 永不使用自動同步，使用遷移
  logging: isDevelopment ? ['query', 'error', 'warn'] : ['error'],
  logger: isDevelopment ? 'advanced-console' : 'file',
  
  // 連接池設定
  extra: {
    // 連接池大小
    max: isProduction ? 20 : 10,
    min: isProduction ? 5 : 2,
    
    // 連接超時設定
    acquireTimeoutMillis: 60000,      // 獲取連接超時 (60s)
    createTimeoutMillis: 30000,       // 創建連接超時 (30s)
    destroyTimeoutMillis: 5000,       // 銷毀連接超時 (5s)
    idleTimeoutMillis: 300000,        // 空閒連接超時 (5min)
    reapIntervalMillis: 1000,         // 檢查空閒連接間隔 (1s)
    createRetryIntervalMillis: 200,   // 重試間隔 (200ms)
    
    // PostgreSQL 特定設定
    statement_timeout: 30000,         // SQL 執行超時 (30s)
    query_timeout: 30000,             // 查詢超時 (30s)
    connectionTimeoutMillis: 10000,   // 連線超時 (10s)
    
    // 性能優化
    application_name: 'tickeasy-backend',
    
    // 連接保持活躍
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  },
  
  // 快取設定
  cache: isDevelopment ? false : {
    type: 'redis',
    options: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_CACHE_DB || '1'),
    },
    duration: 30000, // 快取時間 30 秒
    ignoreErrors: true,
  },
};

// 建立資料源實例
export const AppDataSource = new DataSource(dataSourceOptions);

// 初始化資料源
export const initializeDatabase = async (): Promise<void> => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Database connection established successfully');
      
      // 執行健康檢查
      await performHealthCheck();
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

// 資料庫健康檢查
export const performHealthCheck = async (): Promise<void> => {
  try {
    await AppDataSource.query('SELECT 1');
    console.log('✅ Database health check passed');
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    throw error;
  }
};

// 優雅關閉資料庫連接
export const closeDatabase = async (): Promise<void> => {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('✅ Database connection closed gracefully');
    }
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
    throw error;
  }
};
```

### 2. 環境變數配置
```bash
# .env 檔案範例

# 資料庫基本設定
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tickeasy
DB_USER=postgres
DB_PASSWORD=your_secure_password

# 生產環境 SSL 設定
DB_SSL_ENABLED=true
DB_CA_CERT=-----BEGIN CERTIFICATE-----...
DB_CLIENT_KEY=-----BEGIN PRIVATE KEY-----...
DB_CLIENT_CERT=-----BEGIN CERTIFICATE-----...

# 連接池設定
DB_MAX_CONNECTIONS=20
DB_MIN_CONNECTIONS=5
DB_CONNECTION_TIMEOUT=60000

# Redis 快取設定
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_CACHE_DB=1

# TypeORM 特定設定
TYPEORM_LOGGING=true
TYPEORM_MIGRATIONS_RUN=false
TYPEORM_SYNCHRONIZE=false
```

## 進階配置

### 1. 命名策略設定
```typescript
// src/config/naming-strategy.ts
import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';

export class SnakeNamingStrategy
  extends DefaultNamingStrategy
  implements NamingStrategyInterface
{
  // 表名轉換：PascalCase -> snake_case
  tableName(className: string, customName?: string): string {
    return customName || this.camelToSnakeCase(className);
  }

  // 欄位名轉換：camelCase -> snake_case
  columnName(
    propertyName: string,
    customName?: string,
    embeddedPrefixes: string[] = []
  ): string {
    const prefix = embeddedPrefixes.join('_');
    const name = customName || this.camelToSnakeCase(propertyName);
    return prefix ? `${prefix}_${name}` : name;
  }

  // 關聯名轉換
  relationName(propertyName: string): string {
    return this.camelToSnakeCase(propertyName);
  }

  // 索引名稱
  indexName(tableOrName: string, columns: string[]): string {
    const tableName = typeof tableOrName === 'string' ? tableOrName : tableOrName.name;
    return `idx_${tableName}_${columns.join('_')}`;
  }

  // 外鍵名稱
  foreignKeyName(
    tableOrName: string,
    columnNames: string[],
    referencedTablePath?: string,
    referencedColumnNames?: string[]
  ): string {
    const tableName = typeof tableOrName === 'string' ? tableOrName : tableOrName.name;
    return `fk_${tableName}_${columnNames.join('_')}`;
  }

  // 唯一約束名稱
  uniqueConstraintName(tableOrName: string, columnNames: string[]): string {
    const tableName = typeof tableOrName === 'string' ? tableOrName : tableOrName.name;
    return `uk_${tableName}_${columnNames.join('_')}`;
  }

  private camelToSnakeCase(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  }
}

// 在 dataSourceOptions 中使用
export const dataSourceOptions: DataSourceOptions = {
  // ... 其他配置
  namingStrategy: new SnakeNamingStrategy(),
};
```

### 2. Repository 模式實作
```typescript
// src/repositories/base.repository.ts
import { Repository, EntityTarget, FindManyOptions, FindOneOptions, DeepPartial } from 'typeorm';
import { AppDataSource } from '@/config/database.config';

export abstract class BaseRepository<T> {
  protected repository: Repository<T>;

  constructor(entity: EntityTarget<T>) {
    this.repository = AppDataSource.getRepository(entity);
  }

  async findAll(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repository.find(options);
  }

  async findById(id: string): Promise<T | null> {
    return this.repository.findOne({ where: { id } as any });
  }

  async findOne(options: FindOneOptions<T>): Promise<T | null> {
    return this.repository.findOne(options);
  }

  async create(data: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async update(id: string, data: DeepPartial<T>): Promise<T | null> {
    await this.repository.update(id, data as any);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected! > 0;
  }

  async count(options?: FindManyOptions<T>): Promise<number> {
    return this.repository.count(options);
  }

  async exists(options: FindOneOptions<T>): Promise<boolean> {
    const count = await this.repository.count(options);
    return count > 0;
  }
}
```

## 下一步

完成 TypeORM 設定後，請繼續閱讀：
- [資料模型實作](./03-data-models.md)
- [關聯關係設計](./04-relationships.md)
- [資料庫遷移](./05-migrations.md) 