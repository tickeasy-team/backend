# 依賴管理

## 概述
本文檔詳細說明 Tickeasy 票務系統後端專案的依賴管理策略，包括核心依賴的選擇理由、版本管理最佳實務以及依賴優化技巧。

## 依賴分類與選擇

### 1. 核心框架依賴
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "typescript": "^5.2.2",
    "@types/express": "^4.17.17",
    "ts-node": "^10.9.1",
    "nodemon": "^3.0.1"
  }
}
```

**選擇理由：**
- **Express**: 成熟穩定的 Node.js Web 框架，生態系統完整
- **TypeScript**: 提供型別安全，增強程式碼可維護性
- **ts-node**: 直接執行 TypeScript，提升開發效率

### 2. 資料庫與 ORM
```json
{
  "dependencies": {
    "typeorm": "^0.3.17",
    "pg": "^8.11.3",
    "@types/pg": "^8.10.2",
    "reflect-metadata": "^0.1.13",
    "@supabase/supabase-js": "^2.38.0"
  }
}
```

**選擇理由：**
- **TypeORM**: 功能完整的 TypeScript ORM，支援多種資料庫
- **pg**: PostgreSQL 官方客戶端，效能穩定
- **Supabase**: 提供即時功能與 Auth 整合

### 3. 身份驗證與安全
```json
{
  "dependencies": {
    "jsonwebtoken": "^9.0.2",
    "@types/jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "@types/bcryptjs": "^2.4.2",
    "passport": "^0.6.0",
    "passport-jwt": "^4.0.1",
    "passport-local": "^1.0.0",
    "helmet": "^7.0.0",
    "cors": "^2.8.5",
    "@types/cors": "^2.8.13"
  }
}
```

**選擇理由：**
- **JWT**: 無狀態驗證，適合微服務架構
- **bcryptjs**: 密碼雜湊加密，安全性高
- **Passport**: 靈活的身份驗證中介軟體
- **Helmet**: 自動設定安全性 HTTP 標頭

### 4. 資料驗證與處理
```json
{
  "dependencies": {
    "joi": "^17.10.1",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1",
    "multer": "^1.4.5-lts.1",
    "@types/multer": "^1.4.7",
    "sharp": "^0.32.5"
  }
}
```

**選擇理由：**
- **Joi**: 強大的資料驗證函式庫，API 友善
- **class-validator**: 裝飾器風格驗證，與 TypeScript 整合佳
- **multer**: 檔案上傳處理，支援多種儲存選項
- **sharp**: 高效能圖片處理函式庫

### 5. 快取與會話管理
```json
{
  "dependencies": {
    "redis": "^4.6.8",
    "connect-redis": "^7.1.0",
    "express-session": "^1.17.3",
    "@types/express-session": "^1.17.7",
    "ioredis": "^5.3.2"
  }
}
```

**選擇理由：**
- **Redis**: 高效能記憶體資料庫，適合快取與會話
- **ioredis**: 功能豐富的 Redis 客戶端，支援叢集

### 6. 日誌與監控
```json
{
  "dependencies": {
    "winston": "^3.10.0",
    "morgan": "^1.10.0",
    "@types/morgan": "^1.9.4",
    "express-rate-limit": "^6.10.0",
    "compression": "^1.7.4",
    "@types/compression": "^1.7.2"
  }
}
```

**選擇理由：**
- **Winston**: 功能完整的日誌函式庫，支援多種輸出
- **Morgan**: HTTP 請求日誌記錄中介軟體
- **express-rate-limit**: API 速率限制，防止濫用

### 7. 測試工具
```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "@types/jest": "^29.5.5",
    "ts-jest": "^29.1.1",
    "supertest": "^6.3.3",
    "@types/supertest": "^2.0.12",
    "mongodb-memory-server": "^8.15.1"
  }
}
```

**選擇理由：**
- **Jest**: 功能完整的測試框架，零配置啟動
- **Supertest**: HTTP 端點測試，與 Express 整合佳
- **mongodb-memory-server**: 記憶體資料庫，適合測試環境

### 8. 程式碼品質工具
```json
{
  "devDependencies": {
    "eslint": "^8.49.0",
    "@typescript-eslint/eslint-plugin": "^6.7.0",
    "@typescript-eslint/parser": "^6.7.0",
    "prettier": "^3.0.3",
    "husky": "^8.0.3",
    "lint-staged": "^14.0.1",
    "commitizen": "^4.3.0",
    "cz-conventional-changelog": "^3.3.0"
  }
}
```

**選擇理由：**
- **ESLint**: 程式碼檢查工具，可自訂規則
- **Prettier**: 程式碼格式化工具，保持一致性
- **Husky**: Git hooks 管理，自動化品質檢查

## 完整 package.json 範本

```json
{
  "name": "tickeasy-backend",
  "version": "1.0.0",
  "description": "Tickeasy 票務系統後端 API",
  "main": "dist/server.js",
  "scripts": {
    "start": "node dist/server.js",
    "dev": "nodemon --exec ts-node src/server.ts",
    "build": "tsc",
    "build:watch": "tsc --watch",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "lint": "eslint 'src/**/*.{js,ts}'",
    "lint:fix": "eslint 'src/**/*.{js,ts}' --fix",
    "format": "prettier --write 'src/**/*.{js,ts,json}'",
    "format:check": "prettier --check 'src/**/*.{js,ts,json}'",
    "typecheck": "tsc --noEmit",
    "migration:generate": "typeorm-ts-node-commonjs migration:generate -d src/config/database.config.ts",
    "migration:run": "typeorm-ts-node-commonjs migration:run -d src/config/database.config.ts",
    "migration:revert": "typeorm-ts-node-commonjs migration:revert -d src/config/database.config.ts",
    "seed:run": "ts-node scripts/seed.ts",
    "seed:refresh": "npm run migration:revert && npm run migration:run && npm run seed:run",
    "db:reset": "npm run migration:revert && npm run migration:run",
    "db:refresh": "npm run db:reset && npm run seed:run",
    "prepare": "husky install",
    "commit": "cz"
  },
  "keywords": ["ticketing", "concerts", "booking", "api", "typescript", "express"],
  "author": "Tickeasy Team",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "typescript": "^5.2.2",
    "@types/express": "^4.17.17",
    "ts-node": "^10.9.1",
    "typeorm": "^0.3.17",
    "pg": "^8.11.3",
    "@types/pg": "^8.10.2",
    "reflect-metadata": "^0.1.13",
    "@supabase/supabase-js": "^2.38.0",
    "jsonwebtoken": "^9.0.2",
    "@types/jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "@types/bcryptjs": "^2.4.2",
    "passport": "^0.6.0",
    "passport-jwt": "^4.0.1",
    "passport-local": "^1.0.0",
    "@types/passport-local": "^1.0.35",
    "helmet": "^7.0.0",
    "cors": "^2.8.5",
    "@types/cors": "^2.8.13",
    "joi": "^17.10.1",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1",
    "multer": "^1.4.5-lts.1",
    "@types/multer": "^1.4.7",
    "sharp": "^0.32.5",
    "redis": "^4.6.8",
    "connect-redis": "^7.1.0",
    "express-session": "^1.17.3",
    "@types/express-session": "^1.17.7",
    "ioredis": "^5.3.2",
    "winston": "^3.10.0",
    "morgan": "^1.10.0",
    "@types/morgan": "^1.9.4",
    "express-rate-limit": "^6.10.0",
    "compression": "^1.7.4",
    "@types/compression": "^1.7.2",
    "dotenv": "^16.3.1",
    "uuid": "^9.0.0",
    "@types/uuid": "^9.0.4",
    "date-fns": "^2.30.0",
    "nodemailer": "^6.9.5",
    "@types/nodemailer": "^6.4.10",
    "express-validator": "^7.0.1",
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^5.0.0",
    "@types/swagger-ui-express": "^4.1.3",
    "openai": "^4.10.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.5",
    "ts-jest": "^29.1.1",
    "supertest": "^6.3.3",
    "@types/supertest": "^2.0.12",
    "eslint": "^8.49.0",
    "@typescript-eslint/eslint-plugin": "^6.7.0",
    "@typescript-eslint/parser": "^6.7.0",
    "prettier": "^3.0.3",
    "husky": "^8.0.3",
    "lint-staged": "^14.0.1",
    "commitizen": "^4.3.0",
    "cz-conventional-changelog": "^3.3.0",
    "@types/node": "^20.6.3"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  },
  "lint-staged": {
    "*.{js,ts}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  },
  "config": {
    "commitizen": {
      "path": "./node_modules/cz-conventional-changelog"
    }
  }
}
```

## 版本管理策略

### 1. 語義化版本控制 (SemVer)
```bash
# 格式：主版本號.次版本號.修訂號
# 範例：1.2.3
# 主版本號：不相容的 API 變更
# 次版本號：向下相容的功能新增
# 修訂號：向下相容的問題修正
```

### 2. 版本範圍控制
```json
{
  "dependencies": {
    "express": "^4.18.2",      // 允許次版本更新 (4.x.x)
    "typescript": "~5.2.2",    // 僅允許修訂版本更新 (5.2.x)
    "pg": "8.11.3"             // 固定版本，不自動更新
  }
}
```

### 3. 鎖定檔案管理
```bash
# 使用 package-lock.json 鎖定精確版本
npm ci  # 用於生產環境，基於 lock 檔案安裝

# 定期更新依賴
npm audit         # 檢查安全漏洞
npm audit fix     # 自動修復安全漏洞
npm outdated      # 檢查過期套件
npm update        # 更新套件到允許範圍內最新版本
```

## 依賴管理最佳實務

### 1. 依賴分層管理
```bash
# 生產依賴 - 應用程式運行必需
npm install --save package-name

# 開發依賴 - 僅開發階段需要
npm install --save-dev package-name

# 全域依賴 - 系統工具
npm install --global package-name

# 可選依賴 - 增強功能但非必需
npm install --save-optional package-name
```

### 2. 依賴清理策略
```bash
# 移除未使用的依賴
npm prune

# 檢查未使用的依賴 (使用第三方工具)
npx depcheck

# 分析 bundle 大小
npx webpack-bundle-analyzer dist/main.js
```

### 3. 安全性管理
```bash
# 定期安全檢查
npm audit

# 自動修復安全問題
npm audit fix

# 檢查特定套件漏洞
npm audit --audit-level moderate

# 使用 Snyk 進行深度安全掃描
npx snyk test
npx snyk monitor
```

## 效能優化技巧

### 1. 快取策略
```bash
# 使用 npm ci 提升安裝速度
npm ci

# 配置快取位置
npm config set cache /path/to/cache

# 清理快取
npm cache clean --force

# 檢查快取使用情況
npm cache verify
```

### 2. 平行安裝
```json
{
  "scripts": {
    "install:parallel": "npm install --prefer-offline --no-audit"
  }
}
```

### 3. 選擇性安裝
```bash
# 僅安裝生產依賴
npm install --production

# 忽略可選依賴
npm install --no-optional

# 跳過腳本執行
npm install --ignore-scripts
```

## 依賴監控與維護

### 1. 自動化更新
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    reviewers:
      - "team-leads"
    assignees:
      - "maintainers"
```

### 2. 依賴分析工具
```bash
# 安裝分析工具
npm install -g npm-check-updates
npm install -g david

# 檢查過期依賴
ncu
david

# 更新依賴到最新版本
ncu -u
npm install
```

### 3. 版本鎖定策略
```json
{
  "overrides": {
    "vulnerable-package": "safe-version"
  },
  "resolutions": {
    "nested-vulnerable-package": "safe-version"
  }
}
```

## 故障排除

### 1. 常見依賴問題
```bash
# 版本衝突
npm ls  # 查看依賴樹
npm dedupe  # 去重複

# 安裝失敗
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# 權限問題
sudo chown -R $(whoami) ~/.npm
npm config set prefix ~/.npm-global
```

### 2. 依賴除錯
```bash
# 查看套件資訊
npm info package-name

# 檢查安裝路徑
npm root
npm root -g

# 驗證套件完整性
npm ls --depth=0
```

### 3. 效能診斷
```bash
# 分析安裝時間
npm install --timing=true --loglevel=verbose

# 檢查網路問題
npm config get registry
npm ping
```

## 環境特定配置

### 1. 多環境依賴管理
```json
{
  "scripts": {
    "install:dev": "npm install",
    "install:prod": "npm ci --only=production",
    "install:test": "npm ci"
  }
}
```

### 2. Docker 環境優化
```dockerfile
# 多階段建置優化依賴安裝
FROM node:18-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./
EXPOSE 3000
CMD ["npm", "start"]
```

## 總結

良好的依賴管理是專案成功的關鍵因素之一。透過：

1. **明智的套件選擇** - 選擇成熟、活躍維護的套件
2. **版本控制策略** - 使用語義化版本與適當的版本範圍
3. **安全性監控** - 定期檢查與修復安全漏洞
4. **效能優化** - 使用快取與平行安裝提升效率
5. **自動化管理** - 使用工具自動化依賴維護流程

## 下一步

完成依賴管理設定後，請繼續閱讀：
- [資料庫設計](../02-database-design/README.md)
- [核心框架設定](../03-core-framework/README.md)
- [身份驗證系統](../04-authentication/README.md) 