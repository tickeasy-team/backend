import express, { Router } from 'express';
import { isAuthenticated } from '../middlewares/auth';
import { getUserProfile, updateUserProfile, getRegionOptions, getEventTypeOptions } from '../controllers/user';

const router: Router = express.Router();

router.get('/profile', isAuthenticated, getUserProfile);

router.put('/profile', isAuthenticated, updateUserProfile);

router.get('/profile/regions', getRegionOptions);

router.get('/profile/event-types', getEventTypeOptions);

export default router; 