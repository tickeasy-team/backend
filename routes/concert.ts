import express from 'express';
import * as concertController from '../controllers/concert.js';
import { isAuthenticated } from '../middlewares/auth.js';

const router = express.Router();

// 新增活動
router.post('/', isAuthenticated, concertController.createConcert);

// 修改活動（僅限草稿）
router.put('/:concertId', isAuthenticated, concertController.updateConcert);

// 取消活動
router.delete(
    '/:concertId/cancel',
    isAuthenticated,
    concertController.deleteConcert
);

// 增加visitCount
router.patch('/:concertId/visit', concertController.incrementVisitCount);

// 設定promotion權重
//(暫時沒有做驗證)
router.patch('/:concertId/promotion', concertController.updatePromotion);

// 獲得熱門演唱會
router.get('/popular', concertController.getPopularConcerts);

// 獲得場地
router.get('/venues', concertController.getAllVenues);

// 搜尋
router.get('/search', concertController.searchConcerts);

// 獲得首頁promo的banner
router.get('/banners', concertController.getBannerConcerts);

export default router;
