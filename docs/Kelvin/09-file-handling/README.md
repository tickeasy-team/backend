# 第九章：檔案處理系統

## 章節概述
本章節詳細介紹 Tickeasy 檔案處理系統的設計與實作，包括圖片上傳、Supabase Storage 整合、檔案驗證、圖片處理和 CDN 優化等功能。

## 目錄
1. [圖片上傳功能](./01-image-upload.md)
2. [Supabase Storage 整合](./02-supabase-storage.md)
3. [檔案驗證與安全](./03-file-validation.md)
4. [圖片處理 (Sharp)](./04-image-processing.md)
5. [CDN 優化策略](./05-cdn-optimization.md)

## 核心功能
- **檔案上傳**: 多格式支援 + 大小限制
- **圖片處理**: 壓縮、調整尺寸、浮水印
- **儲存管理**: Supabase Storage 整合
- **安全驗證**: 檔案類型檢查 + 病毒掃描

## 學習目標
完成本章節後，您將能夠：
1. 實作安全的檔案上傳機制
2. 整合 Supabase Storage 雲端儲存
3. 處理圖片壓縮與格式轉換
4. 建立檔案驗證與安全機制
5. 優化檔案傳輸與快取策略

## 檔案處理架構

```typescript
interface FileUploadConfig {
  // 檔案類型限制
  allowedMimeTypes: string[];     // ['image/jpeg', 'image/png', 'image/webp']
  maxFileSize: number;            // 最大檔案大小 (bytes)
  maxFiles: number;               // 最大檔案數量
  
  // 圖片處理設定
  imageProcessing: {
    enableCompression: boolean;   // 啟用壓縮
    quality: number;              // 壓縮品質 (0-100)
    maxWidth: number;             // 最大寬度
    maxHeight: number;            // 最大高度
    generateThumbnail: boolean;   // 生成縮圖
    addWatermark: boolean;        // 添加浮水印
  };
  
  // 儲存設定
  storage: {
    provider: 'supabase' | 'local' | 's3';
    bucket: string;               // Storage bucket 名稱
    path: string;                 // 儲存路徑前綴
    publicAccess: boolean;        // 是否公開存取
  };
}

interface FileUploadResult {
  id: string;                     // 檔案 ID
  originalName: string;           // 原始檔名
  fileName: string;               // 儲存檔名
  mimeType: string;               // MIME 類型
  size: number;                   // 檔案大小
  url: string;                    // 存取 URL
  thumbnailUrl?: string;          // 縮圖 URL
  uploadedAt: Date;               // 上傳時間
  metadata: FileMetadata;         // 檔案元資料
}

interface FileMetadata {
  width?: number;                 // 圖片寬度
  height?: number;                // 圖片高度
  format?: string;                // 圖片格式
  hasExif: boolean;               // 是否包含 EXIF 資料
  fileHash: string;               // 檔案雜湊值
  virusScanResult?: 'clean' | 'infected' | 'pending';
}
```

## API 端點概覽

```http
# 檔案上傳
POST   /api/v1/upload/image           # 上傳圖片
POST   /api/v1/upload/avatar          # 上傳用戶頭像
POST   /api/v1/upload/concert-poster  # 上傳演唱會海報
POST   /api/v1/upload/venue-image     # 上傳場地圖片

# 檔案管理
GET    /api/v1/files/:id              # 取得檔案資訊
DELETE /api/v1/files/:id              # 刪除檔案
GET    /api/v1/files/:id/thumbnail    # 取得縮圖
POST   /api/v1/files/:id/regenerate-thumbnail # 重新生成縮圖

# 檔案處理
POST   /api/v1/files/:id/compress     # 壓縮檔案
POST   /api/v1/files/:id/resize       # 調整尺寸
POST   /api/v1/files/:id/watermark    # 添加浮水印
```

## 圖片上傳處理流程

### 1. 檔案上傳中間件
```typescript
import multer from 'multer';
import sharp from 'sharp';

// Multer 設定 - 使用記憶體儲存
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5                     // 最多 5 個檔案
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png', 
      'image/webp',
      'image/gif'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支援的檔案格式'));
    }
  }
});

// 圖片處理中間件
export const processImage = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) return next();
  
  try {
    const buffer = req.file.buffer;
    
    // 1. 讀取圖片元資料
    const metadata = await sharp(buffer).metadata();
    
    // 2. 移除 EXIF 資料 (隱私保護)
    const processedBuffer = await sharp(buffer)
      .rotate() // 自動旋轉
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();
    
    // 3. 生成縮圖
    const thumbnailBuffer = await sharp(buffer)
      .resize(300, 300, { 
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toBuffer();
    
    // 4. 附加到 request 物件
    req.processedImage = {
      original: processedBuffer,
      thumbnail: thumbnailBuffer,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: processedBuffer.length
      }
    };
    
    next();
  } catch (error) {
    next(error);
  }
};
```

### 2. Supabase Storage 整合
```typescript
import { createClient } from '@supabase/supabase-js';

class SupabaseStorageService {
  private supabase: SupabaseClient;
  private bucketName: string = 'tickeasy-files';
  
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  
  async uploadFile(
    filePath: string, 
    fileBuffer: Buffer, 
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(filePath, fileBuffer, {
        contentType: options.contentType,
        cacheControl: '3600',
        upsert: options.upsert || false
      });
    
    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
    
    // 取得公開 URL
    const { data: urlData } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(filePath);
    
    return {
      path: data.path,
      url: urlData.publicUrl,
      fullPath: data.fullPath
    };
  }
  
  async deleteFile(filePath: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .remove([filePath]);
    
    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }
  }
  
  async generateSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .createSignedUrl(filePath, expiresIn);
    
    if (error) {
      throw new Error(`Signed URL generation failed: ${error.message}`);
    }
    
    return data.signedUrl;
  }
}
```

### 3. 檔案驗證機制
```typescript
class FileValidationService {
  // 檢查檔案類型 (Magic Number 驗證)
  static validateFileType(buffer: Buffer, expectedMimeType: string): boolean {
    const signatures = {
      'image/jpeg': [0xFF, 0xD8, 0xFF],
      'image/png': [0x89, 0x50, 0x4E, 0x47],
      'image/webp': [0x52, 0x49, 0x46, 0x46],
      'image/gif': [0x47, 0x49, 0x46, 0x38]
    };
    
    const signature = signatures[expectedMimeType];
    if (!signature) return false;
    
    return signature.every((byte, index) => buffer[index] === byte);
  }
  
  // 檢查圖片尺寸
  static async validateImageDimensions(
    buffer: Buffer, 
    maxWidth: number, 
    maxHeight: number
  ): Promise<boolean> {
    const metadata = await sharp(buffer).metadata();
    return (metadata.width <= maxWidth) && (metadata.height <= maxHeight);
  }
  
  // 檢查檔案大小
  static validateFileSize(size: number, maxSize: number): boolean {
    return size <= maxSize;
  }
  
  // 生成檔案雜湊值 (防重複上傳)
  static generateFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
}
```

## 圖片處理功能

### 1. 圖片壓縮與優化
```typescript
class ImageProcessingService {
  // 智能壓縮 - 根據圖片內容調整品質
  static async smartCompress(buffer: Buffer, targetSize?: number): Promise<Buffer> {
    const metadata = await sharp(buffer).metadata();
    let quality = 85;
    
    // 根據圖片尺寸調整品質
    if (metadata.width > 2000 || metadata.height > 2000) {
      quality = 75;
    }
    
    let result = await sharp(buffer)
      .jpeg({ quality, progressive: true, mozjpeg: true })
      .toBuffer();
    
    // 如果指定目標大小，進行迭代壓縮
    if (targetSize && result.length > targetSize) {
      while (result.length > targetSize && quality > 20) {
        quality -= 10;
        result = await sharp(buffer)
          .jpeg({ quality, progressive: true })
          .toBuffer();
      }
    }
    
    return result;
  }
  
  // 生成響應式圖片 (多種尺寸)
  static async generateResponsiveImages(buffer: Buffer): Promise<ResponsiveImages> {
    const sizes = [
      { name: 'thumbnail', width: 150, height: 150 },
      { name: 'small', width: 400, height: 300 },
      { name: 'medium', width: 800, height: 600 },
      { name: 'large', width: 1200, height: 900 }
    ];
    
    const images: ResponsiveImages = {};
    
    for (const size of sizes) {
      images[size.name] = await sharp(buffer)
        .resize(size.width, size.height, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80, progressive: true })
        .toBuffer();
    }
    
    return images;
  }
  
  // 添加浮水印
  static async addWatermark(
    imageBuffer: Buffer, 
    watermarkBuffer: Buffer,
    position: 'bottom-right' | 'bottom-left' | 'center' = 'bottom-right'
  ): Promise<Buffer> {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    
    // 調整浮水印大小 (圖片寬度的 20%)
    const watermarkWidth = Math.floor(metadata.width! * 0.2);
    const resizedWatermark = await sharp(watermarkBuffer)
      .resize(watermarkWidth)
      .png()
      .toBuffer();
    
    // 計算位置
    const positions = {
      'bottom-right': { 
        left: metadata.width! - watermarkWidth - 20,
        top: metadata.height! - Math.floor(watermarkWidth * 0.6) - 20
      },
      'bottom-left': { 
        left: 20,
        top: metadata.height! - Math.floor(watermarkWidth * 0.6) - 20
      },
      'center': {
        left: Math.floor((metadata.width! - watermarkWidth) / 2),
        top: Math.floor((metadata.height! - Math.floor(watermarkWidth * 0.6)) / 2)
      }
    };
    
    return await image
      .composite([{
        input: resizedWatermark,
        ...positions[position],
        blend: 'over'
      }])
      .jpeg({ quality: 90 })
      .toBuffer();
  }
}
```

## CDN 與快取策略

### 1. Supabase CDN 配置
```typescript
// 生成帶快取控制的 URL
function generateCachedImageUrl(filePath: string, options: ImageUrlOptions = {}): string {
  const baseUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/tickeasy-files`;
  const queryParams = new URLSearchParams();
  
  // 圖片轉換參數
  if (options.width) queryParams.append('width', options.width.toString());
  if (options.height) queryParams.append('height', options.height.toString());
  if (options.quality) queryParams.append('quality', options.quality.toString());
  if (options.format) queryParams.append('format', options.format);
  
  const url = `${baseUrl}/${filePath}`;
  return queryParams.toString() ? `${url}?${queryParams}` : url;
}
```

### 2. 瀏覽器快取標頭
```typescript
// Express 中間件 - 設定快取標頭
export const setCacheHeaders = (req: Request, res: Response, next: NextFunction) => {
  const isImageRequest = req.path.match(/\.(jpg|jpeg|png|webp|gif)$/i);
  
  if (isImageRequest) {
    // 圖片快取 1 年
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.set('Expires', new Date(Date.now() + 31536000000).toUTCString());
  } else {
    // 其他檔案快取 1 小時
    res.set('Cache-Control', 'public, max-age=3600');
  }
  
  next();
};
```

## 核心特性
- ✅ 多格式圖片上傳支援 (JPEG, PNG, WebP, GIF)
- ✅ 智能圖片壓縮與優化
- ✅ 響應式圖片生成 (多尺寸)
- ✅ 安全的檔案類型驗證
- ✅ Supabase Storage 雲端整合
- ✅ CDN 快取優化
- ✅ 浮水印功能
- ✅ EXIF 資料移除 (隱私保護)

## 安全考量
- **檔案類型檢查**: Magic Number 驗證
- **大小限制**: 防止 DoS 攻擊
- **病毒掃描**: 整合防毒引擎
- **存取權限**: 基於角色的檔案存取
- **隱私保護**: 移除 EXIF 地理位置資訊

## 相關檔案
- `routes/upload.ts` - 檔案上傳路由
- `controllers/uploadController.ts` - 上傳控制器
- `services/fileService.ts` - 檔案服務
- `services/imageProcessingService.ts` - 圖片處理服務
- `services/supabaseStorageService.ts` - Storage 服務
- `middlewares/upload.ts` - 上傳中間件
