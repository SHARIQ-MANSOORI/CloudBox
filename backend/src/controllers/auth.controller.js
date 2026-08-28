import * as authService from '../services/auth.service.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
};

export const signup = async (req, res, next) => {
  try {
    const result = await authService.signupUser(req.body);
    return res.status(201).json({
      success: true,
      message: result.message,
      email: result.email
    });
  } catch (error) {
    next(error);
  }
};

export const verifyOtp = async (req, res, next) => {
  try {
    const result = await authService.verifyUserOtp(req.body);
    return res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { accessToken, refreshToken, user } = await authService.loginUser(req.body);
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      accessToken,
      user
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const refreshTokenCookie = req.cookies.refreshToken;
    const { accessToken, refreshToken, user } = await authService.refreshTokenSession(refreshTokenCookie);
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    return res.status(200).json({
      success: true,
      accessToken,
      user
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const refreshTokenCookie = req.cookies.refreshToken;
    const result = await authService.logoutUser(refreshTokenCookie);
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    return res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await authService.getCurrentUserProfile(req.user.userId);
    return res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};
