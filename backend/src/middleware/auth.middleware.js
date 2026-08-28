import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const jwtAccessSecret = process.env.JWT_ACCESS_SECRET || 'cloudbox_dev_access_secret_key_123456789';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Authentication token missing.'
    });
  }

  try {
    const decoded = jwt.verify(token, jwtAccessSecret);
    req.user = { ...decoded, id: decoded.userId || decoded.id };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Access token expired. Please refresh your session.',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid access token. Authentication failed.',
      code: 'INVALID_TOKEN'
    });
  }
};
