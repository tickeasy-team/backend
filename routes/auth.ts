import express, { Router } from 'express';
import {
  register,
  login,
  verifyEmail,
  resendVerification,
  requestPasswordReset,
  resetPassword,
  googleLogin
} from '../controllers/auth';
import passport from '../config/passport';

const router: Router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);
// google login
// router.get('/google', googleLogin); // Passport 會處理重定向 (舊的)
// router.get('/google/callback', googleLogin); // 處理 Google 回調 (舊的)
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] })); // 觸發 Google 登入
router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: process.env.FRONTEND_LOGIN_FAIL_URL || '/login/failed', // 登入失敗跳轉的 URL
    session: false // 不使用 session
  }), 
  googleLogin // Passport 驗證成功後執行此控制器
);

export default router; 