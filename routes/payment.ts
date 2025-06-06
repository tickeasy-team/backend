import express, { Router } from 'express';
// import { isAuthenticated } from '../middlewares/auth.js';
import { isAuthenticated } from '../middlewares/auth.js';
import { getECpayurl, getECpayReturn } from '../controllers/payment.js';

const router: Router = express.Router();

router.post('/:orderId',  getECpayurl);

router.post('/res/return',  getECpayReturn);

// router.put('/profile', isAuthenticated, updateUserProfile);

// router.get('/profile/regions', getRegionOptions);

// router.get('/profile/event-types', getEventTypeOptions);

export default router; 

