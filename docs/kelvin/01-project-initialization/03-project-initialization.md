# 專案初始化

## 概述
本文檔詳細說明如何從零開始初始化 Tickeasy 票務系統後端專案，包括專案結構建立、基本配置檔案設定與初始化腳本。

## 專案初始化步驟

### 1. 建立專案目錄結構
```bash
mkdir tickeasy-backend
cd tickeasy-backend

# 建立基本目錄結構
mkdir -p src/{controllers,services,models,routes,middleware,types,utils,config}
mkdir -p tests/{unit,integration,e2e}
mkdir -p docs/{api,architecture,deployment}
mkdir -p scripts/{setup,deployment,maintenance}
mkdir -p public/{uploads,assets}
```

### 2. 完整目錄結構
```
tickeasy-backend/
├── src/                          # 主要原始碼
│   ├── controllers/              # 控制器層
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── concert.controller.ts
│   │   ├── ticket.controller.ts
│   │   └── order.controller.ts
│   ├── services/                 # 業務邏輯層
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── concert.service.ts
│   │   ├── ticket.service.ts
│   │   ├── order.service.ts
│   │   └── notification.service.ts
│   ├── models/                   # 資料模型
│   │   ├── User.ts
│   │   ├── Concert.ts
│   │   ├── Ticket.ts
│   │   ├── Order.ts
│   │   └── index.ts
│   ├── routes/                   # 路由定義
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── concert.routes.ts
│   │   ├── ticket.routes.ts
│   │   ├── order.routes.ts
│   │   └── index.ts
│   ├── middleware/               # 中介軟體
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── logging.middleware.ts
│   │   └── rateLimiting.middleware.ts
│   ├── types/                    # TypeScript 型別定義
│   │   ├── auth.types.ts
│   │   ├── user.types.ts
│   │   ├── concert.types.ts
│   │   ├── ticket.types.ts
│   │   ├── order.types.ts
│   │   └── common.types.ts
│   ├── utils/                    # 實用工具
│   │   ├── logger.ts
│   │   ├── validator.ts
│   │   ├── encryption.ts
│   │   ├── email.ts
│   │   └── constants.ts
│   ├── config/                   # 配置檔案
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   ├── jwt.config.ts
│   │   └── app.config.ts
│   ├── app.ts                    # Express 應用程式設定
│   └── server.ts                 # 伺服器啟動檔案
├── tests/                        # 測試檔案
│   ├── unit/                     # 單元測試
│   ├── integration/              # 整合測試
│   ├── e2e/                      # 端對端測試
│   └── fixtures/                 # 測試資料
├── scripts/                      # 腳本檔案
│   ├── setup/                    # 設定腳本
│   ├── deployment/               # 部署腳本
│   └── maintenance/              # 維護腳本
├── docs/                         # 文檔
│   ├── api/                      # API 文檔
│   ├── architecture/             # 架構文檔
│   └── deployment/               # 部署文檔
├── public/                       # 靜態檔案
│   ├── uploads/                  # 上傳檔案
│   └── assets/                   # 靜態資源
├── .env.example                  # 環境變數範本
├── .gitignore                    # Git 忽略檔案
├── package.json                  # 專案配置
├── tsconfig.json                 # TypeScript 配置
├── jest.config.js                # Jest 測試配置
├── eslint.config.js              # ESLint 配置
├── prettier.config.js            # Prettier 配置
├── docker-compose.yml            # Docker Compose 配置
├── Dockerfile                    # Docker 映像檔配置
└── README.md                     # 專案說明
```

## 核心配置檔案

### 1. package.json
```json
{
  "name": "tickeasy-backend",
  "version": "1.0.0",
  "description": "Tickeasy 票務系統後端 API",
  "main": "dist/server.js",
  "scripts": {
    "start": "node dist/server.js",
    "dev": "nodemon src/server.ts",
    "build": "tsc",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "format": "prettier --write src/**/*.ts",
    "migration:generate": "typeorm migration:generate",
    "migration:run": "typeorm migration:run",
    "migration:revert": "typeorm migration:revert",
    "seed:run": "ts-node scripts/seed.ts"
  },
  "keywords": ["ticketing", "concerts", "booking", "api"],
  "author": "Tickeasy Team",
  "license": "MIT"
}
```

### 2. tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "baseUrl": "./",
    "paths": {
      "@/*": ["src/*"],
      "@/controllers/*": ["src/controllers/*"],
      "@/services/*": ["src/services/*"],
      "@/models/*": ["src/models/*"],
      "@/routes/*": ["src/routes/*"],
      "@/middleware/*": ["src/middleware/*"],
      "@/types/*": ["src/types/*"],
      "@/utils/*": ["src/utils/*"],
      "@/config/*": ["src/config/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 3. .env.example
```env
# 應用程式設定
NODE_ENV=development
PORT=3000
APP_NAME=Tickeasy API
APP_VERSION=1.0.0

# 資料庫設定
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tickeasy
DB_USER=postgres
DB_PASSWORD=password

# Supabase 設定
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# JWT 設定
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_jwt_refresh_secret
JWT_REFRESH_EXPIRES_IN=30d

# Redis 設定
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Email 設定
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# 檔案上傳設定
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif

# 外部服務 API
OPENAI_API_KEY=your_openai_api_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# 安全性設定
BCRYPT_ROUNDS=12
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000
```

### 4. .gitignore
```gitignore
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Grunt intermediate storage
.grunt

# Bower dependency directory
bower_components

# node-waf configuration
.lock-wscript

# Compiled binary addons
build/Release

# Dependency directories
node_modules/
jspm_packages/

# TypeScript cache
*.tsbuildinfo

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# parcel-bundler cache
.cache
.parcel-cache

# Next.js build output
.next

# Nuxt.js build / generate output
.nuxt
dist

# Gatsby files
.cache/
public

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Build outputs
dist/
build/

# Database
*.sqlite
*.db

# Uploads
public/uploads/*
!public/uploads/.gitkeep
```

## 初始化腳本

### 1. 專案設定腳本
```bash
#!/bin/bash
# scripts/setup/init-project.sh

echo "🚀 正在初始化 Tickeasy 後端專案..."

# 檢查 Node.js 版本
echo "📋 檢查 Node.js 版本..."
node_version=$(node -v)
echo "Node.js 版本: $node_version"

# 安裝依賴
echo "📦 安裝 npm 依賴..."
npm install

# 複製環境變數檔案
if [ ! -f .env ]; then
    echo "📄 建立環境變數檔案..."
    cp .env.example .env
    echo "請編輯 .env 檔案設定您的環境變數"
fi

# 建立資料庫
echo "🗄️ 初始化資料庫..."
npm run migration:run

# 填入種子資料
echo "🌱 填入種子資料..."
npm run seed:run

# 建立上傳目錄
echo "📁 建立上傳目錄..."
mkdir -p public/uploads

echo "✅ 專案初始化完成！"
echo "執行 'npm run dev' 啟動開發伺服器"
```

### 2. 開發工具初始化
```bash
#!/bin/bash
# scripts/setup/init-dev-tools.sh

echo "🛠️ 設定開發工具..."

# 安裝 Git hooks
echo "🪝 設定 Git hooks..."
npx husky install
npx husky add .husky/pre-commit "npm run lint && npm run test"
npx husky add .husky/commit-msg "npx commitizen --hook || true"

# 初始化 ESLint
echo "🔍 設定 ESLint..."
npx eslint --init

# 設定 Prettier
echo "💅 設定 Prettier..."
echo '{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}' > .prettierrc

echo "✅ 開發工具設定完成！"
```

## 基本檔案範本

### 1. src/app.ts 範本
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { errorHandler } from '@/middleware/error.middleware';
import { authMiddleware } from '@/middleware/auth.middleware';
import routes from '@/routes';

const app = express();

// 安全性中介軟體
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));

// 速率限制
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
});
app.use(limiter);

// 日誌記錄
app.use(morgan('combined'));

// 請求解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 靜態檔案
app.use('/uploads', express.static('public/uploads'));

// 健康檢查
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API 路由
app.use('/api', routes);

// 錯誤處理
app.use(errorHandler);

export default app;
```

### 2. src/server.ts 範本
```typescript
import app from './app';
import { AppDataSource } from '@/config/database.config';
import { logger } from '@/utils/logger';

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // 初始化資料庫連線
    await AppDataSource.initialize();
    logger.info('資料庫連線成功');

    // 啟動伺服器
    app.listen(PORT, () => {
      logger.info(`伺服器運行於 http://localhost:${PORT}`);
      logger.info(`環境: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('啟動伺服器失敗:', error);
    process.exit(1);
  }
}

// 優雅關閉
process.on('SIGTERM', () => {
  logger.info('收到 SIGTERM 信號，正在關閉伺服器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('收到 SIGINT 信號，正在關閉伺服器...');
  process.exit(0);
});

startServer();
```

## 驗證步驟

### 1. 基本功能測試
```bash
# 啟動開發伺服器
npm run dev

# 測試健康檢查端點
curl http://localhost:3000/health

# 運行測試套件
npm test
```

### 2. 程式碼品質檢查
```bash
# ESLint 檢查
npm run lint

# Prettier 格式化
npm run format

# TypeScript 編譯檢查
npm run build
```

## 下一步

完成專案初始化後，請繼續閱讀：
- [依賴管理](./04-dependency-management.md)
- [資料庫設計](../02-database-design/README.md)
- [核心框架設定](../03-core-framework/README.md)

## 常見問題

### 1. 權限問題
```bash
# 修復 npm 全域安裝權限
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}
```

### 2. 端口佔用
```bash
# 查找並終止佔用端口的進程
lsof -ti:3000 | xargs kill -9
```

### 3. TypeScript 編譯錯誤
- 檢查 `tsconfig.json` 配置
- 確認所有必要的型別定義已安裝
- 檢查匯入路徑是否正確 