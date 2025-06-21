# Tickeasy 開發常見問題

## 目錄
- [環境設定問題](#環境設定問題)
- [資料庫相關問題](#資料庫相關問題)
- [API 開發問題](#api-開發問題)
- [認證與權限問題](#認證與權限問題)
- [部署相關問題](#部署相關問題)
- [效能優化問題](#效能優化問題)
- [AI 客服系統問題](#ai-客服系統問題)
- [測試相關問題](#測試相關問題)

---

## 環境設定問題

### Q1: 如何設定開發環境？
**A:** 
1. 確保已安裝 Node.js 18+ 和 npm
2. 複製專案：`git clone <repository-url>`
3. 安裝依賴：`npm install`
4. 設定環境變數：複製 `.env.example` 為 `.env` 並填入相關設定
5. 執行資料庫遷移：`npm run migrate`
6. 啟動開發伺服器：`npm run dev`

### Q2: Docker 容器無法啟動怎麼辦？
**A:**
```bash
# 檢查容器日誌
docker logs tickeasy-backend

# 檢查端口是否被佔用
lsof -i :3000

# 清理並重新建構
docker-compose down
docker-compose up --build
```

### Q3: TypeScript 編譯錯誤如何解決？
**A:**
1. 檢查 `tsconfig.json` 設定是否正確
2. 確保所有依賴的 `@types` 套件已安裝
3. 清理編譯快取：`rm -rf dist && npm run build`
4. 檢查 Node.js 版本是否符合要求

---

## 資料庫相關問題

### Q4: 如何連接 Supabase 資料庫？
**A:**
```bash
# 在 .env 檔案中設定
DB_HOST=your-project.supabase.co
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-password
DB_DATABASE=postgres
```

### Q5: TypeORM 遷移失敗怎麼辦？
**A:**
```bash
# 檢查資料庫連接
npm run typeorm -- query "SELECT 1"

# 重新生成遷移
npm run typeorm migration:generate src/migrations/MigrationName

# 手動執行遷移
npm run typeorm migration:run
```

### Q6: 如何處理資料庫連接池問題？
**A:**
在 `config/database.ts` 中調整連接池設定：
```typescript
export const AppDataSource = new DataSource({
  // ... 其他設定
  extra: {
    max: 20,        // 最大連接數
    min: 5,         // 最小連接數
    acquire: 30000, // 獲取連接超時時間
    idle: 10000     // 連接空閒時間
  }
});
```

### Q7: Vector 索引建立失敗？
**A:**
確保 PostgreSQL 已安裝 pgvector 擴展：
```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- 檢查擴展是否安裝成功
SELECT * FROM pg_extension WHERE extname = 'vector';
```

---

## API 開發問題

### Q8: 如何設計 RESTful API？
**A:**
遵循以下慣例：
- GET `/api/v1/concerts` - 取得演唱會列表
- GET `/api/v1/concerts/:id` - 取得單一演唱會
- POST `/api/v1/concerts` - 建立演唱會
- PUT `/api/v1/concerts/:id` - 更新演唱會
- DELETE `/api/v1/concerts/:id` - 刪除演唱會

### Q9: API 回應格式如何標準化？
**A:**
使用統一的回應格式：
```typescript
// 成功回應
{
  "status": "success",
  "data": {...},
  "pagination": {...} // 可選
}

// 錯誤回應
{
  "status": "failed",
  "message": "錯誤訊息",
  "code": "ERROR_CODE",
  "details": {...} // 可選
}
```

### Q10: 如何處理 API 參數驗證？
**A:**
使用 express-validator：
```typescript
import { body, validationResult } from 'express-validator';

export const validateCreateConcert = [
  body('title').notEmpty().withMessage('標題不能為空'),
  body('description').isLength({ min: 10 }).withMessage('描述至少10個字符'),
  body('venueId').isUUID().withMessage('場地ID格式錯誤'),
  
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'failed',
        message: '資料驗證失敗',
        details: errors.array()
      });
    }
    next();
  }
];
```

---

## 認證與權限問題

### Q11: JWT Token 過期如何處理？
**A:**
實作 Refresh Token 機制：
```typescript
// 檢查 Token 是否過期
if (error.name === 'TokenExpiredError') {
  // 使用 Refresh Token 更新 Access Token
  const newAccessToken = await refreshAccessToken(refreshToken);
  // 重新發送請求
}
```

### Q12: Google OAuth 回調失敗？
**A:**
檢查以下設定：
1. Google Console 中的回調 URL 是否正確
2. Client ID 和 Secret 是否正確
3. 確保 HTTPS 在生產環境中啟用
4. 檢查 Passport.js 設定

### Q13: 權限控制如何實作？
**A:**
```typescript
// 基於角色的存取控制
export const requireRole = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as AuthenticatedUser;
    
    if (!roles.includes(user.role)) {
      return res.status(403).json({
        status: 'failed',
        message: '權限不足'
      });
    }
    
    next();
  };
};

// 使用範例
router.post('/concerts', 
  authenticateToken, 
  requireRole(['admin', 'organizer']), 
  createConcert
);
```

---

## 部署相關問題

### Q14: Docker 映像建構失敗？
**A:**
```bash
# 檢查 Dockerfile 語法
docker build --no-cache -t tickeasy-backend .

# 檢查 .dockerignore 檔案
# 確保 node_modules 被忽略

# 檢查基礎映像版本
FROM node:18-alpine  # 確保版本正確
```

### Q15: 生產環境環境變數如何管理？
**A:**
1. 使用 Docker Secrets 或 Kubernetes Secrets
2. 使用 AWS Parameter Store 或 GCP Secret Manager
3. 避免在 Dockerfile 中硬編碼敏感資訊
4. 使用 .env.production 檔案（但不要提交到版本控制）

### Q16: 如何設定 Nginx 反向代理？
**A:**
```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    # SSL 設定
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location /api/ {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 效能優化問題

### Q17: API 回應時間過慢怎麼辦？
**A:**
1. 使用資料庫查詢優化：
```typescript
// 使用 select 限制欄位
const concerts = await Concert.find({
  select: ['id', 'title', 'posterImage'],
  where: { status: 'published' },
  relations: ['venue']
});

// 使用分頁
const [concerts, total] = await Concert.findAndCount({
  skip: (page - 1) * limit,
  take: limit
});
```

2. 實作快取機制：
```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// 快取查詢結果
const cacheKey = `concerts:${page}:${limit}`;
let concerts = await redis.get(cacheKey);

if (!concerts) {
  concerts = await getConcerts(page, limit);
  await redis.setex(cacheKey, 300, JSON.stringify(concerts)); // 快取5分鐘
}
```

### Q18: 資料庫查詢優化技巧？
**A:**
1. 使用適當的索引
2. 避免 N+1 查詢問題：
```typescript
// 錯誤：N+1 查詢
const concerts = await Concert.find();
for (const concert of concerts) {
  concert.venue = await Venue.findOne(concert.venueId);
}

// 正確：使用 JOIN
const concerts = await Concert.find({
  relations: ['venue']
});
```

3. 使用原生 SQL 處理複雜查詢：
```typescript
const result = await AppDataSource.query(`
  SELECT c.*, v.name as venue_name 
  FROM concerts c 
  JOIN venues v ON c.venue_id = v.id 
  WHERE c.status = $1
`, ['published']);
```

---

## AI 客服系統問題

### Q19: OpenAI API 呼叫失敗？
**A:**
1. 檢查 API Key 是否正確且有效
2. 確認是否有足夠的 API 額度
3. 實作錯誤重試機制：
```typescript
const retry = async (fn: Function, retries = 3) => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && error.status === 429) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return retry(fn, retries - 1);
    }
    throw error;
  }
};
```

### Q20: 向量搜尋結果不準確？
**A:**
1. 調整相似度閾值：
```sql
-- 降低閾值以獲得更多結果
WHERE 1 - (embedding <=> $1) > 0.6  -- 從 0.7 降到 0.6
```

2. 改善文本預處理：
```typescript
const preprocessText = (text: string) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // 移除標點符號
    .trim();
};
```

3. 使用混合搜尋策略（向量 + 關鍵字）

### Q21: AI 回覆品質不佳？
**A:**
1. 優化系統提示詞：
```typescript
const systemPrompt = `
你是 Tickeasy 票務系統的專業客服助手。
請遵循以下準則：
1. 使用繁體中文回答
2. 保持友善且專業的語氣
3. 提供準確且有用的資訊
4. 如果不確定答案，請誠實告知並建議聯絡人工客服
5. 引導用戶使用系統功能解決問題
`;
```

2. 調整 Temperature 參數：
```typescript
const completion = await openai.chat.completions.create({
  model: 'gpt-4-turbo-preview',
  temperature: 0.7, // 調整創造性程度
  max_tokens: 500,
  // ...
});
```

---

## 測試相關問題

### Q22: 如何寫單元測試？
**A:**
```typescript
// 使用 Jest 和 Supertest
import request from 'supertest';
import app from '../app';

describe('GET /api/v1/concerts', () => {
  test('應該返回演唱會列表', async () => {
    const response = await request(app)
      .get('/api/v1/concerts')
      .expect(200);
    
    expect(response.body.status).toBe('success');
    expect(Array.isArray(response.body.data.concerts)).toBe(true);
  });
});
```

### Q23: 如何模擬外部 API 呼叫？
**A:**
```typescript
import * as openaiService from '../services/openaiService';

// 模擬 OpenAI 服務
jest.mock('../services/openaiService');
const mockedOpenAI = jest.mocked(openaiService);

test('AI 回覆生成', async () => {
  mockedOpenAI.generateSmartReply.mockResolvedValue('模擬回覆');
  
  const response = await request(app)
    .post('/api/v1/smart-reply/chat')
    .send({ message: '測試訊息' });
    
  expect(response.body.data.reply).toBe('模擬回覆');
});
```

### Q24: 資料庫測試如何隔離？
**A:**
```typescript
// 使用測試資料庫
beforeEach(async () => {
  await AppDataSource.synchronize(true); // 重建資料庫
});

afterEach(async () => {
  await AppDataSource.clear(); // 清理資料
});
```

---

## 常見錯誤代碼

### 資料庫錯誤
- `23505`: Unique violation（唯一性約束違反）
- `23503`: Foreign key violation（外鍵約束違反）
- `42P01`: Relation does not exist（資料表不存在）

### HTTP 狀態碼
- `400`: Bad Request（請求參數錯誤）
- `401`: Unauthorized（未認證）
- `403`: Forbidden（權限不足）
- `404`: Not Found（資源不存在）
- `422`: Unprocessable Entity（無法處理的實體）
- `429`: Too Many Requests（請求過於頻繁）
- `500`: Internal Server Error（伺服器內部錯誤）

---

## 除錯技巧

### 1. 日誌記錄
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'debug.log' })
  ]
});

// 使用範例
logger.info('用戶登入', { userId, timestamp: new Date() });
logger.error('資料庫連接失敗', { error: error.message });
```

### 2. 效能監控
```typescript
// API 回應時間監控
const responseTime = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('API 回應時間', {
      method: req.method,
      url: req.url,
      duration: `${duration}ms`,
      statusCode: res.statusCode
    });
  });
  
  next();
};
```

### 3. 健康檢查
```typescript
// 定期檢查系統健康狀態
export const healthCheck = async () => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    openai: await checkOpenAI(),
    memory: process.memoryUsage(),
    uptime: process.uptime()
  };
  
  return checks;
};
```

---

## 獲得幫助

如果遇到其他問題，可以：

1. **查看官方文檔**
   - [TypeORM 文檔](https://typeorm.io/)
   - [Express.js 文檔](https://expressjs.com/)
   - [Supabase 文檔](https://supabase.com/docs)

2. **查看錯誤日誌**
   ```bash
   # 查看應用程式日誌
   docker logs tickeasy-backend
   
   # 查看系統日誌
   tail -f /var/log/syslog
   ```

3. **聯絡開發團隊**
   - 建立 GitHub Issue
   - 在專案 Slack 頻道求助
   - 發送郵件至技術支援

4. **社群資源**
   - Stack Overflow
   - GitHub Discussions
   - Discord 社群 