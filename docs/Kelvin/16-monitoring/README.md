# 第十六章：監控與維護系統

## 章節概述
本章節詳細介紹 Tickeasy 系統的監控與維護策略，包括健康檢查機制、日誌管理、錯誤追蹤、效能監控和告警系統等完整的可觀測性解決方案。

## 目錄
1. [健康檢查機制](./01-health-checks.md)
2. [日誌策略](./02-logging-strategy.md)
3. [錯誤追蹤 (Sentry)](./03-error-tracking.md)
4. [效能監控](./04-performance-metrics.md)
5. [告警系統](./05-alerting-system.md)

## 核心技術
- **監控平台**: Prometheus + Grafana
- **日誌收集**: Winston + ELK Stack
- **錯誤追蹤**: Sentry
- **APM**: New Relic / DataDog
- **告警**: PagerDuty + Slack

## 學習目標
完成本章節後，您將能夠：
1. 建立完整的系統健康檢查機制
2. 設計有效的日誌收集與分析策略
3. 實作錯誤追蹤與告警系統
4. 監控應用程式效能指標
5. 建立主動式維護流程

## 監控架構概覽

### 可觀測性三支柱
```
┌─────────────────────────────────────┐
│            Observability           │
├─────────────┬─────────────┬─────────┤
│   Metrics   │    Logs     │ Traces  │
├─────────────┼─────────────┼─────────┤
│ Prometheus  │   Winston   │ Jaeger  │
│   Grafana   │ ELK Stack   │ Zipkin  │
│    APM      │   Fluentd   │ OpenTel │
└─────────────┴─────────────┴─────────┘
```

### 監控數據流
```
Application
    │
    ▼
┌─────────────┐    ┌─────────────┐
│   Metrics   │───▶│ Prometheus  │
│ (Prometheus)│    │   Server    │
└─────────────┘    └─────┬───────┘
                         │
┌─────────────┐    ┌─────▼───────┐
│    Logs     │───▶│   Grafana   │
│  (Winston)  │    │ Dashboard   │
└─────────────┘    └─────┬───────┘
                         │
┌─────────────┐    ┌─────▼───────┐
│   Errors    │───▶│   Alerts    │
│  (Sentry)   │    │(PagerDuty)  │
└─────────────┘    └─────────────┘
```

## 健康檢查機制

### 1. 應用程式健康檢查
```typescript
// routes/health.ts
import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { redisClient } from '../config/redis';
import { supabaseClient } from '../config/supabase';
import { openai } from '../config/openai';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: HealthCheck;
    redis: HealthCheck;
    storage: HealthCheck;
    openai: HealthCheck;
    memory: HealthCheck;
    disk: HealthCheck;
  };
}

interface HealthCheck {
  status: 'pass' | 'fail' | 'warn';
  responseTime?: number;
  message?: string;
  details?: any;
}

class HealthCheckService {
  async performHealthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    const [
      database,
      redis,
      storage,
      openai,
      memory,
      disk
    ] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkStorage(),
      this.checkOpenAI(),
      this.checkMemory(),
      this.checkDisk()
    ]);

    const overallStatus = this.calculateOverallStatus([
      this.getResult(database),
      this.getResult(redis),
      this.getResult(storage),
      this.getResult(openai),
      this.getResult(memory),
      this.getResult(disk)
    ]);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: this.getResult(database),
        redis: this.getResult(redis),
        storage: this.getResult(storage),
        openai: this.getResult(openai),
        memory: this.getResult(memory),
        disk: this.getResult(disk)
      }
    };
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      await AppDataSource.query('SELECT 1');
      
      return {
        status: 'pass',
        responseTime: Date.now() - startTime,
        message: 'Database connection successful'
      };
    } catch (error) {
      return {
        status: 'fail',
        responseTime: Date.now() - startTime,
        message: 'Database connection failed',
        details: error.message
      };
    }
  }

  private async checkRedis(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      await redisClient.ping();
      
      return {
        status: 'pass',
        responseTime: Date.now() - startTime,
        message: 'Redis connection successful'
      };
    } catch (error) {
      return {
        status: 'fail',
        responseTime: Date.now() - startTime,
        message: 'Redis connection failed',
        details: error.message
      };
    }
  }

  private async checkStorage(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabaseClient.storage
        .from('tickeasy-files')
        .list('', { limit: 1 });
      
      if (error) throw error;
      
      return {
        status: 'pass',
        responseTime: Date.now() - startTime,
        message: 'Storage connection successful'
      };
    } catch (error) {
      return {
        status: 'fail',
        responseTime: Date.now() - startTime,
        message: 'Storage connection failed',
        details: error.message
      };
    }
  }

  private async checkOpenAI(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // 簡單的模型列表檢查
      await openai.models.list();
      
      return {
        status: 'pass',
        responseTime: Date.now() - startTime,
        message: 'OpenAI API accessible'
      };
    } catch (error) {
      return {
        status: 'warn', // OpenAI 不是關鍵服務，使用 warn
        responseTime: Date.now() - startTime,
        message: 'OpenAI API check failed',
        details: error.message
      };
    }
  }

  private async checkMemory(): Promise<HealthCheck> {
    const memUsage = process.memoryUsage();
    const totalMem = memUsage.heapTotal;
    const usedMem = memUsage.heapUsed;
    const memoryUsagePercent = (usedMem / totalMem) * 100;
    
    let status: 'pass' | 'warn' | 'fail' = 'pass';
    let message = 'Memory usage normal';
    
    if (memoryUsagePercent > 90) {
      status = 'fail';
      message = 'Critical memory usage';
    } else if (memoryUsagePercent > 80) {
      status = 'warn';
      message = 'High memory usage';
    }
    
    return {
      status,
      message,
      details: {
        usagePercent: memoryUsagePercent.toFixed(2),
        heapUsed: `${(usedMem / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(totalMem / 1024 / 1024).toFixed(2)} MB`
      }
    };
  }

  private async checkDisk(): Promise<HealthCheck> {
    try {
      const fs = require('fs');
      const stats = fs.statSync('/');
      
      // 簡化的磁碟檢查，實際使用中可能需要更詳細的磁碟空間檢查
      return {
        status: 'pass',
        message: 'Disk space adequate'
      };
    } catch (error) {
      return {
        status: 'warn',
        message: 'Disk check failed',
        details: error.message
      };
    }
  }

  private getResult(result: PromiseSettledResult<HealthCheck>): HealthCheck {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        status: 'fail',
        message: 'Health check error',
        details: result.reason
      };
    }
  }

  private calculateOverallStatus(checks: HealthCheck[]): 'healthy' | 'degraded' | 'unhealthy' {
    const hasFailures = checks.some(check => check.status === 'fail');
    const hasWarnings = checks.some(check => check.status === 'warn');
    
    if (hasFailures) return 'unhealthy';
    if (hasWarnings) return 'degraded';
    return 'healthy';
  }
}

const healthService = new HealthCheckService();

export const healthCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    const healthStatus = await healthService.performHealthCheck();
    
    const statusCode = healthStatus.status === 'healthy' ? 200 :
                      healthStatus.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      message: 'Health check failed',
      error: error.message
    });
  }
};
```

### 2. 深度健康檢查
```typescript
// routes/health-deep.ts
export const deepHealthCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    const checks = await Promise.allSettled([
      checkDatabasePerformance(),
      checkRedisPerformance(),
      checkApiEndpoints(),
      checkExternalServices(),
      checkSystemResources()
    ]);

    const results = checks.map((check, index) => ({
      name: ['database', 'redis', 'api', 'external', 'system'][index],
      result: check.status === 'fulfilled' ? check.value : check.reason
    }));

    res.json({
      status: 'completed',
      timestamp: new Date().toISOString(),
      checks: results
    });
  } catch (error) {
    res.status(500).json({
      status: 'failed',
      message: error.message
    });
  }
};

async function checkDatabasePerformance(): Promise<any> {
  const startTime = Date.now();
  
  // 執行一些複雜查詢測試資料庫效能
  const userCount = await User.count();
  const concertCount = await Concert.count();
  const orderCount = await Order.count();
  
  const responseTime = Date.now() - startTime;
  
  return {
    status: responseTime < 1000 ? 'pass' : 'warn',
    responseTime,
    details: { userCount, concertCount, orderCount }
  };
}

async function checkApiEndpoints(): Promise<any> {
  const endpoints = [
    '/api/v1/concerts',
    '/api/v1/users/profile',
    '/api/v1/orders'
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const startTime = Date.now();
    try {
      // 模擬內部 API 呼叫
      const response = await request(app).get(endpoint);
      results.push({
        endpoint,
        status: response.status < 400 ? 'pass' : 'fail',
        responseTime: Date.now() - startTime,
        statusCode: response.status
      });
    } catch (error) {
      results.push({
        endpoint,
        status: 'fail',
        responseTime: Date.now() - startTime,
        error: error.message
      });
    }
  }
  
  return results;
}
```

## 日誌管理策略

### 1. Winston 日誌配置
```typescript
// config/logger.ts
import winston from 'winston';
import 'winston-daily-rotate-file';

// 自定義日誌格式
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...meta
    });
  })
);

// 創建 logger 實例
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'tickeasy-backend',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // 錯誤日誌
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true
    }),
    
    // 組合日誌
    new winston.transports.DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true
    }),
    
    // 審計日誌
    new winston.transports.DailyRotateFile({
      filename: 'logs/audit-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'info',
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ],
  
  // 異常處理
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ]
});

// 開發環境添加 console 輸出
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// 結構化日誌方法
export const auditLogger = {
  userAction: (userId: string, action: string, details: any) => {
    logger.info('User action', {
      type: 'audit',
      userId,
      action,
      details,
      timestamp: new Date().toISOString()
    });
  },
  
  systemEvent: (event: string, details: any) => {
    logger.info('System event', {
      type: 'system',
      event,
      details,
      timestamp: new Date().toISOString()
    });
  },
  
  apiCall: (method: string, url: string, userId?: string, responseTime?: number) => {
    logger.info('API call', {
      type: 'api',
      method,
      url,
      userId,
      responseTime,
      timestamp: new Date().toISOString()
    });
  }
};
```

### 2. 請求日誌中間件
```typescript
// middlewares/requestLogger.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  // 添加請求 ID 到 request 物件
  req.requestId = requestId;
  
  // 添加請求 ID 到回應標頭
  res.setHeader('X-Request-ID', requestId);
  
  // 記錄請求開始
  logger.info('Request started', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id
  });
  
  // 監聽回應完成
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.id
    });
  });
  
  next();
};
```

## 錯誤追蹤 (Sentry)

### 1. Sentry 配置
```typescript
// config/sentry.ts
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { Express } from 'express';

export function initSentry(app: Express): void {
  if (!process.env.SENTRY_DSN) {
    console.warn('Sentry DSN not provided, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.APP_VERSION || '1.0.0',
    
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Tracing.Integrations.Express({ app }),
      new Tracing.Integrations.Postgres()
    ],
    
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    beforeSend(event, hint) {
      // 過濾敏感資訊
      if (event.request?.data) {
        delete event.request.data.password;
        delete event.request.data.confirmPassword;
        delete event.request.data.token;
      }
      
      return event;
    },
    
    beforeBreadcrumb(breadcrumb) {
      // 過濾敏感的 breadcrumb
      if (breadcrumb.category === 'http' && breadcrumb.data?.url?.includes('/auth/')) {
        delete breadcrumb.data.body;
      }
      
      return breadcrumb;
    }
  });

  // RequestHandler 必須是第一個中間件
  app.use(Sentry.Handlers.requestHandler());
  
  // TracingHandler 在 RequestHandler 之後
  app.use(Sentry.Handlers.tracingHandler());
}

export function setupSentryErrorHandler(app: Express): void {
  // ErrorHandler 必須在所有其他中間件和路由之後
  app.use(Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // 只報告 500 等級的錯誤
      return error.status === undefined || error.status >= 500;
    }
  }));
}

// 自定義錯誤報告
export const sentryLogger = {
  captureException: (error: Error, context?: any) => {
    Sentry.withScope(scope => {
      if (context) {
        scope.setContext('additional', context);
      }
      Sentry.captureException(error);
    });
  },
  
  captureMessage: (message: string, level: Sentry.Severity = 'info', context?: any) => {
    Sentry.withScope(scope => {
      if (context) {
        scope.setContext('additional', context);
      }
      Sentry.captureMessage(message, level);
    });
  },
  
  addBreadcrumb: (message: string, category: string, data?: any) => {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level: 'info'
    });
  }
};
```

### 2. 自定義錯誤類型
```typescript
// types/errors.ts
export class BaseError extends Error {
  public readonly name: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: any;

  constructor(
    name: string,
    statusCode: number,
    description: string,
    isOperational: boolean = true,
    context?: any
  ) {
    super(description);
    
    Object.setPrototypeOf(this, new.target.prototype);
    
    this.name = name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    
    Error.captureStackTrace(this);
  }
}

export class ValidationError extends BaseError {
  constructor(message: string, context?: any) {
    super('ValidationError', 400, message, true, context);
  }
}

export class AuthenticationError extends BaseError {
  constructor(message: string = 'Authentication failed', context?: any) {
    super('AuthenticationError', 401, message, true, context);
  }
}

export class AuthorizationError extends BaseError {
  constructor(message: string = 'Insufficient permissions', context?: any) {
    super('AuthorizationError', 403, message, true, context);
  }
}

export class NotFoundError extends BaseError {
  constructor(resource: string = 'Resource', context?: any) {
    super('NotFoundError', 404, `${resource} not found`, true, context);
  }
}

export class ConflictError extends BaseError {
  constructor(message: string, context?: any) {
    super('ConflictError', 409, message, true, context);
  }
}

export class DatabaseError extends BaseError {
  constructor(message: string, context?: any) {
    super('DatabaseError', 500, message, false, context);
  }
}

export class ExternalServiceError extends BaseError {
  constructor(service: string, message: string, context?: any) {
    super('ExternalServiceError', 502, `${service}: ${message}`, true, context);
  }
}
```

## 效能監控

### 1. Prometheus Metrics
```typescript
// config/metrics.ts
import promClient from 'prom-client';

// 建立註冊表
const register = new promClient.Registry();

// 收集預設指標
promClient.collectDefaultMetrics({ register });

// HTTP 請求指標
export const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10]
});

export const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// 資料庫指標
export const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
});

export const dbConnectionsActive = new promClient.Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections'
});

// Redis 指標
export const redisCommandDuration = new promClient.Histogram({
  name: 'redis_command_duration_seconds',
  help: 'Duration of Redis commands in seconds',
  labelNames: ['command'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
});

// 業務指標
export const activeUsers = new promClient.Gauge({
  name: 'active_users_total',
  help: 'Number of active users'
});

export const ticketsSold = new promClient.Counter({
  name: 'tickets_sold_total',
  help: 'Total number of tickets sold',
  labelNames: ['concert_id', 'ticket_type']
});

export const orderValue = new promClient.Histogram({
  name: 'order_value_twd',
  help: 'Order value in TWD',
  buckets: [100, 500, 1000, 2000, 5000, 10000, 20000, 50000]
});

// 註冊所有指標
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(dbQueryDuration);
register.registerMetric(dbConnectionsActive);
register.registerMetric(redisCommandDuration);
register.registerMetric(activeUsers);
register.registerMetric(ticketsSold);
register.registerMetric(orderValue);

export { register };
```

### 2. 效能監控中間件
```typescript
// middlewares/metrics.ts
import { Request, Response, NextFunction } from 'express';
import { httpRequestDuration, httpRequestTotal } from '../config/metrics';

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000;
    const route = req.route?.path || req.path;
    const method = req.method;
    const statusCode = res.statusCode.toString();
    
    // 記錄請求持續時間
    httpRequestDuration
      .labels(method, route, statusCode)
      .observe(duration);
    
    // 計數請求總數
    httpRequestTotal
      .labels(method, route, statusCode)
      .inc();
  });
  
  next();
};

// 資料庫查詢監控
export const dbMetrics = {
  recordQuery: (operation: string, table: string, duration: number) => {
    dbQueryDuration
      .labels(operation, table)
      .observe(duration / 1000);
  }
};
```

## 告警系統

### 1. 告警規則配置
```yaml
# monitoring/alert-rules.yml
groups:
  - name: tickeasy-backend
    rules:
      # API 回應時間告警
      - alert: HighAPIResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High API response time"
          description: "95th percentile response time is {{ $value }}s"

      # 錯誤率告警
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "High error rate"
          description: "Error rate is {{ $value | humanizePercentage }}"

      # 資料庫連接告警
      - alert: DatabaseConnectionHigh
        expr: db_connections_active > 15
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High database connections"
          description: "Active connections: {{ $value }}"

      # 記憶體使用告警
      - alert: HighMemoryUsage
        expr: (process_resident_memory_bytes / 1024 / 1024) > 800
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage: {{ $value }}MB"

      # 服務健康檢查告警
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "{{ $labels.instance }} has been down for more than 1 minute"
```

### 2. 告警通知系統
```typescript
// services/alertService.ts
interface Alert {
  level: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  details?: any;
  timestamp: Date;
}

class AlertService {
  async sendAlert(alert: Alert): Promise<void> {
    // 根據告警等級決定通知方式
    switch (alert.level) {
      case 'critical':
        await Promise.all([
          this.sendSlackAlert(alert),
          this.sendPagerDutyAlert(alert),
          this.sendEmailAlert(alert)
        ]);
        break;
      case 'warning':
        await Promise.all([
          this.sendSlackAlert(alert),
          this.sendEmailAlert(alert)
        ]);
        break;
      case 'info':
        await this.sendSlackAlert(alert);
        break;
    }
  }

  private async sendSlackAlert(alert: Alert): Promise<void> {
    const webhook = process.env.SLACK_WEBHOOK_URL;
    if (!webhook) return;

    const color = {
      info: '#36a64f',
      warning: '#ff9900',
      critical: '#ff0000'
    }[alert.level];

    const payload = {
      attachments: [{
        color,
        title: alert.title,
        text: alert.message,
        timestamp: Math.floor(alert.timestamp.getTime() / 1000),
        fields: alert.details ? Object.entries(alert.details).map(([key, value]) => ({
          title: key,
          value: String(value),
          short: true
        })) : []
      }]
    };

    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }

  private async sendPagerDutyAlert(alert: Alert): Promise<void> {
    const apiKey = process.env.PAGERDUTY_API_KEY;
    if (!apiKey) return;

    const payload = {
      incident_key: `tickeasy-${Date.now()}`,
      event_type: 'trigger',
      description: alert.title,
      details: {
        message: alert.message,
        ...alert.details
      }
    };

    try {
      await fetch('https://events.pagerduty.com/generic/2010-04-15/create_event.json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token token=${apiKey}`
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error('Failed to send PagerDuty alert:', error);
    }
  }

  private async sendEmailAlert(alert: Alert): Promise<void> {
    // 實作郵件告警邏輯
    const emailService = require('../services/emailService');
    
    await emailService.sendAlertEmail({
      to: process.env.ALERT_EMAIL || 'admin@tickeasy.com',
      subject: `[${alert.level.toUpperCase()}] ${alert.title}`,
      message: alert.message,
      details: alert.details
    });
  }
}

export const alertService = new AlertService();

// 使用範例
export const systemAlerts = {
  databaseDown: () => alertService.sendAlert({
    level: 'critical',
    title: 'Database Connection Failed',
    message: 'Unable to connect to the database',
    timestamp: new Date()
  }),

  highMemoryUsage: (usage: number) => alertService.sendAlert({
    level: 'warning',
    title: 'High Memory Usage',
    message: `Memory usage is at ${usage}%`,
    details: { memoryUsage: `${usage}%` },
    timestamp: new Date()
  }),

  orderProcessingDelay: (delay: number) => alertService.sendAlert({
    level: 'warning',
    title: 'Order Processing Delay',
    message: `Order processing is delayed by ${delay}ms`,
    details: { delayMs: delay },
    timestamp: new Date()
  })
};
```

## 核心特性
- ✅ 全面的健康檢查機制
- ✅ 結構化日誌收集與分析
- ✅ 即時錯誤追蹤與報告
- ✅ 詳細的效能指標監控
- ✅ 智能告警與通知系統
- ✅ 可觀測性三支柱整合
- ✅ 自動化監控與維護

## 最佳實務
1. **主動監控**: 預防性告警而非被動回應
2. **分層告警**: 根據嚴重程度分級處理
3. **可觀測性**: Metrics、Logs、Traces 三者結合
4. **自動化**: 減少人工干預，提高回應速度
5. **持續改進**: 定期檢視和優化監控策略

## 相關檔案
- `config/logger.ts` - 日誌配置
- `config/sentry.ts` - 錯誤追蹤配置
- `config/metrics.ts` - Prometheus 指標
- `services/alertService.ts` - 告警服務
- `monitoring/` - 監控配置檔案
- `routes/health.ts` - 健康檢查端點