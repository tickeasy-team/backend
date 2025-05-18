import express from 'express';
import adminController from '../controllers/admin.js';
import { isAuthenticated, isAdmin } from '../middlewares/auth.js';

const router = express.Router();

// 清理臨時檔案（僅管理員可用）
router.post('/cleanup/temp-files', isAuthenticated, isAdmin, adminController.cleanupTemporaryFiles);

export default router; 