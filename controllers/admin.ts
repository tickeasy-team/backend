import { Request, Response, NextFunction } from 'express';
import createHttpError from 'http-errors';
import storageService from '../services/storage-supabase.js';

/**
 * 清理臨時上傳的圖片檔案
 * 這個功能應由系統管理員或定時任務調用
 */
async function cleanupTemporaryFiles(req: Request, res: Response, next: NextFunction) {
  try {
    // 取得參數
    const hours = req.query.hours ? parseInt(req.query.hours as string, 10) : 24;
    
    // 驗證參數
    if (isNaN(hours) || hours <= 0 || hours > 720) { // 最大 30 天
      return next(createHttpError(400, '無效的小時參數 (1-720)'));
    }
    
    // 執行清理
    const result = await storageService.cleanupTemporaryFiles(hours);
    
    // 回傳結果
    res.status(200).json({
      status: 'success',
      message: `已清理過期的臨時檔案 (${hours} 小時)`,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

export default {
  cleanupTemporaryFiles
}; 