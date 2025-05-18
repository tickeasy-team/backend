import { createClient } from '@supabase/supabase-js';
import { Buffer } from 'buffer';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
// import path from 'path';
import createHttpError from 'http-errors';
import { UploadContext, UploadImageParams, UploadImageResult, TEMP_DIRECTORY } from '../types/upload/index.js';

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
function getStoragePath(uploadContext: UploadContext, targetId: string | number | undefined, fileExtension: string, isTemporary: boolean = false): string {
  const fileName = `${uuidv4()}${fileExtension}`;
  
  // 臨時上傳模式，存放在臨時目錄
  if (isTemporary) {
    return `${TEMP_DIRECTORY}/${uploadContext}/${fileName}`;
  }
  
  // 確保有 targetId (非臨時模式下是必需的)
  if (!targetId) {
    throw new Error('Missing targetId for non-temporary upload');
  }
  
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
  const { fileBuffer, mimetype, uploadContext, targetId, isTemporary = false } = params;
  
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
    const storagePath = getStoragePath(uploadContext, targetId, fileExtension, isTemporary);

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
      isTemporary
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

/**
 * 列出指定 bucket 和路徑下的檔案
 */
async function listFiles(bucketName: string, path: string): Promise<string[]> {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw createHttpError(500, 'Supabase 環境變數未設定 (DB_URL 或 DB_SERVICE_KEY)');
  }

  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(path);

    if (error) {
      console.error('列出檔案時出錯:', error);
      throw createHttpError(500, `列出檔案失敗: ${error.message}`);
    }

    // 回傳檔案路徑的陣列
    return data.map(item => `${path}/${item.name}`);
  } catch (err) {
    console.error('列出檔案時出錯:', err);
    if (err instanceof Error) {
      throw createHttpError(500, `列出檔案失敗: ${err.message}`);
    }
    throw createHttpError(500, '列出檔案失敗');
  }
}

/**
 * 取得檔案的上傳時間
 */
async function getFileCreatedTime(bucketName: string, path: string): Promise<Date | null> {
  try {
    // 查詢檔案的中繼資料
    const { data, error } = await supabase.storage
      .from(bucketName)
      .getPublicUrl(path);

    // 注意：目前 Supabase 可能沒有直接 API 來獲取檔案的上傳時間
    // 這個部分可能需要後續補充或修改，這裡回傳空值
    return null;
  } catch (err) {
    console.error('取得檔案上傳時間出錯:', err);
    return null;
  }
}

/**
 * 清理臨時目錄中的舊檔案
 * @param hours 時間閾值（小時），超過這個時間的臨時檔案將被刪除
 */
async function cleanupTemporaryFiles(hours: number = 24): Promise<{ removed: number, failed: number }> {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw createHttpError(500, 'Supabase 環境變數未設定 (DB_URL 或 DB_SERVICE_KEY)');
  }

  // 記錄已刪除的檔案和失敗的檔案數量
  let removedCount = 0;
  let failedCount = 0;

  try {
    // 1. 取得所有 bucket
    const buckets = ['avatar', 'venue', 'concert']; // 硬編碼可用的 bucket

    // 2. 對於每個 bucket，清理臨時目錄
    for (const bucketName of buckets) {
      try {
        // 取得臨時目錄內的所有檔案
        const tempFiles = await listFiles(bucketName, TEMP_DIRECTORY);
        
        // 如果沒有檔案，跳過此 bucket
        if (!tempFiles || tempFiles.length === 0) continue;
        
        // 當前時間
        const now = new Date();
        const timeThreshold = new Date(now.getTime() - hours * 60 * 60 * 1000);
        
        // 對每個檔案，檢查是否需要刪除
        for (const filePath of tempFiles) {
          try {
            // 目前 Supabase 可能不提供直接 API 獲取檔案上傳時間
            // 如果需要基於時間過濾，可能需要從檔案名稱或數據庫中查詢
            // 這裡暫時模擬所有檔案都超過閾值
            const fileCreatedTime = await getFileCreatedTime(bucketName, filePath);
            const shouldDelete = !fileCreatedTime || fileCreatedTime < timeThreshold;
            
            if (shouldDelete) {
              // 刪除檔案
              const { error } = await supabase.storage
                .from(bucketName)
                .remove([filePath]);
              
              if (error) {
                console.error(`刪除臨時檔案失敗 (${filePath}):`, error);
                failedCount++;
              } else {
                console.log(`已刪除臨時檔案: ${filePath}`);
                removedCount++;
              }
            }
          } catch (fileErr) {
            console.error(`處理臨時檔案時出錯 (${filePath}):`, fileErr);
            failedCount++;
          }
        }
      } catch (bucketErr) {
        console.error(`清理 bucket ${bucketName} 的臨時目錄時出錯:`, bucketErr);
      }
    }
    
    return { removed: removedCount, failed: failedCount };
  } catch (err) {
    console.error('清理臨時檔案時出錯:', err);
    if (err instanceof Error) {
      throw createHttpError(500, `清理臨時檔案失敗: ${err.message}`);
    }
    throw createHttpError(500, '清理臨時檔案失敗');
  }
}

export default {
  uploadImage,
  deleteImage,
  cleanupTemporaryFiles
}; 