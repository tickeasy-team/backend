import { UserRole } from '../models/user';

// 移除 declare global，直接定義在命名空間中並匯出
declare namespace Express {
  // 匯出 User 介面
  export interface User {
    userId: string;
    role: UserRole;
    email: string;
    name: string;
    isEmailVerified: boolean;
    [key: string]: any;
  }

  export interface Request {
    user?: User;
  }
} 