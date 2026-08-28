import axios from 'axios';

// Singleton in-memory access token reference
let inMemoryAccessToken = null;

export const setMemoryToken = (token) => {
  inMemoryAccessToken = token;
};

export const getMemoryToken = () => {
  return inMemoryAccessToken;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api`
  : '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Necessary for httpOnly refresh token cookie
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor: Attach memory access token if present
api.interceptors.request.use(
  (config) => {
    if (inMemoryAccessToken) {
      config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Helper callback to notify AuthContext when automatic refresh succeeds or fails
let onTokenRefreshedCallback = null;
let onSessionExpiredCallback = null;

export const setupAuthInterceptors = (onRefreshed, onExpired) => {
  onTokenRefreshedCallback = onRefreshed;
  onSessionExpiredCallback = onExpired;
};

// Response interceptor: Handle 401 & automatic token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do not retry refresh requests themselves to prevent infinite loops
    if (originalRequest.url === '/auth/refresh' || originalRequest.url === '/auth/login') {
      return Promise.reject(error);
    }

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshResponse = await api.post('/auth/refresh');
        const { accessToken, user } = refreshResponse.data;

        setMemoryToken(accessToken);
        if (onTokenRefreshedCallback) {
          onTokenRefreshedCallback(accessToken, user);
        }

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        setMemoryToken(null);
        if (onSessionExpiredCallback) {
          onSessionExpiredCallback();
        }
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

// Folder API Methods
export const getFolderContents = async (folderId = 'root') => {
  const response = await api.get(`/folders/${folderId}/contents`);
  return response.data;
};

export const createFolder = async (name, parentFolderId = null) => {
  const response = await api.post('/folders', { name, parentFolderId });
  return response.data;
};

export const renameFolder = async (folderId, name) => {
  const response = await api.patch(`/folders/${folderId}`, { name });
  return response.data;
};

export const deleteFolder = async (folderId) => {
  const response = await api.delete(`/folders/${folderId}`);
  return response.data;
};

// File API Methods
export const requestUploadUrl = async (name, mimeType, sizeInBytes, folderId = null) => {
  const response = await api.post('/files/upload-url', {
    name,
    mimeType,
    sizeInBytes,
    folderId
  });
  return response.data;
};

export const directUploadToS3 = async (uploadUrl, file, onProgress) => {
  // Direct PUT to S3 (or mock S3 endpoint) using standalone Axios without API base URL
  return await axios.put(uploadUrl, file, {
    headers: {
      'Content-Type': file.type || 'application/octet-stream'
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    }
  });
};

export const confirmFileUpload = async (fileId, sizeInBytes, wrappedKey = null, iv = null) => {
  const response = await api.post(`/files/${fileId}/confirm`, { sizeInBytes, wrappedKey, iv });
  return response.data;
};

export const getFileDownloadUrl = async (fileId) => {
  const response = await api.get(`/files/${fileId}/download-url`);
  return response.data;
};

export const renameFile = async (fileId, name) => {
  const response = await api.patch(`/files/${fileId}`, { name });
  return response.data;
};

export const deleteFile = async (fileId) => {
  const response = await api.delete(`/files/${fileId}`);
  return response.data;
};

// Multipart Upload Session API Methods
export const initUploadSession = async (filename, mimeType, totalSize, folderId = null, wrappedKey = null, iv = null) => {
  const response = await api.post('/uploads/init', {
    filename,
    mimeType,
    totalSize,
    folderId,
    wrappedKey,
    iv
  });
  return response.data;
};

export const getPartUploadUrl = async (sessionId, partNumber) => {
  const response = await api.post(`/uploads/${sessionId}/part-url`, { partNumber });
  return response.data;
};

export const completePartUpload = async (sessionId, partNumber, eTag) => {
  const response = await api.post(`/uploads/${sessionId}/complete-part`, { partNumber, eTag });
  return response.data;
};

export const completeUploadSession = async (sessionId) => {
  const response = await api.post(`/uploads/${sessionId}/complete`);
  return response.data;
};

export const getUploadSessionStatus = async (sessionId) => {
  const response = await api.get(`/uploads/${sessionId}/status`);
  return response.data;
};

export const abortUploadSession = async (sessionId) => {
  const response = await api.post(`/uploads/${sessionId}/abort`);
  return response.data;
};

// File Versioning API Methods
export const getFileVersions = async (fileId) => {
  const response = await api.get(`/files/${fileId}/versions`);
  return response.data;
};

export const restoreFileVersion = async (fileId, versionId) => {
  const response = await api.post(`/files/${fileId}/versions/${versionId}/restore`);
  return response.data;
};

// Trash API Methods
export const getUserTrash = async () => {
  const response = await api.get('/trash');
  return response.data;
};

export const restoreTrashItem = async (type, id) => {
  const endpoint = type === 'file' ? `/trash/files/${id}/restore` : `/trash/folders/${id}/restore`;
  const response = await api.post(endpoint);
  return response.data;
};

export const permanentlyPurgeTrashItem = async (type, id) => {
  const response = await api.delete(`/trash/${type}/${id}`);
  return response.data;
};

// Sharing API Methods
export const shareItem = async (type, id, email, role, wrappedKeyForUser = null, fileWrappedKeys = null) => {
  const endpoint = type === 'file' ? `/files/${id}/share` : `/folders/${id}/share`;
  const response = await api.post(endpoint, { email, role, wrappedKeyForUser, fileWrappedKeys });
  return response.data;
};

export const getItemShares = async (type, id) => {
  const endpoint = type === 'file' ? `/files/${id}/shares` : `/folders/${id}/shares`;
  const response = await api.get(endpoint);
  return response.data;
};

export const updateShareRole = async (type, id, shareId, role) => {
  const endpoint = type === 'file' ? `/files/${id}/shares/${shareId}` : `/folders/${id}/shares/${shareId}`;
  const response = await api.patch(endpoint, { role });
  return response.data;
};

export const revokeShare = async (type, id, shareId) => {
  const endpoint = type === 'file' ? `/files/${id}/shares/${shareId}` : `/folders/${id}/shares/${shareId}`;
  const response = await api.delete(endpoint);
  return response.data;
};

export const getSharedWithMe = async () => {
  const response = await api.get('/shared-with-me');
  return response.data;
};

// User Cryptographic Keys API Methods
export const getPublicKeyByEmail = async (email) => {
  const response = await api.get(`/users/public-key?email=${encodeURIComponent(email)}`);
  return response.data;
};

export const getCollaboratorPublicKeysForFolder = async (folderId) => {
  const response = await api.get(`/folders/${folderId}/collaborator-public-keys`);
  return response.data;
};


