import express, { Router } from 'express';
// import { isAuthenticated } from '../middlewares/auth.js';
// import { isAuthenticated } from '../middlewares/auth.js';
import { getConcertTickets } from '../controllers/ticket.js';

const router: Router = express.Router();

router.get('/:concertSessionId', getConcertTickets);

// router.put('/profile', isAuthenticated, updateUserProfile);

// router.get('/profile/regions', getRegionOptions);

// router.get('/profile/event-types', getEventTypeOptions);

export default router; 