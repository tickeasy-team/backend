import express, { Router } from 'express';
import { isAuthenticated } from '../middlewares/auth';
import { getUserProfile, updateUserProfile } from '../controllers/user';

const router: Router = express.Router();

router.get('/profile', isAuthenticated, getUserProfile);

router.put('/profile', isAuthenticated, updateUserProfile);

export default router; 