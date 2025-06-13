import express, { Router } from 'express';
import { isAuthenticated, isAdmin } from '../middlewares/auth.js';
import { getUserProfile, updateUserProfile, getRegionOptions, getEventTypeOptions, updateUserRole, getOrdersList } from '../controllers/user.js';

const router: Router = express.Router();

router.get('/profile', isAuthenticated, getUserProfile);

router.put('/profile', isAuthenticated, updateUserProfile);

router.get('/profile/regions', getRegionOptions);

router.get('/profile/event-types', getEventTypeOptions);

router.patch('/:id/role', isAuthenticated, isAdmin, updateUserRole);

router.get('/orders', isAuthenticated, getOrdersList);

export default router; 