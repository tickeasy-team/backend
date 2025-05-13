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

// 

export default router;