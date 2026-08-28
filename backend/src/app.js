import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes.js';
import folderRoutes from './routes/folder.routes.js';
import fileRoutes from './routes/file.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import versionRoutes from './routes/version.routes.js';
import trashRoutes from './routes/trash.routes.js';
import shareRoutes from './routes/share.routes.js';
import userKeysRoutes from './routes/userKeys.routes.js';
import { errorHandler } from './middleware/error.middleware.js';

dotenv.config();

const app = express();
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

// Security Headers
app.use(helmet());

// CORS Configuration
app.use(cors({
  origin: clientUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ETag', 'eTag']
}));

// Body Parsers & Cookie Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'CloudBox API', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/files', versionRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/trash', trashRoutes);
app.use('/api', shareRoutes);
app.use('/api', userKeysRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Resource not found' });
});

// Centralized Error Handler
app.use(errorHandler);

export default app;
