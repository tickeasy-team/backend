import express, { Router } from 'express';
import { isAuthenticated, isAdmin } from '../middlewares/auth.js';
import { getUserProfile, updateUserProfile, getRegionOptions, getEventTypeOptions, updateUserRole } from '../controllers/user.js';

const router: Router = express.Router();

router.get('/profile', isAuthenticated, getUserProfile);

router.put('/profile', isAuthenticated, updateUserProfile);

router.get('/profile/regions', getRegionOptions);

router.get('/profile/event-types', getEventTypeOptions);

router.patch('/:id/role', isAuthenticated, isAdmin, updateUserRole);

export default router; 