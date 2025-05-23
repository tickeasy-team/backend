import { Request, Response, NextFunction, Express } from 'express';
import createHttpError from 'http-errors';
import storageService from '../services/storage.js';
import { UploadContext } from '../types/upload/index.js';
import { AppDataSource } from '../config/database.js';
import { User } from '../models/user.js';
import { Concert } from '../models/concert.js';

// 合法的上傳上下文值
const ALLOWED_UPLOAD_CONTEXTS: UploadContext[] = [
  'USER_AVATAR',
  'VENUE_PHOTO',
  'CONCERT_SEATING_TABLE',
  'CONCERT_BANNER',
];

// 輔助函數：從 URL 解析 Storage 路徑
function getStoragePathFromUrl(url: string): string | null {
  try {
    const urlParts = url.split('/public/');
    if (urlParts.length === 2) {
      return urlParts[1];
    }
  } catch (e) { console.log(e); /* 忽略解析錯誤 */ }
  return null;
}

// 輔助函數：刪除舊圖片 (帶錯誤處理)
async function deleteOldImage(oldUrls: string | string[] | null | undefined): Promise<void> {
  if (!oldUrls) return;

  // 統一轉換為陣列處理
  const urlsToDelete = Array.isArray(oldUrls) ? oldUrls : [oldUrls];

  for (const oldUrl of urlsToDelete) {
    if (!oldUrl) continue;
    const oldStoragePath = getStoragePathFromUrl(oldUrl);
    if (oldStoragePath) {
      try {
        await storageService.deleteImage(oldStoragePath);
        console.log(`舊圖片已刪除: ${oldStoragePath}`);
      } catch (deleteError) {
        console.error(`刪除舊圖片失敗 (${oldStoragePath}):`, deleteError);
      }
    } else {
      console.warn(`無法從舊圖片 URL 解析路徑: ${oldUrl}`);
    }
  }
}

/**
 * 上傳圖片
 * 接收並處理通過 multipart/form-data 上傳的圖片檔案
 * 支援兩種模式：
 * 1. 臨時上傳模式：不提供 targetId，只上傳圖片並返回 URL
 * 2. 直接關聯模式：提供 targetId，上傳圖片並與目標實體關聯
 */
async function uploadImage(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. 從請求中獲取檔案和相關參數
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const singleFile = files?.file?.[0];
    const multipleFiles = files?.files;
    
    const { uploadContext } = req.body;
    let targetIdFromBody = req.body.targetId; // 可能為空，表示臨時上傳模式
    const userIdFromToken = (req.user as any)?.userId;
    const userRoleFromToken = (req.user as any)?.role; // 取得 user role
    const isTempUpload = req.body.isTemp === 'true' || req.body.isTemp === true; // 是否為暫存上傳
    
    // 2. 驗證請求參數
    // 2.1 驗證是否有檔案並決定有效檔案列表
    let effectiveFiles: Express.Multer.File[] = [];
    
    if (uploadContext === 'CONCERT_SEATING_TABLE') {
      // 多檔案模式：座位表圖片
      if (!multipleFiles || multipleFiles.length === 0) {
        return next(createHttpError(400, '缺少座位表圖片檔案'));
      }
      if (multipleFiles.length > 10) {
        return next(createHttpError(400, '座位表圖片最多只能上傳 10 張'));
      }
      effectiveFiles = multipleFiles;
    } else {
      // 單檔案模式：其他所有類型
      if (!singleFile) {
        return next(createHttpError(400, '缺少圖片檔案'));
      }
      effectiveFiles = [singleFile];
    }
    
    // 2.2 驗證檔案類型（對所有有效檔案進行驗證）
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    for (const file of effectiveFiles) {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return next(createHttpError(400, `不支援的檔案類型 (${file.originalname})，僅接受 JPEG, PNG, GIF 或 WebP 格式`));
      }
    }
    
    // 2.3 驗證是否有 uploadContext
    if (!uploadContext) {
      return next(createHttpError(400, '缺少必要的 \'uploadContext\' 欄位'));
    }
    
    // 2.4 驗證 uploadContext 是否為允許的值
    if (!ALLOWED_UPLOAD_CONTEXTS.includes(uploadContext as UploadContext)) {
      return next(createHttpError(400, `無效的 'uploadContext' 值: ${uploadContext}`));
    }
    
    // 2.5 根據 uploadContext 確定並驗證 targetId，並獲取相關實體
    let effectiveTargetId: string | number | undefined;
    let userToUpdate: User | null = null;
    let concertToUpdate: Concert | null = null;
    let oldImageUrls: string | string[] | null | undefined = null; // 用於存儲待刪除的舊圖片 URL(s)
    
    // 暫存模式不需要 targetId
    if (isTempUpload) {
      console.log('暫存上傳模式，不需要 targetId');
      effectiveTargetId = undefined;
    }
    // 非暫存模式下的處理邏輯
    else if (uploadContext === 'USER_AVATAR') {
      if (!userIdFromToken) return next(createHttpError(401, '用戶未經驗證'));
      effectiveTargetId = userIdFromToken;
      const userRepository = AppDataSource.getRepository(User);
      userToUpdate = await userRepository.findOne({ where: { userId: String(effectiveTargetId) } });
      if (!userToUpdate) return next(createHttpError(404, '找不到用戶'));
      oldImageUrls = userToUpdate.avatar;
    } else if (uploadContext === 'VENUE_PHOTO' && !isTempUpload) {
      // 非暫存模式下，只允許 admin 上傳，且需要 targetId
      if (userRoleFromToken !== 'admin') {
        return next(createHttpError(403, '僅限管理員上傳場館圖片'));
      }
      if (!targetIdFromBody) {
        return next(createHttpError(400, `缺少必要的 'targetId' 欄位 (針對 ${uploadContext})`));
      }
      effectiveTargetId = targetIdFromBody;
    } else {
      // 直接關聯模式，需要驗證 targetId 有效性
      if (!targetIdFromBody) return next(createHttpError(400, `缺少必要的 'targetId' 欄位 (針對 ${uploadContext})`));
      effectiveTargetId = targetIdFromBody;
      if (uploadContext === 'CONCERT_SEATING_TABLE' || uploadContext === 'CONCERT_BANNER') {
        const concertRepository = AppDataSource.getRepository(Concert);
        concertToUpdate = await concertRepository.findOne({ where: { concertId: effectiveTargetId as string } });
        if (!concertToUpdate) return next(createHttpError(404, '找不到音樂會'));
        if (uploadContext === 'CONCERT_SEATING_TABLE') {
          // @ts-ignore 假設 imgSeattable 現在是 string[] 型別
          oldImageUrls = concertToUpdate.imgSeattable;
        } else { // CONCERT_BANNER
          oldImageUrls = concertToUpdate.imgBanner;
        }
      }
    }
    
    // 3. 呼叫服務上傳圖片
    const uploadResults: { url: string; path: string }[] = [];
    
    for (const file of effectiveFiles) {
      const uploadImagePayload: any = {
        fileBuffer: file.buffer,
        originalName: file.originalname,
        mimetype: file.mimetype,
        uploadContext: uploadContext as UploadContext,
      };
      if (effectiveTargetId !== undefined) {
        uploadImagePayload.targetId = effectiveTargetId;
      }
      const result = await storageService.uploadImage(uploadImagePayload);
      uploadResults.push(result);
    }
    
    // 4. 僅在非暫存模式下更新資料庫欄位
    if (!isTempUpload) {
      try {
        if (userToUpdate && uploadResults.length > 0) {
          // 使用者頭像：單一圖片
          userToUpdate.avatar = uploadResults[0].url;
          await AppDataSource.getRepository(User).save(userToUpdate);
        } else if (concertToUpdate && uploadResults.length > 0) {
          if (uploadContext === 'CONCERT_SEATING_TABLE') {
            // @ts-ignore 假設 imgSeattable 現在是 string[] 型別
            concertToUpdate.imgSeattable = uploadResults.map(r => r.url);
          } else { // CONCERT_BANNER
            // Banner 仍然是單一圖片
            concertToUpdate.imgBanner = uploadResults[0].url;
          }
          await AppDataSource.getRepository(Concert).save(concertToUpdate);
        }
        // VENUE_PHOTO 不需更新資料庫，由建立場館 API 處理
      } catch (dbError) {
        // 如果資料庫更新失敗，最好也嘗試刪除剛剛上傳的圖片以保持一致性
        console.error('資料庫更新失敗，嘗試刪除已上傳圖片:', dbError);
        for (const result of uploadResults) {
          try {
            await storageService.deleteImage(result.path);
            console.log(`因資料庫更新失敗，已刪除圖片: ${result.path}`);
          } catch (rollbackDeleteError) {
            console.error(`刪除圖片失敗 (${result.path}):`, rollbackDeleteError);
          }
        }
        return next(createHttpError(500, '更新資料庫失敗'));
      }
      
      // 5. 異步刪除舊圖片 (不阻塞回應)
      deleteOldImage(oldImageUrls).catch(err => {
        console.error('異步刪除舊圖片過程中發生未捕獲錯誤:', err);
      }); 
    }
    
    // 6. 回傳成功回應
    let responseData: any;
    if (uploadContext === 'CONCERT_SEATING_TABLE') {
      // 座位表圖片：返回 URL 陣列格式
      responseData = uploadResults.map(r => r.url);
    } else {
      // 其他類型圖片：返回單一 URL 格式
      responseData = uploadResults[0].url;
    }
    
    res.status(200).json({
      status: 'success',
      message: isTempUpload ? '圖片暫存成功' : '圖片上傳成功',
      data: responseData
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 刪除圖片
 * 刪除特定 URL 的圖片
 */
async function deleteImage(req: Request, res: Response, next: NextFunction) {
  try {
    const { url, urls, uploadContext } = req.body;
    let targetIdFromBody = req.body.targetId; // 僅在非 USER_AVATAR 時需要
    const userIdFromToken = (req.user as any)?.userId;
    
    // 驗證
    if (!url && (!Array.isArray(urls) || urls.length === 0)) {
      return next(createHttpError(400, '缺少必要的 \'url\' 或 \'urls\' 欄位'));
    }
    if (!uploadContext) {
      return next(createHttpError(400, '缺少必要的 \'uploadContext\' 欄位'));
    }
    
    // 統一處理為 URL 陣列
    const urlsToDelete: string[] = url ? [url] : (urls as string[]);
    
    // 將 URL 轉換為 path
    const pathsToDelete: string[] = [];
    for (const urlToDelete of urlsToDelete) {
      const path = getStoragePathFromUrl(urlToDelete);
      if (!path) {
        return next(createHttpError(400, `無法從 URL 解析出檔案路徑: ${urlToDelete}`));
      }
      pathsToDelete.push(path);
    }
    
    // 確定目標 ID 和權限檢查
    let effectiveTargetId: string | number | undefined;
    if (uploadContext === 'USER_AVATAR') {
      if (!userIdFromToken) {
        return next(createHttpError(401, '用戶未經驗證'));
      }
      effectiveTargetId = userIdFromToken;
      // 不需要額外權限檢查，因為操作目標就是自己
    } else {
      // 其他 context 可能需要 targetId 進行權限檢查或記錄
      if (!targetIdFromBody && (uploadContext === 'CONCERT_SEATING_TABLE' || uploadContext === 'CONCERT_BANNER' || uploadContext === 'VENUE_PHOTO')) {
        // 對於這些需要 targetId 的 context，如果沒有提供則報錯
        // return next(createHttpError(400, `缺少必要的 'targetId' 欄位 (針對 ${uploadContext})`));
      }
      effectiveTargetId = targetIdFromBody; // 可能是 undefined
      // 在這裡添加針對其他 context 的權限檢查
      // if (!hasPermissionForTarget(userIdFromToken, uploadContext, effectiveTargetId)) {
      //   return next(createHttpError(403, '權限不足'));
      // }
    }
    
    // 呼叫服務刪除圖片
    for (const p of pathsToDelete) {
      await storageService.deleteImage(p);
    }
    
    // 如果是刪除頭像或演唱會的特定圖片，更新相關欄位為空或移除特定URL
    if (uploadContext === 'USER_AVATAR' && effectiveTargetId) {
      const userRepository = AppDataSource.getRepository(User);
      // 使用 token 中的 userId 查找用戶
      const user = await userRepository.findOne({ where: { userId: effectiveTargetId as string } });
      
      if (user) {
        user.avatar = '';
        await userRepository.save(user);
      }
    } else if (uploadContext === 'CONCERT_SEATING_TABLE' && effectiveTargetId) {
      const concertRepository = AppDataSource.getRepository(Concert);
      const concert = await concertRepository.findOne({ where: { concertId: effectiveTargetId as string } });
      
      if (concert) {
        // @ts-ignore 假設 imgSeattable 現在是 string[] 型別
        concert.imgSeattable = []; // 清空所有座位表圖片
        await concertRepository.save(concert);
      }
    }
    // CONCERT_BANNER 和 VENUE_PHOTO 的刪除可能也需要 DB 更新，如果它們在資料庫中儲存 URL
    
    // 回傳成功回應
    res.status(200).json({
      status: 'success',
      message: '圖片刪除成功'
    });
  } catch (err) {
    next(err);
  }
}

export default {
  uploadImage,
  deleteImage
};
