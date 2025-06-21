# Tickeasy 部署指南

## 概述
本指南詳細說明如何將 Tickeasy 票務系統後端部署到生產環境，包括 Docker 容器化部署、雲端平台部署、以及相關的配置和監控設定。

## 部署架構

```
生產環境架構
├── 負載平衡器 (Nginx/AWS ALB)
├── 應用程式服務器 (Docker Container)
│   ├── Node.js 應用程式
│   └── 健康檢查端點
├── 資料庫 (Supabase PostgreSQL)
├── 快取層 (Redis)
├── 檔案儲存 (Supabase Storage)
└── 監控系統 (Prometheus + Grafana)
```

## 環境需求

### 最低系統需求
- **CPU**: 2 核心
- **記憶體**: 4GB RAM
- **硬碟**: 20GB 可用空間
- **網路**: 1Gbps 頻寬

### 推薦系統需求
- **CPU**: 4 核心
- **記憶體**: 8GB RAM
- **硬碟**: 50GB 可用空間 (SSD)
- **網路**: 10Gbps 頻寬

### 軟體需求
- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+ (如果不使用 Docker)
- PostgreSQL 14+ (如果不使用 Supabase)

## 環境變數設定

### 生產環境變數 (.env.production)
```bash
# 應用程式設定
NODE_ENV=production
PORT=3000
APP_NAME=Tickeasy Backend
APP_VERSION=1.0.0

# JWT 設定
JWT_SECRET=your-very-secure-jwt-secret-key-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# 資料庫設定 (Supabase)
DB_HOST=your-supabase-host.supabase.co
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-secure-database-password
DB_DATABASE=postgres
DB_SSL=true

# Supabase 設定
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Google OAuth 設定
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://api.yourdomain.com/api/v1/auth/google/callback

# OpenAI 設定
OPENAI_API_KEY=your-openai-api-key
OPENAI_ORG_ID=your-openai-org-id

# 郵件設定
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# 前端 URL
FRONTEND_URL=https://yourdomain.com
FRONTEND_LOGIN_SUCCESS_URL=https://yourdomain.com/dashboard
FRONTEND_LOGIN_FAIL_URL=https://yourdomain.com/login/failed

# Redis 設定 (如果使用)
REDIS_URL=redis://your-redis-host:6379

# 監控設定
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info

# 安全性設定
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Docker 部署

### 1. 生產環境 Dockerfile 優化
```dockerfile
# 多階段建構 Dockerfile
FROM node:18-alpine AS builder

# 設定工作目錄
WORKDIR /app

# 複製 package 檔案
COPY package*.json ./

# 安裝依賴
RUN npm ci --only=production && npm cache clean --force

# 複製源碼
COPY . .

# 建構應用程式
RUN npm run build

# 生產階段
FROM node:18-alpine AS production

# 建立非 root 用戶
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# 設定工作目錄
WORKDIR /app

# 複製建構結果和依賴
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nextjs:nodejs /app/views ./views

# 切換用戶
USER nextjs

# 暴露端口
EXPOSE 3000

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

# 啟動應用程式
CMD ["node", "dist/bin/server.js"]
```

### 2. 生產環境 docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: tickeasy-backend
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    environment:
      - NODE_ENV=production
    volumes:
      - ./logs:/app/logs
    networks:
      - tickeasy-network
    depends_on:
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  redis:
    image: redis:7-alpine
    container_name: tickeasy-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - tickeasy-network
    command: redis-server --appendonly yes

  nginx:
    image: nginx:alpine
    container_name: tickeasy-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    networks:
      - tickeasy-network
    depends_on:
      - app

volumes:
  redis-data:

networks:
  tickeasy-network:
    driver: bridge
```

### 3. Nginx 配置
```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server app:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/s;

    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;
        
        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        # SSL 設定
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        # 安全標頭
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # API 端點
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            
            # 超時設定
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # 認證端點特殊限制
        location /api/v1/auth/ {
            limit_req zone=auth burst=10 nodelay;
            
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # 健康檢查
        location /api/v1/health {
            proxy_pass http://backend;
            access_log off;
        }
    }
}
```

## 雲端平台部署

### 1. AWS 部署 (使用 ECS)
```yaml
# task-definition.json
{
  "family": "tickeasy-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "tickeasy-backend",
      "image": "your-account.dkr.ecr.region.amazonaws.com/tickeasy-backend:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:prod/db-password"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/tickeasy-backend",
          "awslogs-region": "ap-northeast-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:3000/api/v1/health || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

### 2. Google Cloud Platform 部署 (使用 Cloud Run)
```yaml
# cloudbuild.yaml
steps:
  # 建構 Docker 映像
  - name: 'gcr.io/cloud-builders/docker'
    args: [
      'build',
      '-t', 'gcr.io/$PROJECT_ID/tickeasy-backend:$COMMIT_SHA',
      '-t', 'gcr.io/$PROJECT_ID/tickeasy-backend:latest',
      '.'
    ]

  # 推送到 Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/tickeasy-backend:$COMMIT_SHA']

  # 部署到 Cloud Run
  - name: 'gcr.io/cloud-builders/gcloud'
    args: [
      'run', 'deploy', 'tickeasy-backend',
      '--image', 'gcr.io/$PROJECT_ID/tickeasy-backend:$COMMIT_SHA',
      '--region', 'asia-east1',
      '--platform', 'managed',
      '--allow-unauthenticated',
      '--memory', '1Gi',
      '--cpu', '1',
      '--max-instances', '10',
      '--set-env-vars', 'NODE_ENV=production'
    ]

options:
  logging: CLOUD_LOGGING_ONLY
```

## CI/CD 管道

### GitHub Actions 工作流程
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
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
        run: npm test
      
      - name: Run linting
        run: npm run lint

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: .
          target: production
          push: true
          tags: |
            your-username/tickeasy-backend:latest
            your-username/tickeasy-backend:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
      
      - name: Deploy to production
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /opt/tickeasy
            docker-compose pull
            docker-compose up -d
            docker image prune -f
```

## 資料庫遷移

### 生產環境遷移腳本
```bash
#!/bin/bash
# migrate-production.sh

set -e

echo "開始生產環境資料庫遷移..."

# 備份資料庫
echo "正在備份資料庫..."
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 執行遷移
echo "執行遷移..."
npm run typeorm migration:run

echo "遷移完成！"
```

## 監控和日誌

### 1. 健康檢查端點
```typescript
// routes/health.ts
router.get('/', async (req: Request, res: Response) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    environment: process.env.NODE_ENV,
    version: process.env.APP_VERSION,
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      openai: await checkOpenAI()
    }
  };

  try {
    res.status(200).json(healthcheck);
  } catch (error) {
    healthcheck.message = error;
    res.status(503).json(healthcheck);
  }
});
```

### 2. Prometheus 監控
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'tickeasy-backend'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/api/v1/metrics'
    scrape_interval: 30s
```

### 3. 日誌配置
```typescript
// logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

## 安全性配置

### 1. SSL/TLS 設定
```bash
# 使用 Let's Encrypt 獲取 SSL 證書
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 2. 防火牆設定
```bash
# UFW 防火牆設定
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw enable
```

### 3. 安全標頭
```typescript
// 在 app.ts 中加入安全標頭
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

## 效能優化

### 1. 快取策略
```typescript
// Redis 快取設定
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});
```

### 2. 連接池優化
```typescript
// 資料庫連接池設定
export const AppDataSource = new DataSource({
  // ... 其他設定
  extra: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000
  }
});
```

## 故障排除

### 常見問題解決方案

1. **容器無法啟動**
   ```bash
   # 檢查日誌
   docker logs tickeasy-backend
   
   # 檢查健康狀態
   docker inspect tickeasy-backend
   ```

2. **資料庫連接失敗**
   ```bash
   # 測試資料庫連接
   psql $DATABASE_URL -c "SELECT 1;"
   ```

3. **記憶體不足**
   ```bash
   # 檢查記憶體使用情況
   docker stats tickeasy-backend
   
   # 調整 Docker 記憶體限制
   docker update --memory=2g tickeasy-backend
   ```

## 備份和恢復

### 自動備份腳本
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# 資料庫備份
pg_dump $DATABASE_URL | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# 清理舊備份（保留 7 天）
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "備份完成: db_backup_$DATE.sql.gz"
```

### 恢復程序
```bash
# 恢復資料庫
gunzip -c backup_file.sql.gz | psql $DATABASE_URL
```

## 總結

這份部署指南涵蓋了 Tickeasy 系統從開發到生產環境的完整部署流程。請根據您的具體需求調整配置參數，並確保在生產環境中實施適當的安全措施和監控機制。 