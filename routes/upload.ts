import express from 'express';
import uploadController from '../controllers/upload';
import { isAuthenticated } from '../middlewares/auth';
import { uploadMiddleware, handleMulterError } from '../middlewares';

const router = express.Router();

// 上傳圖片
router.post('/image', isAuthenticated, uploadMiddleware.single('file'), handleMulterError, uploadController.uploadImage);

// 刪除圖片
router.delete('/image', isAuthenticated, uploadController.deleteImage);

export default router;
