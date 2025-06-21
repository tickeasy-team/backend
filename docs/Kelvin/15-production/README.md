# 第十五章：生產環境配置

## 章節概述
本章節詳細介紹 Tickeasy 生產環境的配置與管理，包括環境變數管理、機密資料保護、負載平衡、SSL 配置和備份策略等關鍵主題。

## 目錄
1. [環境變數管理](./01-environment-variables.md)
2. [機密資料管理](./02-secrets-management.md)
3. [負載平衡配置](./03-load-balancing.md)
4. [SSL 證書設定](./04-ssl-configuration.md)
5. [備份策略](./05-backup-strategy.md)

## 核心架構
- **負載平衡器**: Nginx / AWS ALB
- **應用伺服器**: Node.js 叢集
- **資料庫**: Supabase PostgreSQL (HA)
- **快取層**: Redis Cluster
- **檔案儲存**: Supabase Storage + CDN

## 學習目標
完成本章節後，您將能夠：
1. 設計安全的生產環境配置
2. 實作機密資料管理策略
3. 配置高可用性的負載平衡
4. 設定 SSL/TLS 安全連線
5. 建立完整的資料備份方案

## 生產環境架構

### 高可用性架構圖
```
Internet
    │
    ▼
┌─────────────────┐
│  Load Balancer  │  ← Nginx / AWS ALB
│   (SSL Termination) │
└─────────┬───────┘
          │
    ┌─────▼─────┐
    │    WAF    │  ← Web Application Firewall
    └─────┬─────┘
          │
    ┌─────▼─────┐
    │  App Servers  │
    │ ┌───┐ ┌───┐ │  ← Node.js Instances
    │ │ 1 │ │ 2 │ │
    │ └───┘ └───┘ │
    └─────┬─────┘
          │
    ┌─────▼─────┐
    │ Redis Cluster │  ← Cache Layer
    └─────┬─────┘
          │
    ┌─────▼─────┐
    │ Supabase  │  ← Database (HA)
    │ PostgreSQL │
    └───────────┘
```

## 環境變數管理

### 1. 生產環境變數配置
```bash
# .env.production
# 應用程式設定
NODE_ENV=production
PORT=3000
APP_NAME="Tickeasy Production"
APP_VERSION=1.2.0
API_URL=https://api.tickeasy.com
FRONTEND_URL=https://tickeasy.com

# 資料庫設定 (Supabase)
DB_HOST=aws-0-ap-northeast-1.pooler.supabase.com
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=${SUPABASE_DB_PASSWORD}
DB_DATABASE=postgres
DB_SSL=true
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000

# Supabase 設定
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}

# JWT 設定
JWT_SECRET=${JWT_SECRET_KEY}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_ALGORITHM=HS256

# Redis 設定
REDIS_URL=redis://tickeasy-redis.cache.amazonaws.com:6379
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_DB=0
REDIS_MAX_RETRIES=3

# Google OAuth
GOOGLE_CLIENT_ID=${GOOGLE_OAUTH_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${GOOGLE_OAUTH_CLIENT_SECRET}
GOOGLE_CALLBACK_URL=https://api.tickeasy.com/api/v1/auth/google/callback

# OpenAI 設定
OPENAI_API_KEY=${OPENAI_API_KEY}
OPENAI_ORG_ID=${OPENAI_ORG_ID}
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_MAX_TOKENS=1000

# 郵件設定
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=${EMAIL_SERVICE_USER}
EMAIL_PASS=${EMAIL_SERVICE_PASSWORD}
EMAIL_SECURE=false
EMAIL_FROM="Tickeasy Support <support@tickeasy.com>"

# 安全性設定
CORS_ORIGIN=https://tickeasy.com,https://www.tickeasy.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
BCRYPT_ROUNDS=12

# 監控與日誌
LOG_LEVEL=info
SENTRY_DSN=${SENTRY_DSN}
NEW_RELIC_LICENSE_KEY=${NEW_RELIC_LICENSE_KEY}

# 檔案上傳
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/app/uploads
ALLOWED_MIME_TYPES=image/jpeg,image/png,image/webp

# 第三方服務
ECPAY_MERCHANT_ID=${ECPAY_MERCHANT_ID}
ECPAY_HASH_KEY=${ECPAY_HASH_KEY}
ECPAY_HASH_IV=${ECPAY_HASH_IV}
ECPAY_BASE_URL=https://payment.ecpay.com.tw
```

### 2. 環境變數驗證
```typescript
// config/environment.ts
import { cleanEnv, str, num, bool, url } from 'envalid';

export const env = cleanEnv(process.env, {
  // 應用程式設定
  NODE_ENV: str({ choices: ['development', 'test', 'production'] }),
  PORT: num({ default: 3000 }),
  API_URL: url(),
  FRONTEND_URL: url(),
  
  // 資料庫設定
  DB_HOST: str(),
  DB_PORT: num({ default: 5432 }),
  DB_USERNAME: str(),
  DB_PASSWORD: str(),
  DB_DATABASE: str(),
  DB_SSL: bool({ default: true }),
  
  // JWT 設定
  JWT_SECRET: str({ minLength: 32 }),
  JWT_EXPIRES_IN: str({ default: '15m' }),
  
  // Redis 設定
  REDIS_URL: str(),
  REDIS_PASSWORD: str({ default: '' }),
  
  // 第三方服務
  GOOGLE_CLIENT_ID: str(),
  GOOGLE_CLIENT_SECRET: str(),
  OPENAI_API_KEY: str(),
  
  // 安全性設定
  CORS_ORIGIN: str(),
  RATE_LIMIT_MAX_REQUESTS: num({ default: 100 }),
  
  // 監控
  SENTRY_DSN: str({ default: '' }),
  LOG_LEVEL: str({ choices: ['error', 'warn', 'info', 'debug'], default: 'info' })
});

// 環境變數驗證函數
export function validateEnvironment(): void {
  const requiredVars = [
    'DB_PASSWORD',
    'JWT_SECRET',
    'GOOGLE_CLIENT_SECRET',
    'OPENAI_API_KEY'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  console.log('✅ Environment validation passed');
}
```

## 機密資料管理

### 1. AWS Secrets Manager 整合
```typescript
// services/secretsManager.ts
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

class SecretsManager {
  private client: SecretsManagerClient;
  private secretsCache = new Map<string, any>();
  private cacheExpiry = new Map<string, number>();
  
  constructor() {
    this.client = new SecretsManagerClient({
      region: process.env.AWS_REGION || 'ap-northeast-1'
    });
  }
  
  async getSecret(secretName: string, cacheTTL: number = 300000): Promise<any> {
    // 檢查快取
    const now = Date.now();
    if (this.secretsCache.has(secretName) && 
        this.cacheExpiry.get(secretName)! > now) {
      return this.secretsCache.get(secretName);
    }
    
    try {
      const command = new GetSecretValueCommand({ SecretId: secretName });
      const response = await this.client.send(command);
      
      const secretValue = JSON.parse(response.SecretString || '{}');
      
      // 快取秘密
      this.secretsCache.set(secretName, secretValue);
      this.cacheExpiry.set(secretName, now + cacheTTL);
      
      return secretValue;
    } catch (error) {
      console.error(`Failed to retrieve secret ${secretName}:`, error);
      throw error;
    }
  }
  
  async refreshSecret(secretName: string): Promise<void> {
    this.secretsCache.delete(secretName);
    this.cacheExpiry.delete(secretName);
    await this.getSecret(secretName);
  }
}

export const secretsManager = new SecretsManager();

// 使用範例
async function initializeApp(): Promise<void> {
  const dbSecrets = await secretsManager.getSecret('tickeasy/database');
  const jwtSecrets = await secretsManager.getSecret('tickeasy/jwt');
  
  process.env.DB_PASSWORD = dbSecrets.password;
  process.env.JWT_SECRET = jwtSecrets.secretKey;
}
```

### 2. Kubernetes Secrets (可選)
```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: tickeasy-secrets
  namespace: production
type: Opaque
stringData:
  db-password: "${DB_PASSWORD}"
  jwt-secret: "${JWT_SECRET}"
  google-client-secret: "${GOOGLE_CLIENT_SECRET}"
  openai-api-key: "${OPENAI_API_KEY}"
  redis-password: "${REDIS_PASSWORD}"

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tickeasy-backend
spec:
  template:
    spec:
      containers:
      - name: app
        image: tickeasy/backend:latest
        env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: tickeasy-secrets
              key: db-password
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: tickeasy-secrets
              key: jwt-secret
```

## 負載平衡配置

### 1. Nginx 負載平衡器設定
```nginx
# nginx/production.conf
upstream backend {
    least_conn;
    server app1:3000 max_fails=3 fail_timeout=30s;
    server app2:3000 max_fails=3 fail_timeout=30s;
    server app3:3000 max_fails=3 fail_timeout=30s backup;
}

# 全域設定
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

http {
    # 基本設定
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # 性能優化
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    # Gzip 壓縮
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # 速率限制
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/s;
    limit_conn_zone $binary_remote_addr zone=conn_limit_per_ip:10m;
    
    # 日誌格式
    log_format main '$remote_addr - $remote_user [$time_local] '
                   '"$request" $status $body_bytes_sent '
                   '"$http_referer" "$http_user_agent" '
                   '$request_time $upstream_response_time';
    
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;
    
    # SSL 設定
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # 安全標頭
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # 主伺服器配置
    server {
        listen 443 ssl http2;
        listen [::]:443 ssl http2;
        server_name api.tickeasy.com;
        
        # SSL 證書
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        
        # 安全設定
        client_max_body_size 10M;
        limit_conn conn_limit_per_ip 20;
        
        # API 路由
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
            
            # 緩衝設定
            proxy_buffering on;
            proxy_buffer_size 4k;
            proxy_buffers 8 4k;
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
        
        # 健康檢查端點
        location /api/v1/health {
            proxy_pass http://backend;
            access_log off;
        }
        
        # 靜態檔案
        location /static/ {
            root /var/www;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # HTTP 重導向到 HTTPS
    server {
        listen 80;
        listen [::]:80;
        server_name api.tickeasy.com;
        return 301 https://$server_name$request_uri;
    }
}
```

### 2. AWS Application Load Balancer 設定
```yaml
# terraform/alb.tf
resource "aws_lb" "tickeasy_alb" {
  name               = "tickeasy-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets           = var.public_subnet_ids

  enable_deletion_protection = true

  tags = {
    Environment = "production"
    Application = "tickeasy"
  }
}

resource "aws_lb_target_group" "backend_tg" {
  name     = "tickeasy-backend-tg"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 10
    interval            = 30
    path               = "/api/v1/health"
    matcher            = "200"
    port               = "traffic-port"
    protocol           = "HTTP"
  }

  tags = {
    Environment = "production"
    Application = "tickeasy"
  }
}

resource "aws_lb_listener" "backend_listener" {
  load_balancer_arn = aws_lb.tickeasy_alb.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = var.ssl_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend_tg.arn
  }
}
```

## SSL/TLS 配置

### 1. Let's Encrypt 自動更新
```bash
#!/bin/bash
# scripts/renew-ssl.sh

set -e

DOMAIN="api.tickeasy.com"
EMAIL="admin@tickeasy.com"
NGINX_CONFIG="/etc/nginx/sites-available/tickeasy"

echo "🔄 Renewing SSL certificate for $DOMAIN"

# 停止 Nginx (如果使用 standalone 模式)
systemctl stop nginx

# 更新證書
certbot certonly \
  --standalone \
  --email $EMAIL \
  --agree-tos \
  --no-eff-email \
  --force-renewal \
  -d $DOMAIN

# 復製證書到 Nginx 目錄
cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /etc/nginx/ssl/cert.pem
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /etc/nginx/ssl/key.pem

# 設定權限
chown nginx:nginx /etc/nginx/ssl/*.pem
chmod 600 /etc/nginx/ssl/*.pem

# 測試 Nginx 配置
nginx -t

# 重新啟動 Nginx
systemctl start nginx

# 檢查證書有效性
echo "✅ SSL certificate renewed successfully"
openssl x509 -in /etc/nginx/ssl/cert.pem -text -noout | grep "Not After"
```

### 2. SSL 監控腳本
```bash
#!/bin/bash
# scripts/check-ssl.sh

DOMAIN="api.tickeasy.com"
ALERT_DAYS=30

# 取得證書到期日
EXPIRY_DATE=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)

# 轉換為秒數
EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
CURRENT_EPOCH=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_EPOCH - $CURRENT_EPOCH) / 86400 ))

echo "SSL certificate for $DOMAIN expires in $DAYS_UNTIL_EXPIRY days"

if [ $DAYS_UNTIL_EXPIRY -le $ALERT_DAYS ]; then
    echo "⚠️ SSL certificate expires soon!"
    
    # 發送告警 (可整合 Slack, Email 等)
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"SSL certificate for $DOMAIN expires in $DAYS_UNTIL_EXPIRY days\"}" \
        $SLACK_WEBHOOK_URL
fi
```

## 備份策略

### 1. 資料庫備份腳本
```bash
#!/bin/bash
# scripts/backup-database.sh

set -e

# 設定變數
BACKUP_DIR="/opt/backups/database"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="tickeasy_backup_$DATE.sql.gz"

# 建立備份目錄
mkdir -p $BACKUP_DIR

echo "🗄️ Starting database backup..."

# 執行備份
pg_dump $DATABASE_URL | gzip > "$BACKUP_DIR/$BACKUP_FILE"

# 驗證備份檔案
if [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
    echo "✅ Backup completed: $BACKUP_FILE ($BACKUP_SIZE)"
else
    echo "❌ Backup failed!"
    exit 1
fi

# 上傳到 S3 (可選)
if [ ! -z "$AWS_BUCKET" ]; then
    echo "☁️ Uploading to S3..."
    aws s3 cp "$BACKUP_DIR/$BACKUP_FILE" "s3://$AWS_BUCKET/backups/"
fi

# 清理舊備份
echo "🧹 Cleaning up old backups (older than $RETENTION_DAYS days)..."
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "✅ Backup process completed successfully"
```

### 2. 應用程式狀態備份
```bash
#!/bin/bash
# scripts/backup-app-state.sh

BACKUP_DIR="/opt/backups/app-state"
DATE=$(date +%Y%m%d_%H%M%S)

# 備份 Redis 資料
echo "💾 Backing up Redis data..."
redis-cli --rdb "$BACKUP_DIR/redis_backup_$DATE.rdb"

# 備份上傳檔案
echo "📁 Backing up uploaded files..."
tar -czf "$BACKUP_DIR/uploads_backup_$DATE.tar.gz" /app/uploads

# 備份日誌檔案
echo "📝 Backing up logs..."
tar -czf "$BACKUP_DIR/logs_backup_$DATE.tar.gz" /app/logs

# 備份配置檔案
echo "⚙️ Backing up configuration..."
tar -czf "$BACKUP_DIR/config_backup_$DATE.tar.gz" \
    /etc/nginx/nginx.conf \
    /app/.env.production \
    /app/docker-compose.yml

echo "✅ Application state backup completed"
```

## 核心特性
- ✅ 安全的環境變數管理
- ✅ 機密資料加密存儲
- ✅ 高可用性負載平衡
- ✅ 自動 SSL 證書更新
- ✅ 完整的備份策略
- ✅ 監控與告警機制
- ✅ 災難恢復計劃

## 最佳實務
1. **安全性優先**: 加密敏感資料、最小權限原則
2. **高可用性**: 多實例部署、故障轉移
3. **監控告警**: 實時監控、主動告警
4. **定期備份**: 自動化備份、定期恢復測試
5. **文檔化**: 完整的運維文檔和流程

## 相關檔案
- `.env.production` - 生產環境變數
- `nginx/production.conf` - Nginx 配置
- `scripts/backup-*.sh` - 備份腳本
- `scripts/renew-ssl.sh` - SSL 更新腳本
- `terraform/` - 基礎設施代碼
- `k8s/` - Kubernetes 配置