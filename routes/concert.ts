import express from 'express';
import * as concertController from '../controllers/concert.js';
import { isAuthenticated } from '../middlewares/auth.js';

const router = express.Router();

// 新增活動
router.post(
    '/',
    isAuthenticated,
    concertController.createConcert
);

// 修改活動（僅限草稿）
router.put(
    '/:concertId',
    isAuthenticated,
    concertController.updateConcert
);

export default router;