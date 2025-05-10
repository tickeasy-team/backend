import { createClient } from '@supabase/supabase-js';
import { Buffer } from 'buffer';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
// import path from 'path';
import createHttpError from 'http-errors';
import { UploadContext, UploadImageParams, UploadImageResult } from '../types/upload/index.js';

// 從環境變數讀取 Supabase URL 和 Service Key
const supabaseUrl = process.env.DB_URL;
const supabaseServiceKey = process.env.DB_ANON_KEY;

// 檢查必要的環境變數是否存在
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('缺少 Supabase 環境變數設定 (DB_URL 或 DB_ANON_KEY)');
  // 不立即拋出錯誤，而是在實際呼叫時才拋出，這樣可以允許應用程式啟動
}

// 初始化 Supabase 客戶端，使用 Service Key (admin 權限)
const supabase = createClient(supabaseUrl || '', supabaseServiceKey || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * 根據上傳上下文確定儲存的 bucket 名稱
 */
function getBucketName(uploadContext: UploadContext): string {
  switch (uploadContext) {
    case 'USER_AVATAR':
      return 'avatar';
    case 'VENUE_PHOTO':
      return 'venue';
    case 'CONCERT_SEATTABLE':
    case 'CONCERT_BANNER':
      return 'concert';
    default:
      throw new Error(`Invalid upload context provided for bucket name: ${uploadContext}`);
  }
}

/**
 * 根據上傳上下文和目標 ID 建立儲存路徑
 */
function getStoragePath(uploadContext: UploadContext, targetId: string | number, fileExtension: string): string {
  const fileName = `${uuidv4()}${fileExtension}`;
  
  switch (uploadContext) {
    case 'USER_AVATAR':
      return `${targetId}/${fileName}`;
    case 'VENUE_PHOTO':
      return `${targetId}/${fileName}`;
    case 'CONCERT_SEATTABLE':
      return `${targetId}/seatTable/${fileName}`;
    case 'CONCERT_BANNER':
      return `${targetId}/banner/${fileName}`;
    default:
      throw new Error(`Invalid upload context provided: ${uploadContext}`);
  }
}

/**
 * 處理並優化圖片
 */
async function processImage(
  fileBuffer: Buffer,
  mimetype: string,
  options: UploadImageParams['options'] = {}
): Promise<{ buffer: Buffer; info: sharp.OutputInfo; format: string }> {
  // 預設設定
  const defaultOptions = {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 80,
    format: 'webp' as const,
  };

  // 合併預設和使用者提供的選項
  const settings = { ...defaultOptions, ...options };
  
  // 建立 sharp 實例
  let sharpInstance = sharp(fileBuffer);

  // 獲取圖片元數據
  const metadata = await sharpInstance.metadata();
  
  // 調整圖片大小 (如果需要)
  if (metadata.width && metadata.width > settings.maxWidth) {
    sharpInstance = sharpInstance.resize({
      width: settings.maxWidth,
      height: settings.maxHeight,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  // 根據設定的格式轉換
  if (settings.format === 'webp') {
    sharpInstance = sharpInstance.webp({ quality: settings.quality });
  } else if (settings.format === 'jpeg') {
    sharpInstance = sharpInstance.jpeg({ quality: settings.quality });
  } else if (settings.format === 'png') {
    sharpInstance = sharpInstance.png({ quality: settings.quality });
  }

  // 處理並回傳結果
  const { data, info } = await sharpInstance.toBuffer({ resolveWithObject: true });
  
  return {
    buffer: data,
    info,
    format: settings.format,
  };
}

/**
 * 上傳圖片到 Supabase Storage
 */
async function uploadImage(params: UploadImageParams): Promise<UploadImageResult> {
  const { fileBuffer, mimetype, uploadContext, targetId } = params;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw createHttpError(500, 'Supabase 環境變數未設定 (DB_URL 或 DB_SERVICE_KEY)');
  }

  try {
    // 1. 處理並優化圖片
    const { buffer, info, format } = await processImage(fileBuffer, mimetype, params.options);

    // 2. 確定檔案副檔名和 MIME 類型
    const fileExtension = `.${format}`;
    const contentType = `image/${format}`;

    // 3. 確定儲存位置
    const bucketName = getBucketName(uploadContext);
    const storagePath = getStoragePath(uploadContext, targetId, fileExtension);

    // 4. 上傳到 Supabase Storage
    const {  error } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, buffer, {
        contentType,
        upsert: true, // 如果檔案已存在則覆蓋
      });

    if (error) {
      console.error('Supabase Storage 上傳錯誤:', error);
      throw createHttpError(500, `圖片上傳失敗: ${error.message}`);
    }

    // 5. 獲取公開 URL
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(storagePath);

    // 6. 回傳結果
    return {
      url: publicUrlData.publicUrl,
      path: `${bucketName}/${storagePath}`,
      width: info.width,
      height: info.height,
      size: info.size,
      format,
    };
  } catch (err) {
    console.error('處理或上傳圖片時出錯:', err);
    if (err instanceof Error) {
      throw createHttpError(500, `圖片處理或上傳失敗: ${err.message}`);
    }
    throw createHttpError(500, '圖片處理或上傳失敗');
  }
}

/**
 * 刪除儲存在 Supabase Storage 的圖片
 */
async function deleteImage(path: string): Promise<boolean> {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw createHttpError(500, 'Supabase 環境變數未設定 (DB_URL 或 DB_SERVICE_KEY)');
  }

  try {
    // 從路徑解析 bucket 和檔案路徑
    const [bucketName, ...pathParts] = path.split('/');
    const filePath = pathParts.join('/');

    // 執行刪除
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (error) {
      console.error('Supabase Storage 刪除錯誤:', error);
      throw createHttpError(500, `刪除圖片失敗: ${error.message}`);
    }

    return true;
  } catch (err) {
    console.error('刪除圖片時出錯:', err);
    if (err instanceof Error) {
      throw createHttpError(500, `刪除圖片失敗: ${err.message}`);
    }
    throw createHttpError(500, '刪除圖片失敗');
  }
}

export default {
  uploadImage,
  deleteImage,
}; 