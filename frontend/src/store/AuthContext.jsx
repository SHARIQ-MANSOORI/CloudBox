import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setMemoryToken, setupAuthInterceptors } from '../services/api';
import {
  generatePbkdf2Salt,
  deriveMasterKey,
  generateUserKeyPair,
  encryptPrivateKey,
  decryptPrivateKey,
  importPublicKey,
  generateRecoveryKey,
  deriveMasterKeyFromRecovery
} from '../utils/crypto';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // In-Memory Decrypted Cryptographic Keys (Session only)
  const [userPrivateKey, setUserPrivateKey] = useState(null);
  const [userPublicKey, setUserPublicKey] = useState(null);
  const [pendingRecoveryKey, setPendingRecoveryKey] = useState(null);

  const saveKeysToSessionStorage = async (privateKeyObj, publicKeyObj) => {
    try {
      const privateKeyJwk = await window.crypto.subtle.exportKey('jwk', privateKeyObj);
      const publicKeyJwk = await window.crypto.subtle.exportKey('jwk', publicKeyObj);
      sessionStorage.setItem('cb_private_key', JSON.stringify(privateKeyJwk));
      sessionStorage.setItem('cb_public_key', JSON.stringify(publicKeyJwk));
    } catch (e) {
      console.warn('[Crypto] Failed to save keys to sessionStorage:', e);
    }
  };

  const loadKeysFromSessionStorage = async () => {
    try {
      const privateKeyJwkStr = sessionStorage.getItem('cb_private_key');
      const publicKeyJwkStr = sessionStorage.getItem('cb_public_key');
      if (privateKeyJwkStr && publicKeyJwkStr) {
        const privateKeyJwk = JSON.parse(privateKeyJwkStr);
        const publicKeyJwk = JSON.parse(publicKeyJwkStr);

        const privateKeyObj = await window.crypto.subtle.importKey(
          'jwk',
          privateKeyJwk,
          { name: 'RSA-OAEP', hash: 'SHA-256' },
          true,
          ['decrypt', 'unwrapKey']
        );
        const publicKeyObj = await window.crypto.subtle.importKey(
          'jwk',
          publicKeyJwk,
          { name: 'RSA-OAEP', hash: 'SHA-256' },
          true,
          ['encrypt', 'wrapKey']
        );

        setUserPrivateKey(privateKeyObj);
        setUserPublicKey(publicKeyObj);
        console.log('[Crypto] Keys restored from sessionStorage.');
      }
    } catch (e) {
      console.warn('[Crypto] Failed to load keys from sessionStorage:', e);
    }
  };

  const updateSession = useCallback((token, userData) => {
    setMemoryToken(token);
    setAccessToken(token);
    setUser(userData);
  }, []);

  const clearSession = useCallback(() => {
    setMemoryToken(null);
    setAccessToken(null);
    setUser(null);
    setUserPrivateKey(null);
    setUserPublicKey(null);
    setPendingRecoveryKey(null);
    sessionStorage.removeItem('cb_private_key');
    sessionStorage.removeItem('cb_public_key');
  }, []);

  // Setup interceptor callbacks
  useEffect(() => {
    setupAuthInterceptors(
      (newToken, newUserData) => updateSession(newToken, newUserData),
      () => clearSession()
    );
  }, [updateSession, clearSession]);

  // Attempt silent refresh on app startup
  useEffect(() => {
    let isMounted = true;

    const checkExistingSession = async () => {
      try {
        const response = await api.post('/auth/refresh');
        if (isMounted && response.data.success) {
          updateSession(response.data.accessToken, response.data.user);
          await loadKeysFromSessionStorage();
        }
      } catch (err) {
        // No active session or refresh token expired
        if (isMounted) clearSession();
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    checkExistingSession();

    return () => {
      isMounted = false;
    };
  }, [updateSession, clearSession]);

  /**
   * Generates and stores new RSA key pair for a user
   */
  const generateAndSaveUserKeys = async (password) => {
    const { publicKeyJwkStr, privateKeyPkcs8Buffer, publicKeyObj, privateKeyObj } = await generateUserKeyPair();
    const pbkdf2Salt = generatePbkdf2Salt();

    // 1. Password Master Key & Encrypted Private Key
    const masterKey = await deriveMasterKey(password, pbkdf2Salt);
    const encryptedPrivateKey = await encryptPrivateKey(privateKeyPkcs8Buffer, masterKey);

    // 2. Recovery Master Key & Encrypted Private Key (Recovery Safety Net)
    const recoveryKey = generateRecoveryKey();
    const recoveryMasterKey = await deriveMasterKeyFromRecovery(recoveryKey, pbkdf2Salt);
    const encryptedPrivateKeyRecovery = await encryptPrivateKey(privateKeyPkcs8Buffer, recoveryMasterKey);

    // 3. Store on Backend
    await api.post('/user-keys', {
      publicKey: publicKeyJwkStr,
      encryptedPrivateKey,
      encryptedPrivateKeyRecovery,
      pbkdf2Salt
    });

    // 4. Hold unlocked key objects in memory session
    setUserPrivateKey(privateKeyObj);
    setUserPublicKey(publicKeyObj);
    await saveKeysToSessionStorage(privateKeyObj, publicKeyObj);
    setPendingRecoveryKey(recoveryKey);

    return recoveryKey;
  };

  /**
   * Unlocks existing user private key using password
   */
  const unlockPrivateKey = async (password) => {
    const res = await api.get('/user-keys/me');
    if (!res.data.keys) {
      // User has no key pair yet -> generate one now
      return await generateAndSaveUserKeys(password);
    }

    const { publicKey, encryptedPrivateKey, pbkdf2Salt } = res.data.keys;
    const masterKey = await deriveMasterKey(password, pbkdf2Salt);
    const privateKeyObj = await decryptPrivateKey(encryptedPrivateKey, masterKey);
    const publicKeyObj = await importPublicKey(publicKey);

    setUserPrivateKey(privateKeyObj);
    setUserPublicKey(publicKeyObj);
    await saveKeysToSessionStorage(privateKeyObj, publicKeyObj);
    return null;
  };

  const signup = async (email, password) => {
    const response = await api.post('/auth/signup', { email, password });
    return response.data;
  };

  const verifyOtp = async (email, otp, passwordForKeys = null) => {
    const response = await api.post('/auth/verify-otp', { email, otp });
    return response.data;
  };

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.success) {
      updateSession(response.data.accessToken, response.data.user);
      try {
        // Unlock user private key transparently during login
        const recoveryKey = await unlockPrivateKey(password);
        if (recoveryKey) {
          response.data.recoveryKey = recoveryKey;
        }
      } catch (err) {
        console.warn('[Crypto Warning] Key unlocking during login failed:', err.message);
      }
    }
    return response.data;
  };

  const recoverAccount = async (email, recoveryKey, newPassword) => {
    // 1. Fetch recovery data payload from server
    const dataRes = await api.post('/user-keys/recovery-data', { email });
    const { userId, pbkdf2Salt, encryptedPrivateKeyRecovery, publicKey } = dataRes.data;

    // 2. Derive master key from recovery key & decrypt private key
    const recoveryMasterKey = await deriveMasterKeyFromRecovery(recoveryKey, pbkdf2Salt);
    const privateKeyObj = await decryptPrivateKey(encryptedPrivateKeyRecovery, recoveryMasterKey);
    const publicKeyObj = await importPublicKey(publicKey);

    // 3. Export private key buffer & re-encrypt with NEW password master key
    const privateKeyPkcs8Buffer = await window.crypto.subtle.exportKey('pkcs8', privateKeyObj);
    const newPbkdf2Salt = generatePbkdf2Salt();
    const newMasterKey = await deriveMasterKey(newPassword, newPbkdf2Salt);
    const newEncryptedPrivateKey = await encryptPrivateKey(privateKeyPkcs8Buffer, newMasterKey);

    // 4. Update backend with new encrypted private key
    await api.post('/user-keys/recover-update', {
      userId,
      newEncryptedPrivateKey,
      newPbkdf2Salt
    });

    setUserPrivateKey(privateKeyObj);
    setUserPublicKey(publicKeyObj);

    return { success: true, message: 'Account recovery successful. You can now log in with your new password.' };
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Logout request warning:', err.message);
    } finally {
      clearSession();
    }
  };

  const fetchMe = async () => {
    const response = await api.get('/auth/me');
    if (response.data.success) {
      setUser(response.data.user);
    }
    return response.data;
  };

  const clearPendingRecoveryKey = () => setPendingRecoveryKey(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!user,
        isLoading,
        userPrivateKey,
        userPublicKey,
        pendingRecoveryKey,
        clearPendingRecoveryKey,
        generateAndSaveUserKeys,
        unlockPrivateKey,
        signup,
        verifyOtp,
        login,
        recoverAccount,
        logout,
        fetchMe
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
