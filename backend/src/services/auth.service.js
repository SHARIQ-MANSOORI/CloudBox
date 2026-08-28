import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { User } from '../models/index.js';
import { cacheService } from '../config/redis.js';
import { sendOtpEmail } from './mail.service.js';

dotenv.config();

const jwtAccessSecret = process.env.JWT_ACCESS_SECRET || 'cloudbox_dev_access_secret_key_123456789';
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'cloudbox_dev_refresh_secret_key_987654321';
const otpExpiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '15', 10);

export const signupUser = async ({ email, password }) => {
  const existingUser = await User.findOne({ where: { email } });

  if (existingUser && existingUser.isVerified) {
    const error = new Error('An account with this email address already exists. Please log in.');
    error.statusCode = 400;
    throw error;
  }

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  if (existingUser && !existingUser.isVerified) {
    existingUser.passwordHash = passwordHash;
    await existingUser.save();
  } else {
    await User.create({
      email,
      passwordHash,
      isVerified: false
    });
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expirySeconds = otpExpiryMinutes * 60;

  // Store in Redis keyed by email
  await cacheService.set(`otp:${email}`, otp, expirySeconds);

  // Send OTP email
  await sendOtpEmail(email, otp);

  return {
    email,
    message: 'Check your inbox for a code to verify your account.'
  };
};

export const verifyUserOtp = async ({ email, otp }) => {
  const storedOtp = await cacheService.get(`otp:${email}`);

  if (!storedOtp) {
    const error = new Error('Verification code has expired or is invalid. Please request a new code.');
    error.statusCode = 400;
    throw error;
  }

  if (storedOtp !== otp) {
    const error = new Error('Incorrect verification code. Please check your inbox and try again.');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findOne({ where: { email } });
  if (!user) {
    const error = new Error('Account not found.');
    error.statusCode = 404;
    throw error;
  }

  user.isVerified = true;
  await user.save();

  // Delete OTP after successful verification
  await cacheService.del(`otp:${email}`);

  return {
    message: 'Your email address has been verified successfully. You can now log in.'
  };
};

export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ where: { email } });

  if (!user) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  if (!user.isVerified) {
    const error = new Error('Your account is not verified yet. Please check your inbox for the verification code.');
    error.statusCode = 403;
    throw error;
  }

  // Issue 15-minute JWT Access Token
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email },
    jwtAccessSecret,
    { expiresIn: '15m' }
  );

  // Issue 7-day JWT Refresh Token with unique tokenId for rotation
  const tokenId = crypto.randomUUID();
  const refreshToken = jwt.sign(
    { userId: user.id, tokenId },
    jwtRefreshSecret,
    { expiresIn: '7d' }
  );

  // Store active refresh token identifier in Redis (7 days = 604800 seconds)
  const refreshExpirySeconds = 7 * 24 * 60 * 60;
  await cacheService.set(`refresh:${user.id}:${tokenId}`, 'active', refreshExpirySeconds);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      isVerified: user.isVerified,
      createdAt: user.createdAt
    }
  };
};

export const refreshTokenSession = async (oldRefreshTokenCookie) => {
  if (!oldRefreshTokenCookie) {
    const error = new Error('Refresh token missing. Please log in.');
    error.statusCode = 401;
    throw error;
  }

  let decoded;
  try {
    decoded = jwt.verify(oldRefreshTokenCookie, jwtRefreshSecret);
  } catch (err) {
    const error = new Error('Invalid or expired session. Please log in again.');
    error.statusCode = 401;
    throw error;
  }

  const { userId, tokenId } = decoded;

  // Check if token exists in Redis
  const storedStatus = await cacheService.get(`refresh:${userId}:${tokenId}`);
  if (!storedStatus) {
    const error = new Error('Session has been revoked or expired. Please log in again.');
    error.statusCode = 401;
    throw error;
  }

  // Refresh Token Rotation: invalidate old token in Redis
  await cacheService.del(`refresh:${userId}:${tokenId}`);

  const user = await User.findByPk(userId);
  if (!user || !user.isVerified) {
    const error = new Error('User account unavailable or not verified.');
    error.statusCode = 401;
    throw error;
  }

  // Issue new access token
  const newAccessToken = jwt.sign(
    { userId: user.id, email: user.email },
    jwtAccessSecret,
    { expiresIn: '15m' }
  );

  // Issue new refresh token
  const newTokenId = crypto.randomUUID();
  const newRefreshToken = jwt.sign(
    { userId: user.id, tokenId: newTokenId },
    jwtRefreshSecret,
    { expiresIn: '7d' }
  );

  // Store new token in Redis
  const refreshExpirySeconds = 7 * 24 * 60 * 60;
  await cacheService.set(`refresh:${user.id}:${newTokenId}`, 'active', refreshExpirySeconds);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user: {
      id: user.id,
      email: user.email,
      isVerified: user.isVerified,
      createdAt: user.createdAt
    }
  };
};

export const logoutUser = async (refreshTokenCookie) => {
  if (refreshTokenCookie) {
    try {
      const decoded = jwt.verify(refreshTokenCookie, jwtRefreshSecret);
      const { userId, tokenId } = decoded;
      if (userId && tokenId) {
        await cacheService.del(`refresh:${userId}:${tokenId}`);
      }
    } catch (err) {
      // Ignore token verification errors during logout
    }
  }

  return {
    message: 'Logged out successfully.'
  };
};

export const getCurrentUserProfile = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: ['id', 'email', 'isVerified', 'createdAt', 'updatedAt']
  });

  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  return user;
};
