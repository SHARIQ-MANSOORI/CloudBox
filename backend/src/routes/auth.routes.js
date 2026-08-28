import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { otpRateLimiter } from '../middleware/rateLimit.middleware.js';
import { signupSchema, verifyOtpSchema, loginSchema } from '../validators/auth.validator.js';

const router = Router();

// Signup with OTP generation (rate-limited)
router.post('/signup', otpRateLimiter, validate(signupSchema), authController.signup);

// Verify OTP (rate-limited)
router.post('/verify-otp', otpRateLimiter, validate(verifyOtpSchema), authController.verifyOtp);

// Login (issues access token + httpOnly refresh cookie)
router.post('/login', validate(loginSchema), authController.login);

// Refresh access token (rotates refresh token cookie & session in Redis)
router.post('/refresh', authController.refresh);

// Logout (revokes session in Redis & clears cookie)
router.post('/logout', authController.logout);

// Get current user profile (protected test endpoint)
router.get('/me', authenticateToken, authController.getMe);

export default router;
