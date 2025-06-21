# 第十二章：測試開發策略

## 章節概述
本章節詳細介紹 Tickeasy 系統的測試策略與實作，包括單元測試、整合測試、API 測試、資料庫測試等完整的測試架構。

## 目錄
1. [單元測試 (Jest)](./01-unit-testing.md)
2. [整合測試](./02-integration-testing.md)
3. [API 測試 (Supertest)](./03-api-testing.md)
4. [資料庫測試](./04-database-testing.md)
5. [測試覆蓋率](./05-test-coverage.md)

## 測試金字塔

```
        /\
       /  \
      / E2E \     ← 端到端測試 (少量)
     /______\
    /        \
   /Integration\ ← 整合測試 (中等)
  /____________\
 /              \
/   Unit Tests   \ ← 單元測試 (大量)
/________________\
```

## 學習目標
完成本章節後，您將能夠：
1. 建立完整的測試策略與測試計劃
2. 撰寫高品質的單元測試
3. 實作 API 端點的整合測試
4. 設計資料庫相關的測試案例
5. 監控和提高測試覆蓋率

## 測試環境配置

### Jest 設定檔案
```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/bin/**',
    '!src/migrations/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testTimeout: 30000
};
```

### 測試設定檔案
```typescript
// src/__tests__/setup.ts
import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { cleanDatabase } from './helpers/database';

// 測試前設定
beforeAll(async () => {
  // 連接測試資料庫
  await AppDataSource.initialize();
});

// 每個測試前清理資料庫
beforeEach(async () => {
  await cleanDatabase();
});

// 測試後清理
afterAll(async () => {
  await AppDataSource.destroy();
});

// 設定測試環境變數
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.DB_DATABASE = 'tickeasy_test';
```

## 單元測試範例

### 1. 服務層測試
```typescript
// src/__tests__/services/userService.test.ts
import { UserService } from '../../services/userService';
import { User } from '../../models/User';
import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/database';

describe('UserService', () => {
  let userService: UserService;
  let userRepository: Repository<User>;

  beforeEach(() => {
    userRepository = AppDataSource.getRepository(User);
    userService = new UserService(userRepository);
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      // Arrange
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      // Act
      const result = await userService.createUser(userData);

      // Assert
      expect(result).toBeDefined();
      expect(result.name).toBe(userData.name);
      expect(result.email).toBe(userData.email);
      expect(result.passwordHash).not.toBe(userData.password);
      expect(result.isEmailVerified).toBe(false);
    });

    it('should throw error when email already exists', async () => {
      // Arrange
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      await userService.createUser(userData);

      // Act & Assert
      await expect(userService.createUser(userData))
        .rejects
        .toThrow('Email already exists');
    });

    it('should hash password correctly', async () => {
      // Arrange
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      // Act
      const result = await userService.createUser(userData);

      // Assert
      expect(result.passwordHash).not.toBe(userData.password);
      expect(result.passwordHash.length).toBeGreaterThan(50);
    });
  });

  describe('validatePassword', () => {
    it('should return true for correct password', async () => {
      // Arrange
      const password = 'password123';
      const user = await userService.createUser({
        name: 'Test User',
        email: 'test@example.com',
        password
      });

      // Act
      const isValid = await userService.validatePassword(user, password);

      // Assert
      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      // Arrange
      const user = await userService.createUser({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      });

      // Act
      const isValid = await userService.validatePassword(user, 'wrongpassword');

      // Assert
      expect(isValid).toBe(false);
    });
  });
});
```

### 2. 控制器測試
```typescript
// src/__tests__/controllers/userController.test.ts
import request from 'supertest';
import app from '../../app';
import { User } from '../../models/User';
import { generateJwtToken } from '../helpers/auth';

describe('UserController', () => {
  describe('GET /api/v1/users/profile', () => {
    it('should return user profile for authenticated user', async () => {
      // Arrange
      const user = await User.save({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        isEmailVerified: true,
        role: 'user'
      });

      const token = generateJwtToken(user);

      // Act
      const response = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${token}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.user.id).toBe(user.id);
      expect(response.body.data.user.email).toBe(user.email);
      expect(response.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('should return 401 for unauthenticated request', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/users/profile');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.status).toBe('failed');
    });
  });

  describe('PUT /api/v1/users/profile', () => {
    it('should update user profile successfully', async () => {
      // Arrange
      const user = await User.save({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        isEmailVerified: true,
        role: 'user'
      });

      const token = generateJwtToken(user);
      const updateData = {
        name: 'Updated Name',
        phone: '0912345678'
      };

      // Act
      const response = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.user.name).toBe(updateData.name);
      expect(response.body.data.user.phone).toBe(updateData.phone);
    });

    it('should validate input data', async () => {
      // Arrange
      const user = await User.save({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        isEmailVerified: true,
        role: 'user'
      });

      const token = generateJwtToken(user);
      const invalidData = {
        name: '', // 空名稱
        phone: 'invalid-phone' // 無效電話
      };

      // Act
      const response = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.status).toBe('failed');
      expect(response.body.details).toBeDefined();
    });
  });
});
```

## 整合測試範例

### 1. 演唱會訂票流程測試
```typescript
// src/__tests__/integration/ticketBooking.test.ts
describe('Ticket Booking Integration', () => {
  let user: User;
  let concert: Concert;
  let session: ConcertSession;
  let ticketType: TicketType;
  let authToken: string;

  beforeEach(async () => {
    // 建立測試資料
    user = await createTestUser();
    concert = await createTestConcert();
    session = await createTestSession(concert);
    ticketType = await createTestTicketType(concert);
    authToken = generateJwtToken(user);
  });

  it('should complete full booking process', async () => {
    // 1. 查看可用票券
    const availableResponse = await request(app)
      .get(`/api/v1/concerts/${concert.id}/tickets`)
      .expect(200);

    expect(availableResponse.body.data.ticketTypes).toHaveLength(1);
    expect(availableResponse.body.data.ticketTypes[0].availableQuantity).toBe(100);

    // 2. 預訂票券
    const reserveResponse = await request(app)
      .post('/api/v1/tickets/reserve')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        sessionId: session.id,
        ticketTypeId: ticketType.id,
        quantity: 2
      })
      .expect(200);

    const reservationId = reserveResponse.body.data.reservationId;

    // 3. 建立訂單
    const orderResponse = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        reservationId,
        contactInfo: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '0912345678'
        }
      })
      .expect(201);

    const orderId = orderResponse.body.data.order.id;

    // 4. 模擬付款成功
    await request(app)
      .post('/api/v1/payments/webhook')
      .send({
        TradeNo: 'TEST123',
        RtnCode: '1',
        MerchantTradeNo: orderResponse.body.data.order.orderNumber
      })
      .expect(200);

    // 5. 驗證最終狀態
    const finalOrderResponse = await request(app)
      .get(`/api/v1/orders/${orderId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(finalOrderResponse.body.data.order.status).toBe('paid');
    expect(finalOrderResponse.body.data.order.tickets).toHaveLength(2);

    // 6. 驗證庫存已扣除
    const finalTicketsResponse = await request(app)
      .get(`/api/v1/concerts/${concert.id}/tickets`)
      .expect(200);

    expect(finalTicketsResponse.body.data.ticketTypes[0].availableQuantity).toBe(98);
  });
});
```

## 模擬 (Mock) 策略

### 1. 外部服務模擬
```typescript
// src/__tests__/mocks/emailService.ts
export const mockEmailService = {
  sendOrderConfirmation: jest.fn().mockResolvedValue(true),
  sendEmailVerification: jest.fn().mockResolvedValue(true),
  sendPasswordReset: jest.fn().mockResolvedValue(true)
};

// src/__tests__/mocks/openaiService.ts
export const mockOpenAIService = {
  generateSmartReply: jest.fn().mockResolvedValue({
    reply: 'Mock AI response',
    confidence: 0.8
  }),
  generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3])
};
```

### 2. 時間模擬
```typescript
// src/__tests__/helpers/time.ts
export const mockCurrentTime = (timestamp: string) => {
  const mockDate = new Date(timestamp);
  jest.useFakeTimers();
  jest.setSystemTime(mockDate);
};

export const restoreTime = () => {
  jest.useRealTimers();
};
```

## 測試資料工廠

```typescript
// src/__tests__/factories/userFactory.ts
export const createTestUser = async (overrides: Partial<User> = {}): Promise<User> => {
  const userData = {
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    passwordHash: await bcrypt.hash('password123', 12),
    isEmailVerified: true,
    role: 'user' as UserRole,
    ...overrides
  };

  return await User.save(userData);
};

// src/__tests__/factories/concertFactory.ts
export const createTestConcert = async (overrides: Partial<Concert> = {}): Promise<Concert> => {
  const organization = await createTestOrganization();
  const venue = await createTestVenue();

  const concertData = {
    title: 'Test Concert',
    description: 'A test concert',
    status: 'published' as ConcertStatus,
    category: 'pop' as ConcertCategory,
    organizationId: organization.id,
    venueId: venue.id,
    ...overrides
  };

  return await Concert.save(concertData);
};
```

## 測試覆蓋率監控

### NPM 腳本設定
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "jest --testPathPattern=e2e"
  }
}
```

### CI/CD 整合
```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: password
          POSTGRES_DB: tickeasy_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test:coverage
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_USERNAME: postgres
          DB_PASSWORD: password
          DB_DATABASE: tickeasy_test
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
```

## 核心特性
- ✅ 完整的測試金字塔架構
- ✅ 單元測試 + 整合測試 + E2E 測試
- ✅ 高測試覆蓋率 (80%+)
- ✅ 自動化測試執行
- ✅ CI/CD 整合
- ✅ 測試資料管理
- ✅ Mock 策略

## 最佳實務
1. **AAA 模式**: Arrange-Act-Assert
2. **獨立性**: 測試之間互不影響
3. **可讀性**: 清楚的測試描述和結構
4. **覆蓋率**: 追求有意義的覆蓋率而非 100%
5. **維護性**: 定期更新和重構測試代碼

## 相關檔案
- `jest.config.js` - Jest 設定檔
- `src/__tests__/` - 測試檔案目錄
- `src/__tests__/setup.ts` - 測試環境設定
- `src/__tests__/helpers/` - 測試輔助工具
- `src/__tests__/factories/` - 測試資料工廠
- `src/__tests__/mocks/` - Mock 物件定義
