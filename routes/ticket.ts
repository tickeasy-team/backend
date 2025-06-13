import express, { Router } from 'express';
import { isAuthenticated } from '../middlewares/auth.js';
import { getConcertTickets, verifyTicket } from '../controllers/ticket.js';

const router: Router = express.Router();

router.get('/:concertSessionId', getConcertTickets);

// 驗票 API - 需要驗證身份（工作人員或管理員）
router.post('/verify', isAuthenticated, verifyTicket);

export default router; 