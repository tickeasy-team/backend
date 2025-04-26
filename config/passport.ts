import passport from 'passport';
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { AppDataSource } from './database';
import { User, UserRole, OAuthProvider, Gender } from '../models/user';
import dotenv from 'dotenv';

dotenv.config();

// 擴展 GoogleUser 類型以匹配代碼中實際返回的用戶數據結構
interface GoogleUser {
  user: {
    userId: string;
    email: string;
    name: string;
    avatar?: string;
    role: UserRole;
    oauthProviders: OAuthProvider[];
    phone?: string;
    address?: string;
    birthday?: Date;
    gender?: Gender;
    isEmailVerified: boolean;
    [key: string]: any;
  }
}

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    passReqToCallback: true,
    scope: ['profile', 'email']
  },
  async function (req: any, accessToken: string, refreshToken: string | undefined, profile: Profile, done: VerifyCallback) {
    try {
      const userRepository = AppDataSource.getRepository(User);

      // 檢查 profile 是否包含必要信息
      if (!profile.id) {
        return done(new Error('Google profile ID not found'));
      }
      if (!profile.emails || !profile.emails[0]?.value) {
          return done(new Error('Google profile email not found'));
      }
      const email = profile.emails[0].value;
      const googleId = profile.id;
      const avatarUrl = profile.photos?.[0]?.value; // 使用可選鏈接取頭像

      // 由於 oauthProviders 是 jsonb，我們不能直接在 where 條件中查詢內部屬性。
      // 先根據 email 查找用戶
      let user = await userRepository.findOne({ where: { email } });

      if (user) {
        // 找到用戶，檢查 oauthProviders 陣列中是否已有 Google 記錄
        const existingProvider = user.oauthProviders?.find(p => p.provider === 'google');

        if (existingProvider) {
          // 已有關聯，檢查 providerId 是否一致（理論上應該一致）
          if (existingProvider.providerId !== googleId) {
            // 這是一個異常情況，可能需要記錄或處理
            console.warn(`Mismatched Google ID for email ${email}. DB: ${existingProvider.providerId}, Google: ${googleId}`);
            // 可以選擇更新 providerId，或拋出錯誤，取決於業務邏輯
            existingProvider.providerId = googleId; // 暫定更新
          }
          // 更新 token 和過期時間
          existingProvider.accessToken = accessToken;
          existingProvider.refreshToken = refreshToken;
          existingProvider.tokenExpiresAt = new Date(Date.now() + 3600000);
          if (avatarUrl && user.avatar !== avatarUrl) { // 更新頭像如果不同
            user.avatar = avatarUrl;
          }
          await userRepository.save(user);
        } else {
          // Email 存在但未關聯 Google，添加 Google OAuth 提供者信息
          user.oauthProviders = user.oauthProviders || []; // 確保陣列存在
          user.oauthProviders.push({
            provider: 'google',
            providerId: googleId,
            accessToken,
            refreshToken,
            tokenExpiresAt: new Date(Date.now() + 3600000)
          });
          if (avatarUrl && !user.avatar) { // 只有在用戶沒有頭像時才更新
            user.avatar = avatarUrl;
          }
          user.isEmailVerified = true; // Google 登入視為已驗證
          await userRepository.save(user);
        }
      } else {
        // Email 不存在，創建新用戶並關聯 Google
        const newUser = userRepository.create({
          email: email,
          avatar: avatarUrl,
          name: profile.displayName || email.split('@')[0],
          role: UserRole.USER,
          isEmailVerified: true,
          oauthProviders: [{
            provider: 'google',
            providerId: googleId,
            accessToken,
            refreshToken,
            tokenExpiresAt: new Date(Date.now() + 3600000)
          }]
        });
        user = await userRepository.save(newUser);
      }

      // 準備傳遞給 Controller 的用戶資料結構，需與 Controller 中預期的一致
      const userData: GoogleUser = {
        user: {
          userId: user.userId, // 使用 userId 而非 id
          email: user.email,
          name: user.name, // 確保 name 被包含
          avatar: user.avatar,
          role: user.role,
          oauthProviders: user.oauthProviders,
          phone: user.phone,
          address: user.address,
          birthday: user.birthday,
          gender: user.gender,
          isEmailVerified: user.isEmailVerified
          // ... 其他需要的 user 欄位
        }
      };

      return done(null, userData as any); // 使用類型斷言來解決類型不匹配問題
    } catch (err) {
      console.error("Error in Google Strategy verify callback:", err); // 添加日誌記錄
      return done(err);
    }
  })
);

// 可選：序列化和反序列化用戶 (如果使用 session)
// passport.serializeUser((user: any, done) => {
//   done(null, user.user.userId); // 使用 userId 而非 id
// });

// passport.deserializeUser(async (id: string, done) => {
//   try {
//     const userRepository = AppDataSource.getRepository(User);
//     const user = await userRepository.findOne({ where: { userId: id } });
//     // 準備反序列化後的用戶資料結構，可能需要調整以匹配應用需求
//     const userData = user ? { user: { userId: user.userId, email: user.email, role: user.role /* ...其他欄位 */ } } : null;
//     done(null, userData);
//   } catch (err) {
//     done(err);
//   }
// });

export default passport; 