import axios from 'axios';
import {
  initUploadSession,
  getPartUploadUrl,
  completePartUpload,
  completeUploadSession,
  getUploadSessionStatus,
  abortUploadSession
} from '../services/api';

export const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB minimum part size

const STORAGE_KEY = 'cloudbox_active_upload_sessions';

/**
 * Returns stored upload session entries from localStorage
 */
export const getStoredSessions = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    return {};
  }
};

/**
 * Saves or updates a session entry in localStorage
 */
export const saveStoredSession = (fingerprint, sessionData) => {
  try {
    const current = getStoredSessions();
    current[fingerprint] = sessionData;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    console.warn('Failed to save upload session state:', err);
  }
};

/**
 * Removes a session entry from localStorage
 */
export const removeStoredSession = (fingerprint) => {
  try {
    const current = getStoredSessions();
    delete current[fingerprint];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    console.warn('Failed to remove upload session state:', err);
  }
};

/**
 * Computes stable fingerprint key for file & directory context
 */
export const getFileFingerprint = (file, folderId) => {
  return `${file.name}_${file.size}_${folderId || 'root'}`;
};

/**
 * Uploads a single chunk blob to presigned part URL with exponential backoff retries
 */
export const uploadChunkWithRetry = async (partUrl, chunkBlob, maxRetries = 3) => {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const res = await axios.put(partUrl, chunkBlob, {
        headers: {
          'Content-Type': 'application/octet-stream'
        }
      });
      // Extract ETag header (case-insensitive search)
      const etagHeader = res.headers['etag'] || res.headers['ETag'] || res.headers['etag-header'] || `"mock_etag_${Date.now()}"`;
      return etagHeader;
    } catch (err) {
      attempt++;
      if (attempt >= maxRetries) {
        throw err;
      }
      // Exponential backoff delay (500ms, 1000ms, 2000ms)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 250));
    }
  }
};

/**
 * Complete Resumable Multipart Upload Orchestrator
 */
export class ResumableUploader {
  constructor({ file, originalFilename, folderId, wrappedKey = null, iv = null, onProgress, onError, onSuccess }) {
    this.file = file;
    this.filename = originalFilename || file.name || 'file';
    this.folderId = folderId === 'root' ? null : folderId;
    this.wrappedKey = wrappedKey;
    this.iv = iv;
    this.onProgress = onProgress;
    this.onError = onError;
    this.onSuccess = onSuccess;

    this.fingerprint = `${this.filename}_${file.size}_${this.folderId || 'root'}`;
    this.isPaused = false;
    this.isAborted = false;
    this.sessionId = null;
  }

  async startOrResume() {
    try {
      const stored = getStoredSessions()[this.fingerprint];

      let sessionInfo;
      let completedPartNumbers = new Set();

      if (stored && stored.sessionId) {
        // Attempt resume
        try {
          const statusRes = await getUploadSessionStatus(stored.sessionId);
          if (statusRes.status === 'in-progress') {
            this.sessionId = stored.sessionId;
            sessionInfo = {
              sessionId: statusRes.sessionId,
              totalChunks: statusRes.totalChunks
            };
            (statusRes.completedParts || []).forEach(p => completedPartNumbers.add(p.partNumber));
          }
        } catch (statusErr) {
          // Session expired or missing server-side; remove stale local entry
          removeStoredSession(this.fingerprint);
        }
      }

      if (!this.sessionId) {
        // Initialize new upload session
        const initRes = await initUploadSession(
          this.filename,
          this.file.type || 'application/octet-stream',
          this.file.size,
          this.folderId,
          this.wrappedKey,
          this.iv
        );
        this.sessionId = initRes.sessionId;
        sessionInfo = initRes;

        saveStoredSession(this.fingerprint, {
          sessionId: this.sessionId,
          fileId: initRes.fileId,
          filename: this.file.name,
          totalSize: this.file.size,
          folderId: this.folderId,
          totalChunks: initRes.totalChunks
        });
      }

      const totalChunks = sessionInfo.totalChunks;
      const totalSize = this.file.size;

      // Slice & Upload Chunks
      for (let partNum = 1; partNum <= totalChunks; partNum++) {
        if (this.isAborted) return;

        while (this.isPaused) {
          await new Promise(r => setTimeout(r, 300));
          if (this.isAborted) return;
        }

        const start = (partNum - 1) * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, totalSize);
        const chunkBlob = this.file.slice(start, end);

        if (completedPartNumbers.has(partNum)) {
          // Skip already completed part
          const currentUploadedBytes = Math.min(partNum * CHUNK_SIZE, totalSize);
          if (this.onProgress) {
            this.onProgress(currentUploadedBytes, totalSize);
          }
          continue;
        }

        // 1. Get presigned URL for this part
        const { partUrl } = await getPartUploadUrl(this.sessionId, partNum);

        if (this.isAborted) return;

        // 2. Upload chunk directly to S3 with retry
        const eTag = await uploadChunkWithRetry(partUrl, chunkBlob);

        if (this.isAborted) return;

        // 3. Confirm completed part with backend
        await completePartUpload(this.sessionId, partNum, eTag);
        completedPartNumbers.add(partNum);

        const currentUploadedBytes = Math.min(partNum * CHUNK_SIZE, totalSize);
        if (this.onProgress) {
          this.onProgress(currentUploadedBytes, totalSize);
        }
      }

      // Finalize session
      if (!this.isAborted && !this.isPaused) {
        const finalRes = await completeUploadSession(this.sessionId);
        removeStoredSession(this.fingerprint);
        if (this.onSuccess) {
          this.onSuccess(finalRes.file);
        }
      }
    } catch (err) {
      if (!this.isAborted && this.onError) {
        this.onError(err.response?.data?.message || err.message || 'Resumable upload failed.');
      }
    }
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  async abort() {
    this.isAborted = true;
    if (this.sessionId) {
      try {
        await abortUploadSession(this.sessionId);
      } catch (err) {
        console.warn('Abort upload session warning:', err);
      }
      removeStoredSession(this.fingerprint);
    }
  }
}
