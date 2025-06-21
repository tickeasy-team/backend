# 第十七章：安全性最佳實務

## 章節概述
本章節詳細介紹 Tickeasy 系統的安全性實作與最佳實務，包括認證安全、資料加密、API 防護、注入攻擊防護和安全標頭配置等關鍵安全措施。

## 目錄
1. [認證安全強化](./01-authentication-security.md)
2. [資料加密策略](./02-data-encryption.md)
3. [API 安全防護](./03-api-security.md)
4. [SQL 注入防護](./04-sql-injection-prevention.md)
5. [安全標頭設定](./05-security-headers.md)

## 安全框架
- **認證**: JWT + Refresh Token + MFA
- **授權**: RBAC (Role-Based Access Control)
- **加密**: AES-256 + bcrypt + TLS 1.3
- **防護**: Helmet + CORS + Rate Limiting
- **監控**: Security Event Logging

## 學習目標
完成本章節後，您將能夠：
1. 實作多層次的認證安全機制
2. 設計完整的資料加密策略
3. 建立 API 安全防護體系
4. 防範常見的注入攻擊
5. 配置全面的安全標頭保護

## 安全威脅模型

### OWASP Top 10 防護清單
```
1. ✅ 注入攻擊 (SQL Injection)
2. ✅ 失效的認證 (Broken Authentication)
3. ✅ 敏感資料外洩 (Sensitive Data Exposure)
4. ✅ XML 外部實體 (XXE)
5. ✅ 失效的存取控制 (Broken Access Control)
6. ✅ 安全設定錯誤 (Security Misconfiguration)
7. ✅ 跨站腳本攻擊 (XSS)
8. ✅ 不安全的反序列化 (Insecure Deserialization)
9. ✅ 已知漏洞元件 (Known Vulnerabilities)
10. ✅ 記錄和監控不足 (Insufficient Logging)
```

## 認證安全強化

### 1. JWT 安全最佳實務
```typescript
// config/jwtSecurity.ts
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

interface JWTConfig {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
  algorithm: jwt.Algorithm;
  issuer: string;
  audience: string;
}

class SecureJWTService {
  private config: JWTConfig;
  private blacklistedTokens = new Set<string>();

  constructor() {
    this.config = {
      accessTokenSecret: this.generateSecureSecret(),
      refreshTokenSecret: this.generateSecureSecret(),
      accessTokenExpiry: '15m',
      refreshTokenExpiry: '7d',
      algorithm: 'HS256',
      issuer: 'tickeasy-backend',
      audience: 'tickeasy-frontend'
    };
  }

  generateAccessToken(payload: any): string {
    const tokenPayload = {
      ...payload,
      jti: crypto.randomUUID(), // JWT ID for revocation
      iat: Math.floor(Date.now() / 1000),
      type: 'access'
    };

    return jwt.sign(tokenPayload, this.config.accessTokenSecret, {
      expiresIn: this.config.accessTokenExpiry,
      algorithm: this.config.algorithm,
      issuer: this.config.issuer,
      audience: this.config.audience
    });
  }

  generateRefreshToken(payload: any): string {
    const tokenPayload = {
      userId: payload.userId,
      jti: crypto.randomUUID(),
      iat: Math.floor(Date.now() / 1000),
      type: 'refresh'
    };

    return jwt.sign(tokenPayload, this.config.refreshTokenSecret, {
      expiresIn: this.config.refreshTokenExpiry,
      algorithm: this.config.algorithm,
      issuer: this.config.issuer,
      audience: this.config.audience
    });
  }

  verifyAccessToken(token: string): any {
    if (this.blacklistedTokens.has(token)) {
      throw new Error('Token has been revoked');
    }

    try {
      const decoded = jwt.verify(token, this.config.accessTokenSecret, {
        algorithms: [this.config.algorithm],
        issuer: this.config.issuer,
        audience: this.config.audience
      });

      if (typeof decoded === 'object' && decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  verifyRefreshToken(token: string): any {
    if (this.blacklistedTokens.has(token)) {
      throw new Error('Token has been revoked');
    }

    try {
      const decoded = jwt.verify(token, this.config.refreshTokenSecret, {
        algorithms: [this.config.algorithm],
        issuer: this.config.issuer,
        audience: this.config.audience
      });

      if (typeof decoded === 'object' && decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      throw new Error(`Refresh token verification failed: ${error.message}`);
    }
  }

  revokeToken(token: string): void {
    this.blacklistedTokens.add(token);
    
    // 在生產環境中，應該使用 Redis 等持久化存儲
    // 來存儲被撤銷的 token
  }

  private generateSecureSecret(): string {
    return crypto.randomBytes(64).toString('hex');
  }
}

export const jwtService = new SecureJWTService();
```

### 2. 密碼安全策略
```typescript
// services/passwordSecurity.ts
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(crypto.scrypt);

class PasswordSecurityService {
  private readonly BCRYPT_ROUNDS = 12;
  private readonly PASSWORD_MIN_LENGTH = 8;
  private readonly PEPPER = process.env.PASSWORD_PEPPER || '';

  // 密碼強度檢查
  validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
    score: number;
  } {
    const errors: string[] = [];
    let score = 0;

    // 長度檢查
    if (password.length < this.PASSWORD_MIN_LENGTH) {
      errors.push(`密碼長度至少需要 ${this.PASSWORD_MIN_LENGTH} 字符`);
    } else {
      score += 1;
    }

    // 複雜度檢查
    const checks = [
      { regex: /[a-z]/, message: '需要包含小寫字母', points: 1 },
      { regex: /[A-Z]/, message: '需要包含大寫字母', points: 1 },
      { regex: /[0-9]/, message: '需要包含數字', points: 1 },
      { regex: /[^a-zA-Z0-9]/, message: '需要包含特殊字符', points: 1 }
    ];

    checks.forEach(check => {
      if (check.regex.test(password)) {
        score += check.points;
      } else {
        errors.push(check.message);
      }
    });

    // 常見密碼檢查
    const commonPasswords = [
      'password', '123456', 'qwerty', 'admin', 'letmein',
      'welcome', 'monkey', '1234567890'
    ];

    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('不能使用常見密碼');
      score = 0;
    }

    return {
      isValid: errors.length === 0,
      errors,
      score: Math.min(score, 5)
    };
  }

  // 安全的密碼雜湊
  async hashPassword(password: string): Promise<string> {
    const validation = this.validatePasswordStrength(password);
    if (!validation.isValid) {
      throw new Error(`Password validation failed: ${validation.errors.join(', ')}`);
    }

    // 添加 pepper
    const pepperedPassword = password + this.PEPPER;
    
    // 使用 bcrypt 進行雜湊
    return await bcrypt.hash(pepperedPassword, this.BCRYPT_ROUNDS);
  }

  // 驗證密碼
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const pepperedPassword = password + this.PEPPER;
    return await bcrypt.compare(pepperedPassword, hash);
  }

  // 生成安全的隨機密碼
  generateSecurePassword(length: number = 16): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      password += charset[randomIndex];
    }
    
    return password;
  }

  // 密碼重設 token
  async generatePasswordResetToken(userId: string): Promise<string> {
    const payload = {
      userId,
      purpose: 'password_reset',
      exp: Math.floor(Date.now() / 1000) + (60 * 15) // 15 minutes
    };

    const secret = process.env.PASSWORD_RESET_SECRET + userId;
    return jwt.sign(payload, secret);
  }

  async verifyPasswordResetToken(token: string, userId: string): Promise<boolean> {
    try {
      const secret = process.env.PASSWORD_RESET_SECRET + userId;
      const decoded = jwt.verify(token, secret) as any;
      
      return decoded.userId === userId && decoded.purpose === 'password_reset';
    } catch (error) {
      return false;
    }
  }
}

export const passwordSecurity = new PasswordSecurityService();
```

### 3. 多因子認證 (MFA)
```typescript
// services/mfaService.ts
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

class MFAService {
  // 生成 TOTP 密鑰
  generateSecret(userEmail: string): {
    secret: string;
    otpauthUrl: string;
    qrCode: Promise<string>;
  } {
    const secret = speakeasy.generateSecret({
      name: userEmail,
      issuer: 'Tickeasy',
      length: 32
    });

    const qrCode = QRCode.toDataURL(secret.otpauth_url!);

    return {
      secret: secret.base32!,
      otpauthUrl: secret.otpauth_url!,
      qrCode
    };
  }

  // 驗證 TOTP 代碼
  verifyTOTP(token: string, secret: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1 // 允許前後 30 秒的時間偏差
    });
  }

  // 生成備用代碼
  generateBackupCodes(count: number = 8): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    
    return codes;
  }

  // 驗證備用代碼
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const user = await User.findOne({
      where: { id: userId },
      select: ['backupCodes']
    });

    if (!user || !user.backupCodes.includes(code)) {
      return false;
    }

    // 使用後移除備用代碼
    user.backupCodes = user.backupCodes.filter(c => c !== code);
    await user.save();

    return true;
  }
}

export const mfaService = new MFAService();
```

## API 安全防護

### 1. 速率限制策略
```typescript
// middlewares/rateLimiting.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redisClient } from '../config/redis';

// 創建 Redis 存儲
const redisStore = new RedisStore({
  sendCommand: (...args: string[]) => redisClient.call(...args) as any
});

// 一般 API 速率限制
export const generalRateLimit = rateLimit({
  store: redisStore,
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 100, // 限制每個 IP 100 次請求
  message: {
    status: 'failed',
    message: '請求過於頻繁，請稍後再試'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // 對於認證用戶使用用戶 ID，否則使用 IP
    return req.user?.id || req.ip;
  }
});

// 認證端點嚴格限制
export const authRateLimit = rateLimit({
  store: redisStore,
  windowMs: 15 * 60 * 1000,
  max: 5, // 15 分鐘內最多 5 次認證嘗試
  message: {
    status: 'failed',
    message: '登入嘗試次數過多，請 15 分鐘後再試'
  },
  skipSuccessfulRequests: true, // 成功請求不計入限制
  keyGenerator: (req) => {
    // 使用 IP + email 作為鍵值
    const email = req.body?.email || '';
    return `auth:${req.ip}:${email}`;
  }
});

// 檔案上傳限制
export const uploadRateLimit = rateLimit({
  store: redisStore,
  windowMs: 60 * 60 * 1000, // 1 小時
  max: 20, // 每小時最多 20 次上傳
  message: {
    status: 'failed',
    message: '檔案上傳次數超過限制'
  }
});

// 自適應速率限制
export const adaptiveRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const userRole = req.user?.role;
  
  // 根據用戶角色調整限制
  const limits = {
    admin: 1000,
    organizer: 500,
    user: 100,
    anonymous: 50
  };

  const limit = limits[userRole as keyof typeof limits] || limits.anonymous;

  const dynamicRateLimit = rateLimit({
    store: redisStore,
    windowMs: 15 * 60 * 1000,
    max: limit,
    keyGenerator: (req) => req.user?.id || req.ip
  });

  dynamicRateLimit(req, res, next);
};
```

### 2. 輸入驗證與淨化
```typescript
// middlewares/inputValidation.ts
import { body, param, query, validationResult } from 'express-validator';
import validator from 'validator';
import DOMPurify from 'isomorphic-dompurify';

// 自定義驗證器
const customValidators = {
  isStrongPassword: (value: string) => {
    return validator.isStrongPassword(value, {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1
    });
  },

  isValidUUID: (value: string) => {
    return validator.isUUID(value, 4);
  },

  isSafeString: (value: string) => {
    // 檢查是否包含潛在危險字符
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /eval\s*\(/i,
      /expression\s*\(/i
    ];

    return !dangerousPatterns.some(pattern => pattern.test(value));
  }
};

// 通用驗證中間件
export const validateAndSanitize = (validations: any[]) => {
  return [
    ...validations,
    (req: Request, res: Response, next: NextFunction) => {
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'failed',
          message: '輸入資料驗證失敗',
          errors: errors.array()
        });
      }

      // 淨化輸入資料
      sanitizeRequestData(req);
      next();
    }
  ];
};

// 資料淨化函數
function sanitizeRequestData(req: Request): void {
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      // 移除潛在的 HTML/JavaScript
      return DOMPurify.sanitize(obj, { 
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: []
      });
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    
    return obj;
  };

  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query);
  req.params = sanitizeObject(req.params);
}

// 用戶註冊驗證
export const validateUserRegistration = validateAndSanitize([
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('姓名長度必須在 2-50 字符之間')
    .custom(customValidators.isSafeString)
    .withMessage('姓名包含不安全字符'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('請提供有效的電子郵件地址'),
  
  body('password')
    .custom(customValidators.isStrongPassword)
    .withMessage('密碼強度不足：需要至少8位，包含大小寫字母、數字和特殊字符'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('密碼確認不一致');
      }
      return true;
    })
]);

// 演唱會創建驗證
export const validateConcertCreation = validateAndSanitize([
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('演唱會標題長度必須在 1-200 字符之間')
    .custom(customValidators.isSafeString),
  
  body('description')
    .trim()
    .isLength({ max: 2000 })
    .withMessage('描述長度不能超過 2000 字符')
    .custom(customValidators.isSafeString),
  
  body('venueId')
    .custom(customValidators.isValidUUID)
    .withMessage('場地 ID 格式無效'),
  
  body('organizationId')
    .custom(customValidators.isValidUUID)
    .withMessage('組織 ID 格式無效'),
  
  body('category')
    .isIn(['pop', 'rock', 'classical', 'jazz', 'electronic', 'folk', 'other'])
    .withMessage('演唱會分類無效')
]);
```

### 3. CORS 安全配置
```typescript
// config/cors.ts
import cors from 'cors';

const allowedOrigins = [
  'https://tickeasy.com',
  'https://www.tickeasy.com',
  'https://admin.tickeasy.com'
];

// 開發環境添加本地域名
if (process.env.NODE_ENV === 'development') {
  allowedOrigins.push(
    'http://localhost:3000',
    'http://localhost:3010',
    'http://127.0.0.1:3000'
  );
}

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // 允許沒有 origin 的請求（如移動應用）
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  
  credentials: true, // 允許攜帶認證信息
  
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Request-ID'
  ],
  
  exposedHeaders: [
    'X-Request-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining'
  ],
  
  maxAge: 86400, // 24 hours
  
  optionsSuccessStatus: 200
};
```

## SQL 注入防護

### 1. TypeORM 安全查詢
```typescript
// services/secureQueryService.ts
import { AppDataSource } from '../config/database';
import { Concert } from '../models/Concert';
import { User } from '../models/User';

class SecureQueryService {
  // ✅ 安全的參數化查詢
  async findConcertsByCategory(category: string): Promise<Concert[]> {
    return await Concert.find({
      where: { category },
      relations: ['venue', 'organization']
    });
  }

  // ✅ 使用 QueryBuilder 的安全查詢
  async searchConcerts(searchTerm: string, city?: string): Promise<Concert[]> {
    const queryBuilder = Concert.createQueryBuilder('concert')
      .leftJoinAndSelect('concert.venue', 'venue')
      .leftJoinAndSelect('concert.organization', 'organization')
      .where('concert.status = :status', { status: 'published' });

    if (searchTerm) {
      queryBuilder.andWhere(
        '(concert.title ILIKE :searchTerm OR concert.description ILIKE :searchTerm)',
        { searchTerm: `%${searchTerm}%` }
      );
    }

    if (city) {
      queryBuilder.andWhere('venue.city = :city', { city });
    }

    return await queryBuilder.getMany();
  }

  // ✅ 安全的原生查詢（必要時）
  async getTicketSalesReport(startDate: Date, endDate: Date): Promise<any[]> {
    return await AppDataSource.query(`
      SELECT 
        c.title as concert_title,
        COUNT(t.id) as tickets_sold,
        SUM(tt.price) as total_revenue
      FROM concerts c
      JOIN concert_sessions cs ON c.id = cs.concert_id
      JOIN tickets t ON cs.id = t.session_id
      JOIN ticket_types tt ON t.ticket_type_id = tt.id
      WHERE t.status = 'sold'
        AND t.created_at >= $1
        AND t.created_at <= $2
      GROUP BY c.id, c.title
      ORDER BY total_revenue DESC
    `, [startDate, endDate]);
  }

  // ❌ 危險的動態查詢示例（不要這樣做）
  // async unsafeSearch(userInput: string): Promise<any[]> {
  //   return await AppDataSource.query(`
  //     SELECT * FROM concerts WHERE title = '${userInput}'
  //   `);
  // }

  // ✅ 輸入驗證和清理
  private sanitizeUserInput(input: string): string {
    return input
      .replace(/['"`;\\]/g, '') // 移除危險字符
      .trim()
      .substring(0, 100); // 限制長度
  }

  // ✅ 白名單驗證
  private validateOrderBy(orderBy: string): string {
    const allowedColumns = ['title', 'created_at', 'start_time', 'price'];
    return allowedColumns.includes(orderBy) ? orderBy : 'created_at';
  }

  // ✅ 安全的動態排序
  async getConcertsWithSort(orderBy: string, direction: 'ASC' | 'DESC' = 'ASC'): Promise<Concert[]> {
    const safeOrderBy = this.validateOrderBy(orderBy);
    const safeDirection = direction === 'DESC' ? 'DESC' : 'ASC';

    return await Concert.createQueryBuilder('concert')
      .orderBy(`concert.${safeOrderBy}`, safeDirection)
      .getMany();
  }
}

export const secureQueryService = new SecureQueryService();
```

## 安全標頭配置

### 1. Helmet 安全標頭
```typescript
// config/securityHeaders.ts
import helmet from 'helmet';

export const securityHeadersConfig = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // 允許內聯樣式（開發需要）
        'https://fonts.googleapis.com'
      ],
      scriptSrc: [
        "'self'",
        'https://js.ecpay.com.tw', // ECPay 支付腳本
        'https://www.google.com' // Google OAuth
      ],
      imgSrc: [
        "'self'",
        'data:',
        'https:', // 允許所有 HTTPS 圖片
        'https://*.supabase.co' // Supabase Storage
      ],
      connectSrc: [
        "'self'",
        'https://api.openai.com', // OpenAI API
        'https://*.supabase.co' // Supabase API
      ],
      fontSrc: [
        "'self'",
        'https://fonts.googleapis.com',
        'https://fonts.gstatic.com'
      ],
      mediaSrc: ["'self'"],
      frameSrc: [
        'https://www.google.com' // Google OAuth iframe
      ],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },

  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 年
    includeSubDomains: true,
    preload: true
  },

  // X-Frame-Options
  frameguard: {
    action: 'deny'
  },

  // X-Content-Type-Options
  noSniff: true,

  // X-XSS-Protection
  xssFilter: true,

  // Referrer Policy
  referrerPolicy: {
    policy: ['strict-origin-when-cross-origin']
  },

  // Hide X-Powered-By header
  hidePoweredBy: true,

  // Expect-CT
  expectCt: {
    maxAge: 86400,
    enforce: true,
    reportUri: '/api/v1/security/ct-report'
  }
});

// 自定義安全中間件
export const additionalSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // 防止點擊劫持
  res.setHeader('X-Frame-Options', 'DENY');
  
  // 防止 MIME 類型嗅探
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // 防止瀏覽器 DNS 預取
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  
  // 防止下載執行
  res.setHeader('X-Download-Options', 'noopen');
  
  // Feature Policy
  res.setHeader('Permissions-Policy', 
    'geolocation=(), microphone=(), camera=(), payment=(self)'
  );

  next();
};
```

### 2. API 安全監控
```typescript
// middlewares/securityMonitoring.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { sentryLogger } from '../config/sentry';

// 安全事件監控
export const securityMonitoring = (req: Request, res: Response, next: NextFunction) => {
  const securityChecks = {
    suspiciousUserAgent: checkSuspiciousUserAgent(req),
    sqlInjectionAttempt: checkSQLInjection(req),
    xssAttempt: checkXSSAttempt(req),
    directoryTraversal: checkDirectoryTraversal(req),
    invalidMethodPath: checkInvalidMethodPath(req)
  };

  // 記錄安全事件
  Object.entries(securityChecks).forEach(([check, result]) => {
    if (result.suspicious) {
      logger.warn('Security alert', {
        type: 'security_event',
        check,
        details: result.details,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        method: req.method,
        userId: req.user?.id
      });

      // 嚴重安全威脅發送到 Sentry
      if (result.severity === 'high') {
        sentryLogger.captureMessage(`Security threat detected: ${check}`, 'warning', {
          request: {
            ip: req.ip,
            url: req.url,
            method: req.method,
            userAgent: req.get('User-Agent')
          },
          details: result.details
        });
      }
    }
  });

  next();
};

function checkSuspiciousUserAgent(req: Request): SecurityCheckResult {
  const userAgent = req.get('User-Agent') || '';
  const suspiciousPatterns = [
    /sqlmap/i,
    /nikto/i,
    /nessus/i,
    /openvas/i,
    /masscan/i,
    /zap/i
  ];

  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));

  return {
    suspicious: isSuspicious,
    severity: isSuspicious ? 'high' : 'low',
    details: { userAgent }
  };
}

function checkSQLInjection(req: Request): SecurityCheckResult {
  const sqlPatterns = [
    /(\s|^)(union|select|insert|update|delete|drop|create|alter|exec|execute)(\s|$)/i,
    /(\s|^)(or|and)(\s|$).*(=|<|>)/i,
    /'(\s|$|;)/,
    /;(\s|$)/,
    /--(\s|$)/,
    /\/\*/
  ];

  const testStrings = [
    JSON.stringify(req.body),
    JSON.stringify(req.query),
    JSON.stringify(req.params)
  ].join(' ');

  const isSuspicious = sqlPatterns.some(pattern => pattern.test(testStrings));

  return {
    suspicious: isSuspicious,
    severity: isSuspicious ? 'high' : 'low',
    details: { detectedIn: 'request_data' }
  };
}

function checkXSSAttempt(req: Request): SecurityCheckResult {
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i
  ];

  const testStrings = [
    JSON.stringify(req.body),
    JSON.stringify(req.query),
    req.get('Referer') || ''
  ].join(' ');

  const isSuspicious = xssPatterns.some(pattern => pattern.test(testStrings));

  return {
    suspicious: isSuspicious,
    severity: isSuspicious ? 'medium' : 'low',
    details: { detectedIn: 'request_data' }
  };
}

function checkDirectoryTraversal(req: Request): SecurityCheckResult {
  const traversalPatterns = [
    /\.\./,
    /\/etc\/passwd/,
    /\/etc\/shadow/,
    /\/proc\/self\/environ/,
    /\/windows\/system32/i
  ];

  const url = req.url || '';
  const isSuspicious = traversalPatterns.some(pattern => pattern.test(url));

  return {
    suspicious: isSuspicious,
    severity: isSuspicious ? 'high' : 'low',
    details: { url }
  };
}

function checkInvalidMethodPath(req: Request): SecurityCheckResult {
  const invalidPatterns = [
    /\.(php|asp|jsp|cgi)$/i,
    /\/admin\/config\//i,
    /\/wp-admin\//i,
    /\/phpmyadmin\//i
  ];

  const url = req.url || '';
  const isSuspicious = invalidPatterns.some(pattern => pattern.test(url));

  return {
    suspicious: isSuspicious,
    severity: isSuspicious ? 'medium' : 'low',
    details: { url, method: req.method }
  };
}

interface SecurityCheckResult {
  suspicious: boolean;
  severity: 'low' | 'medium' | 'high';
  details: any;
}
```

## 核心特性
- ✅ 多層次認證安全機制
- ✅ 強密碼策略與 MFA 支援
- ✅ 全面的 API 安全防護
- ✅ SQL 注入與 XSS 防護
- ✅ 安全標頭完整配置
- ✅ 即時安全監控與告警
- ✅ 輸入驗證與資料淨化

## 安全檢查清單
- [ ] 所有密碼都經過適當雜湊處理
- [ ] JWT token 有適當的過期時間
- [ ] 所有 API 端點都有速率限制
- [ ] 輸入驗證涵蓋所有用戶輸入
- [ ] 安全標頭已正確配置
- [ ] HTTPS 在生產環境中強制啟用
- [ ] 敏感資料已加密存儲
- [ ] 定期進行安全掃描和更新

## 最佳實務
1. **最小權限原則**: 只給予必要的權限
2. **深度防禦**: 多層安全控制
3. **持續監控**: 即時檢測和回應威脅
4. **定期更新**: 保持依賴套件更新
5. **安全教育**: 團隊安全意識培訓

## 相關檔案
- `config/securityHeaders.ts` - 安全標頭配置
- `middlewares/rateLimiting.ts` - 速率限制
- `middlewares/inputValidation.ts` - 輸入驗證
- `services/passwordSecurity.ts` - 密碼安全
- `services/mfaService.ts` - 多因子認證
- `middlewares/securityMonitoring.ts` - 安全監控