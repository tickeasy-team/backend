import { createClient } from '@supabase/supabase-js';
import createHttpError from 'http-errors';
import { UploadContext } from '../types/upload/index.js';

// Supabase 客戶端初始化
const supabaseUrl = process.env.DB_URL;
const supabaseServiceKey = process.env.DB_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('缺少 Supabase 環境變數設定 (DB_URL 或 DB_ANON_KEY)');
}

const supabase = createClient(supabaseUrl || '', supabaseServiceKey || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// 介面定義
export interface MoveImageOptions {
  tempUrl: string;
  uploadContext: 'CONCERT_BANNER' | 'CONCERT_SEATING_TABLE';
  targetId: string;
}

export interface MoveImageResult {
  newUrl: string;
  oldPath: string;
  newPath: string;
}

/**
 * 檢查 URL 是否為暫存圖片
 */
export function isTempUrl(url: string): boolean {
  return url.includes('/temp/');
}

/**
 * 從暫存 URL 提取檔案路徑資訊
 */
function extractTempPathInfo(tempUrl: string): { bucket: string; filePath: string } {
  try {
    // 解析 Supabase URL 格式
    // 例如：https://xxx.supabase.co/storage/v1/object/public/concert/temp/concert_seating_table/uuid.webp
    const urlParts = tempUrl.split('/storage/v1/object/public/');
    if (urlParts.length !== 2) {
      throw new Error('無效的 Supabase Storage URL 格式');
    }
    
    const pathParts = urlParts[1].split('/');
    const bucket = pathParts[0];
    const filePath = pathParts.slice(1).join('/');
    
    return { bucket, filePath };
  } catch (error) {
    throw createHttpError(400, `無法解析暫存圖片 URL: ${tempUrl}`);
  }
}

/**
 * 生成正式檔案路徑
 */
function getOfficialPath(uploadContext: 'CONCERT_BANNER' | 'CONCERT_SEATING_TABLE', targetId: string): string {
  switch (uploadContext) {
    case 'CONCERT_BANNER':
      return `concerts/${targetId}/banner.webp`;
    case 'CONCERT_SEATING_TABLE':
      return `sessions/${targetId}/seattable.webp`;
    default:
      throw new Error(`不支援的上傳類型: ${uploadContext}`);
  }
}

/**
 * 將暫存圖片移動到正式位置
 */
export async function moveImageFromTempToOfficial(options: MoveImageOptions): Promise<MoveImageResult> {
  const { tempUrl, uploadContext, targetId } = options;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw createHttpError(500, 'Supabase 環境變數未設定');
  }

  try {
    // 1. 解析暫存圖片路徑
    const { bucket, filePath: tempPath } = extractTempPathInfo(tempUrl);
    
    // 2. 生成正式路徑
    const officialPath = getOfficialPath(uploadContext, targetId);
    
    // 3. 下載暫存圖片
    const { data: tempImageData, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(tempPath);
    
    if (downloadError) {
      throw createHttpError(404, `無法下載暫存圖片: ${downloadError.message}`);
    }
    
    // 4. 上傳到正式位置
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(officialPath, tempImageData, {
        contentType: 'image/webp',
        upsert: true, // 如果檔案已存在則覆蓋
      });
    
    if (uploadError) {
      throw createHttpError(500, `無法上傳到正式位置: ${uploadError.message}`);
    }
    
    // 5. 刪除暫存圖片
    const { error: deleteError } = await supabase.storage
      .from(bucket)
      .remove([tempPath]);
    
    if (deleteError) {
      console.warn(`刪除暫存圖片失敗 (${tempPath}):`, deleteError.message);
      // 不拋出錯誤，因為主要操作已成功
    }
    
    // 6. 生成新的公開 URL
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(officialPath);
    
    console.log(`圖片移動成功: ${tempPath} → ${officialPath}`);
    
    return {
      newUrl: publicUrlData.publicUrl,
      oldPath: `${bucket}/${tempPath}`,
      newPath: `${bucket}/${officialPath}`,
    };
    
  } catch (error) {
    console.error('移動圖片失敗:', error);
    if (error instanceof Error) {
      throw createHttpError(500, `移動圖片失敗: ${error.message}`);
    }
    throw createHttpError(500, '移動圖片失敗');
  }
}

/**
 * 批次移動多個圖片
 */
export async function batchMoveImages(imageList: MoveImageOptions[]): Promise<MoveImageResult[]> {
  const results: MoveImageResult[] = [];
  const errors: string[] = [];
  
  for (const options of imageList) {
    try {
      const result = await moveImageFromTempToOfficial(options);
      results.push(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知錯誤';
      errors.push(`移動圖片失敗 (${options.tempUrl}): ${errorMessage}`);
    }
  }
  
  if (errors.length > 0) {
    console.error('批次移動圖片時發生錯誤:', errors);
    // 如果部分失敗，仍回傳成功的結果，但記錄錯誤
  }
  
  return results;
}

/**
 * 刪除正式圖片（用於更新時刪除舊圖片）
 */
export async function deleteOfficialImage(imageUrl: string): Promise<boolean> {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw createHttpError(500, 'Supabase 環境變數未設定');
  }
  
  try {
    const { bucket, filePath } = extractTempPathInfo(imageUrl);
    
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);
    
    if (error) {
      console.error('刪除正式圖片失敗:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('刪除正式圖片時發生錯誤:', error);
    return false;
  }
}

export default {
  isTempUrl,
  moveImageFromTempToOfficial,
  batchMoveImages,
  deleteOfficialImage,
}; 