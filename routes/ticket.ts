import express, { Router } from 'express';
import { isAuthenticated } from '../middlewares/auth.js';
import { getConcertTickets, verifyTicket, checkTicketStatus } from '../controllers/ticket.js';

const router: Router = express.Router();

// 獲取演場會票券類型
router.get('/:concertSessionId', getConcertTickets);

// 驗票 API - 需要驗證身份（主辦方或管理員）
router.post('/verify', isAuthenticated, verifyTicket);

// 查詢票券狀態 API - 不需要特殊權限，僅查詢狀態
router.post('/status', checkTicketStatus);

export default router;