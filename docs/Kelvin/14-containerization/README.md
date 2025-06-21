# 第十四章：容器化部署

## 章節概述
本章節詳細介紹 Tickeasy 系統的容器化部署策略，包括 Docker 優化、多階段建構、容器安全、本地開發環境等完整的容器化解決方案。

## 目錄
1. [Dockerfile 優化](./01-dockerfile-optimization.md)
2. [Docker Compose 配置](./02-docker-compose.md)
3. [多階段建構](./03-multi-stage-build.md)
4. [容器安全](./04-container-security.md)
5. [本地開發環境](./05-local-development.md)

## 核心技術
- **容器化**: Docker + Docker Compose
- **編排**: Kubernetes (可選)
- **鏡像倉庫**: Docker Hub / AWS ECR
- **監控**: cAdvisor + Prometheus

## 學習目標
完成本章節後，您將能夠：
1. 建立最佳化的 Docker 映像
2. 設計多階段建構流程
3. 配置完整的容器化開發環境
4. 實作容器安全最佳實務
5. 部署可擴展的容器化應用

## 容器化架構

### 整體架構圖
```
┌─────────────────────────────────────┐
│           Load Balancer             │
│              (Nginx)                │
└─────────────┬───────────────────────┘
              │
    ┌─────────▼─────────┐
    │    App Container  │
    │   (Node.js API)   │
    │                   │
    ├───────────────────┤
    │    Redis Cache    │
    └─────────┬─────────┘
              │
    ┌─────────▼─────────┐
    │   PostgreSQL DB   │
    │   (Supabase)      │
    └───────────────────┘
```

### 服務組成
- **API 服務**: Node.js + Express 應用
- **快取服務**: Redis
- **資料庫**: PostgreSQL (Supabase)
- **代理服務**: Nginx
- **監控服務**: Prometheus + Grafana

## Docker 映像優化

### 1. 生產級 Dockerfile
```dockerfile
# 多階段建構 Dockerfile
# 階段 1: 建構階段
FROM node:18-alpine AS builder

# 設定工作目錄
WORKDIR /app

# 複製 package 檔案
COPY package*.json ./

# 安裝依賴 (包含 devDependencies)
RUN npm ci

# 複製源碼
COPY . .

# 建構應用程式
RUN npm run build

# 移除開發依賴
RUN npm prune --production

# 階段 2: 運行階段
FROM node:18-alpine AS production

# 建立非 root 用戶
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# 安裝必要的系統套件
RUN apk add --no-cache \
    curl \
    dumb-init \
    && rm -rf /var/cache/apk/*

# 設定工作目錄
WORKDIR /app

# 複製建構結果
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nextjs:nodejs /app/views ./views

# 切換到非 root 用戶
USER nextjs

# 暴露端口
EXPOSE 3000

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

# 使用 dumb-init 處理信號
ENTRYPOINT ["dumb-init", "--"]

# 啟動應用程式
CMD ["node", "dist/bin/server.js"]
```

### 2. .dockerignore 優化
```dockerignore
# Git
.git
.gitignore

# Documentation
README.md
docs/
*.md

# Dependencies
node_modules
npm-debug.log*

# Testing
coverage/
.nyc_output

# Development
.env.local
.env.development
.vscode/
.idea/

# Build outputs
dist/
build/

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Temporary folders
.tmp
temp/

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db
```

## Docker Compose 配置

### 1. 開發環境配置
```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
      target: development
    container_name: tickeasy-backend-dev
    restart: unless-stopped
    ports:
      - "3000:3000"
      - "9229:9229"  # Debug port
    environment:
      - NODE_ENV=development
      - DB_HOST=postgres
      - REDIS_HOST=redis
    env_file:
      - .env.development
    volumes:
      - .:/app
      - /app/node_modules
    networks:
      - tickeasy-network
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    command: npm run dev

  postgres:
    image: postgres:14-alpine
    container_name: tickeasy-postgres-dev
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: tickeasy_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - tickeasy-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: tickeasy-redis-dev
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - tickeasy-network
    command: redis-server --appendonly yes

  nginx:
    image: nginx:alpine
    container_name: tickeasy-nginx-dev
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - ./nginx/dev.conf:/etc/nginx/nginx.conf
    networks:
      - tickeasy-network
    depends_on:
      - app

volumes:
  postgres_data:
  redis_data:

networks:
  tickeasy-network:
    driver: bridge
```

### 2. 生產環境配置
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    image: tickeasy/backend:${VERSION:-latest}
    container_name: tickeasy-backend
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    volumes:
      - ./logs:/app/logs
    networks:
      - tickeasy-network
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
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
      - "127.0.0.1:6379:6379"
    volumes:
      - redis_data:/data
      - ./redis/redis.conf:/usr/local/etc/redis/redis.conf
    networks:
      - tickeasy-network
    command: redis-server /usr/local/etc/redis/redis.conf
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

  nginx:
    image: nginx:alpine
    container_name: tickeasy-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/prod.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
      - nginx_logs:/var/log/nginx
    networks:
      - tickeasy-network
    depends_on:
      - app

  prometheus:
    image: prom/prometheus:latest
    container_name: tickeasy-prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    networks:
      - tickeasy-network

  grafana:
    image: grafana/grafana:latest
    container_name: tickeasy-grafana
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - tickeasy-network

volumes:
  redis_data:
  nginx_logs:
  prometheus_data:
  grafana_data:

networks:
  tickeasy-network:
    driver: bridge
```

## 開發環境 Dockerfile

### 1. 開發專用 Dockerfile
```dockerfile
# Dockerfile.dev
FROM node:18-alpine AS development

# 安裝開發工具
RUN apk add --no-cache \
    git \
    curl \
    vim \
    && rm -rf /var/cache/apk/*

# 設定工作目錄
WORKDIR /app

# 複製 package 檔案
COPY package*.json ./

# 安裝所有依賴 (包含開發依賴)
RUN npm ci

# 複製源碼
COPY . .

# 暴露端口
EXPOSE 3000 9229

# 開發模式啟動
CMD ["npm", "run", "dev"]
```

## 容器安全最佳實務

### 1. 安全掃描配置
```yaml
# security-scan.yml
name: Container Security Scan

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: docker build -t tickeasy-backend:${{ github.sha }} .
      
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'tickeasy-backend:${{ github.sha }}'
          format: 'sarif'
          output: 'trivy-results.sarif'
      
      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
```

### 2. 安全配置
```dockerfile
# 安全 Dockerfile 範例
FROM node:18-alpine

# 更新系統套件
RUN apk update && apk upgrade

# 建立非特權用戶
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# 設定檔案權限
WORKDIR /app
COPY --chown=appuser:appgroup . .

# 移除不必要的套件和檔案
RUN apk del apk-tools && \
    rm -rf /var/cache/apk/* && \
    rm -rf /tmp/*

# 設定安全標頭
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=1024"

# 使用非 root 用戶
USER appuser

# 只暴露必要端口
EXPOSE 3000

# 讀取專用檔案系統
VOLUME ["/app/logs"]

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

## 容器監控

### 1. Prometheus 配置
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'tickeasy-backend'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/api/v1/metrics'
    scrape_interval: 30s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:9113']

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']
```

### 2. 應用程式監控端點
```typescript
// metrics.ts
import promClient from 'prom-client';
import { Request, Response } from 'express';

// 建立 metrics 註冊表
const register = new promClient.Registry();

// 預設 metrics
promClient.collectDefaultMetrics({ register });

// 自定義 metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});

const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(activeConnections);

// Metrics 中間件
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    
    httpRequestDuration
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration);
    
    httpRequestTotal
      .labels(req.method, route, res.statusCode.toString())
      .inc();
  });
  
  next();
};

// Metrics 端點
export const getMetrics = async (req: Request, res: Response): Promise<void> => {
  res.set('Content-Type', register.contentType);
  const metrics = await register.metrics();
  res.send(metrics);
};
```

## 部署腳本

### 1. 自動化部署腳本
```bash
#!/bin/bash
# deploy.sh

set -e

# 設定變數
APP_NAME="tickeasy-backend"
VERSION=${1:-latest}
ENV=${2:-production}

echo "🚀 Starting deployment of $APP_NAME:$VERSION to $ENV environment"

# 檢查 Docker 是否運行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running"
    exit 1
fi

# 拉取最新映像
echo "📦 Pulling latest image..."
docker pull $APP_NAME:$VERSION

# 備份當前版本
echo "💾 Creating backup..."
docker tag $APP_NAME:current $APP_NAME:backup-$(date +%Y%m%d-%H%M%S) || true

# 停止舊容器
echo "⏹️ Stopping old containers..."
docker-compose -f docker-compose.$ENV.yml down

# 啟動新容器
echo "🔄 Starting new containers..."
VERSION=$VERSION docker-compose -f docker-compose.$ENV.yml up -d

# 等待健康檢查
echo "🏥 Waiting for health check..."
sleep 30

# 檢查服務狀態
echo "🔍 Checking service status..."
if curl -f http://localhost:3000/api/v1/health; then
    echo "✅ Deployment successful!"
    
    # 清理舊映像
    echo "🧹 Cleaning up old images..."
    docker image prune -f
else
    echo "❌ Health check failed, rolling back..."
    
    # 回滾到之前版本
    docker-compose -f docker-compose.$ENV.yml down
    docker tag $APP_NAME:backup-$(date +%Y%m%d) $APP_NAME:current
    docker-compose -f docker-compose.$ENV.yml up -d
    
    exit 1
fi

echo "🎉 Deployment completed successfully!"
```

### 2. 滾動更新腳本
```bash
#!/bin/bash
# rolling-update.sh

APP_NAME="tickeasy-backend"
NEW_VERSION=$1

if [ -z "$NEW_VERSION" ]; then
    echo "Usage: $0 <version>"
    exit 1
fi

echo "Starting rolling update to version $NEW_VERSION"

# 取得當前運行的容器
CONTAINERS=$(docker ps --filter "label=app=$APP_NAME" --format "{{.Names}}")

for container in $CONTAINERS; do
    echo "Updating container: $container"
    
    # 啟動新容器
    docker run -d \
        --name "${container}-new" \
        --label "app=$APP_NAME" \
        --network tickeasy-network \
        $APP_NAME:$NEW_VERSION
    
    # 等待新容器準備就緒
    sleep 10
    
    # 檢查健康狀態
    if docker exec "${container}-new" curl -f http://localhost:3000/api/v1/health; then
        echo "New container is healthy, removing old container"
        docker stop $container
        docker rm $container
        docker rename "${container}-new" $container
    else
        echo "New container failed health check, removing it"
        docker stop "${container}-new"
        docker rm "${container}-new"
        exit 1
    fi
done

echo "Rolling update completed successfully"
```

## 核心特性
- ✅ 多階段 Docker 建構優化
- ✅ 完整的 Docker Compose 環境
- ✅ 容器安全最佳實務
- ✅ 開發與生產環境分離
- ✅ 容器監控與日誌收集
- ✅ 自動化部署與回滾
- ✅ 健康檢查與故障恢復

## 最佳實務
1. **映像優化**: 使用 Alpine Linux、多階段建構
2. **安全性**: 非 root 用戶、最小權限原則
3. **監控**: 健康檢查、Metrics 收集
4. **備份**: 資料持久化、定期備份
5. **CI/CD**: 自動化建構與部署

## 相關檔案
- `Dockerfile` - 生產環境映像
- `Dockerfile.dev` - 開發環境映像
- `docker-compose.yml` - 服務編排
- `.dockerignore` - Docker 忽略檔案
- `deploy.sh` - 部署腳本
- `monitoring/` - 監控配置