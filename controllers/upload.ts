import { Request, Response, NextFunction } from 'express';
import createHttpError from 'http-errors';
import storageService from '../services/storage';
import { UploadContext } from '../types/upload';
import { AppDataSource } from '../config/database';
import { User } from '../models/user';
import { Venue } from '../models/venue';
import { Concert } from '../models/concert';

// 合法的上傳上下文值
const ALLOWED_UPLOAD_CONTEXTS: UploadContext[] = [
  'USER_AVATAR',
  'VENUE_PHOTO',
  'CONCERT_SEATTABLE',
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
async function deleteOldImage(oldUrl: string | null | undefined): Promise<void> {
  if (!oldUrl) return;
  
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

/**
 * 上傳圖片
 * 接收並處理通過 multipart/form-data 上傳的圖片檔案
 */
async function uploadImage(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. 從請求中獲取檔案和相關參數
    const file = req.file;
    const { uploadContext } = req.body;
    let targetIdFromBody = req.body.targetId;
    const userIdFromToken = (req.user as any)?.userId;
    
    // 2. 驗證請求參數
    // 2.1 驗證是否有檔案
    if (!file) {
      return next(createHttpError(400, '缺少圖片檔案'));
    }
    
    // 2.2 驗證檔案類型
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return next(createHttpError(400, '不支援的檔案類型，僅接受 JPEG, PNG, GIF 或 WebP 格式'));
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
    let effectiveTargetId: string | number;
    let userToUpdate: User | null = null;
    let venueToUpdate: Venue | null = null;
    let concertToUpdate: Concert | null = null;
    let oldImageUrl: string | null | undefined = null; // 用於存儲待刪除的舊圖片 URL
    
    if (uploadContext === 'USER_AVATAR') {
      if (!userIdFromToken) return next(createHttpError(401, '用戶未經驗證'));
      effectiveTargetId = userIdFromToken;
      const userRepository = AppDataSource.getRepository(User);
      userToUpdate = await userRepository.findOne({ where: { userId: String(effectiveTargetId) } });
      if (!userToUpdate) return next(createHttpError(404, '找不到用戶'));
      oldImageUrl = userToUpdate.avatar;
    } else {
      if (!targetIdFromBody) return next(createHttpError(400, `缺少必要的 'targetId' 欄位 (針對 ${uploadContext})`));
      effectiveTargetId = targetIdFromBody;
      
      if (uploadContext === 'VENUE_PHOTO') {
        const venueRepository = AppDataSource.getRepository(Venue);
        venueToUpdate = await venueRepository.findOne({ where: { venueId: effectiveTargetId as string } });
        if (!venueToUpdate) return next(createHttpError(404, '找不到場地'));
        oldImageUrl = venueToUpdate.venueImageUrl;
      } else if (uploadContext === 'CONCERT_SEATTABLE' || uploadContext === 'CONCERT_BANNER') {
        const concertRepository = AppDataSource.getRepository(Concert);
        concertToUpdate = await concertRepository.findOne({ where: { concertId: effectiveTargetId as string } });
        if (!concertToUpdate) return next(createHttpError(404, '找不到音樂會'));
        oldImageUrl = (uploadContext === 'CONCERT_SEATTABLE') ? concertToUpdate.imgSeattable : concertToUpdate.imgBanner;
      }
      // 在這裡可以添加針對其他 context 的權限檢查
      // if (!hasPermissionForTarget(userIdFromToken, uploadContext, effectiveTargetId)) {
      //   return next(createHttpError(403, '權限不足'));
      // }
    }
    
    // 3. 呼叫服務上傳圖片
    const result = await storageService.uploadImage({
      fileBuffer: file.buffer,
      originalName: file.originalname,
      mimetype: file.mimetype,
      uploadContext: uploadContext as UploadContext,
      targetId: effectiveTargetId,
    });
    
    // 4. 更新資料庫欄位
    try {
      if (userToUpdate) {
        userToUpdate.avatar = result.url;
        await AppDataSource.getRepository(User).save(userToUpdate);
      } else if (venueToUpdate) {
        venueToUpdate.venueImageUrl = result.url;
        await AppDataSource.getRepository(Venue).save(venueToUpdate);
      } else if (concertToUpdate) {
        if (uploadContext === 'CONCERT_SEATTABLE') {
          concertToUpdate.imgSeattable = result.url;
        } else { // CONCERT_BANNER
          concertToUpdate.imgBanner = result.url;
        }
        await AppDataSource.getRepository(Concert).save(concertToUpdate);
      }
    } catch (dbError) {
      // 如果資料庫更新失敗，最好也嘗試刪除剛剛上傳的圖片以保持一致性
      console.error('資料庫更新失敗，嘗試刪除已上傳圖片:', dbError);
      try {
        await storageService.deleteImage(result.path);
        console.log(`因資料庫更新失敗，已刪除圖片: ${result.path}`);
      } catch (rollbackDeleteError) {
        console.error(`刪除圖片失敗 (${result.path}):`, rollbackDeleteError);
      }
      return next(createHttpError(500, '更新資料庫失敗'));
    }
    
    // 5. 異步刪除舊圖片 (不阻塞回應)
    deleteOldImage(oldImageUrl).catch(err => {
      console.error('異步刪除舊圖片過程中發生未捕獲錯誤:', err);
    }); 
    
    // 6. 回傳成功回應
    const responseData: { url: string; path?: string } = { url: result.url };
    // 對於非頭像，仍然返回 path，因為 deleteImage API 可能還需要它 (取決於後續是否修改 deleteImage)
    if (uploadContext !== 'USER_AVATAR') {
      responseData.path = result.path; 
    }
    
    res.status(200).json({
      status: 'success',
      message: '圖片上傳成功',
      data: responseData
    });

  } catch (err) {
    next(err);
  }
}

/**
 * 刪除圖片
 * 刪除特定路徑的圖片
 */
async function deleteImage(req: Request, res: Response, next: NextFunction) {
  try {
    const { path, uploadContext } = req.body;
    let targetIdFromBody = req.body.targetId; // 僅在非 USER_AVATAR 時需要
    const userIdFromToken = (req.user as any)?.userId;
    
    // 驗證
    if (!path) {
      return next(createHttpError(400, '缺少必要的 \'path\' 欄位'));
    }
    if (!uploadContext) {
      return next(createHttpError(400, '缺少必要的 \'uploadContext\' 欄位'));
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
      if (!targetIdFromBody) {
        // 如果其他 context 需要 targetId，則取消此註釋
        // return next(createHttpError(400, `缺少必要的 'targetId' 欄位 (針對 ${uploadContext})`));
      }
      effectiveTargetId = targetIdFromBody; // 可能是 undefined
      // 在這裡添加針對其他 context 的權限檢查
      // if (!hasPermissionForTarget(userIdFromToken, uploadContext, effectiveTargetId)) {
      //   return next(createHttpError(403, '權限不足'));
      // }
    }
    
    // 呼叫服務刪除圖片
    await storageService.deleteImage(path);
    
    // 如果是刪除頭像，更新用戶的 avatar 欄位為空
    if (uploadContext === 'USER_AVATAR') {
      const userRepository = AppDataSource.getRepository(User);
      // 使用 token 中的 userId 查找用戶
      const user = await userRepository.findOne({ where: { userId: effectiveTargetId as string } });
      
      if (user) {
        user.avatar = '';
        await userRepository.save(user);
      }
    }
    
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
