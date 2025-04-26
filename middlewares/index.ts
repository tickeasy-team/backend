import createHttpError from 'http-errors';
import validator from 'validator';
import { verifyToken, ApiError } from '../utils';
import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/user';
import { ErrorCode } from '../types';

// token 驗證
export const isAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      throw ApiError.unauthorized();
    }
    const decoded = verifyToken(token);
    if (!('userId' in decoded) || !('role' in decoded) || !('email' in decoded)) {
      throw ApiError.create(401, '無效的 Token 格式', ErrorCode.AUTH_TOKEN_INVALID);
    }
    
    // 設置 user 屬性，確保與 Express.User 接口兼容
    req.user = {
      userId: decoded.userId,
      role: decoded.role as UserRole,
      email: decoded.email as string,
      name: "", // 需要時從資料庫獲取
      isEmailVerified: false // 需要時從資料庫獲取
    };
    
    console.log('req.user:', req.user);
    next();
  } catch (error) {
    next(ApiError.create(401, '認證失敗：無效的 Token', ErrorCode.AUTH_TOKEN_INVALID));
  }
};

// 實作管理員權限（這部分需要後續完善）
export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  // 使用類型斷言處理類型不兼容問題
  isAuth(req, res, async (err) => {
    if (err) {
      return next(err); // 如果認證中間件遇到錯誤，直接將錯誤傳遞下去
    }

    try {
      // 檢查 req.user 中是否有角色資訊並且角色是否為 'admin'
      if (!req.user) {
        throw ApiError.unauthorized();
      }
      const user = req.user as { userId: string; role: string; email: string; };
      if (user.role !== 'admin') {
        throw ApiError.forbidden();
      }
      next();
    } catch (error) {
      next(error);
    }
  });
};

export const checkRequestBodyValidator = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const fieldErrors: Record<string, { code: string; message: string }> = {};

    for (let [key, value] of Object.entries(req.body)) {
      if (value === undefined || value === null) {
        fieldErrors[key] = { code: ErrorCode.VALIDATION_FAILED, message: '欄位未填寫正確' };
        continue;
      }

      const _value = `${value}`;

      switch (key) {
        case 'name':
          if (!validator.isLength(_value, { min: 2 })) {
            fieldErrors[key] = { code: ErrorCode.VALIDATION_NAME_LENGTH, message: 'name 至少 2 個字元以上' };
          }
          break;
        case 'email':
          if (!validator.isEmail(_value)) {
            fieldErrors[key] = { code: ErrorCode.VALIDATION_EMAIL_FORMAT, message: 'Email 格式不正確' };
          }
          break;
        case 'password':
        case 'newPassword':
          if (!validator.isLength(_value, { min: 8 })) {
            fieldErrors[key] = { code: ErrorCode.VALIDATION_PASSWORD_FORMAT, message: '密碼需至少 8 碼以上' };
          } else if (validator.isAlpha(_value)) {
            fieldErrors[key] = { code: ErrorCode.VALIDATION_PASSWORD_FORMAT, message: '密碼不能只有英文' };
          } else if (validator.isNumeric(_value)) {
            fieldErrors[key] = { code: ErrorCode.VALIDATION_PASSWORD_FORMAT, message: '密碼不能只有數字' };
          } else if (!validator.isAlphanumeric(_value)) {
            fieldErrors[key] = { code: ErrorCode.VALIDATION_PASSWORD_FORMAT, message: '密碼需至少 8 碼以上，並英數混合' };
          }
          break;
        case 'phone':
          if (_value && !validator.isMobilePhone(_value, 'zh-TW')) {
            fieldErrors[key] = { code: ErrorCode.VALIDATION_FAILED, message: '電話格式不正確，請使用台灣手機號碼格式' };
          }
          break;
        case 'birthday':
          if (_value && !validator.isISO8601(_value)) {
            fieldErrors[key] = { code: ErrorCode.VALIDATION_FAILED, message: '生日格式不正確，請使用YYYY-MM-DD格式' };
          }
          break;
        case 'image':
          if (!validator.isURL(_value, { protocols: ['https'] })) {
            fieldErrors[key] = { code: ErrorCode.VALIDATION_FAILED, message: 'image 格式不正確' };
          }
          break;
        default:
          break;
      }
    }

    // 如果有字段錯誤，立即返回所有錯誤
    if (Object.keys(fieldErrors).length > 0) {
      throw ApiError.validation('表單驗證失敗', fieldErrors);
    }

    next();
  } catch (error) {
    next(error);
  }
};
