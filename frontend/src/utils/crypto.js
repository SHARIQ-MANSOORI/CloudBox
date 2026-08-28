/**
 * Browser-Native Web Crypto API Utility Service for CloudBox Phase 6 Zero-Knowledge End-to-End Encryption
 * Uses RSA-OAEP (2048-bit, SHA-256), AES-256-GCM, and PBKDF2 (100,000 iterations, SHA-256).
 */

// Helper: Convert ArrayBuffer to Base64 String
export function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper: Convert Base64 String to ArrayBuffer
export function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Helper: Hex string encoder/decoder
export function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBuffer(hex) {
  const bytes = new Uint8Array(Math.ceil(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes.buffer;
}

/**
 * 1. Generate Random Salt for PBKDF2
 */
export function generatePbkdf2Salt() {
  const saltBytes = window.crypto.getRandomValues(new Uint8Array(16));
  return bufferToHex(saltBytes);
}

/**
 * 2. Derive Symmetric Master Key from Password & Salt using PBKDF2
 */
export async function deriveMasterKey(password, saltHex) {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = hexToBuffer(saltHex);

  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const masterKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return masterKey;
}

/**
 * 3. Generate Per-User RSA-OAEP 2048-bit Key Pair
 */
export async function generateUserKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );

  const publicKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const publicKeyJwkStr = JSON.stringify(publicKeyJwk);

  const privateKeyPkcs8Buffer = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

  return {
    publicKeyJwkStr,
    privateKeyPkcs8Buffer,
    publicKeyObj: keyPair.publicKey,
    privateKeyObj: keyPair.privateKey
  };
}

/**
 * 4. Encrypt Private Key PKCS#8 Buffer with Master Key (AES-256-GCM)
 */
export async function encryptPrivateKey(privateKeyPkcs8Buffer, masterKey) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    masterKey,
    privateKeyPkcs8Buffer
  );

  return JSON.stringify({
    iv: arrayBufferToBase64(iv),
    ciphertext: arrayBufferToBase64(ciphertextBuffer)
  });
}

/**
 * 5. Decrypt Private Key JSON Payload with Master Key (AES-256-GCM) & Import to CryptoKey
 */
export async function decryptPrivateKey(encryptedPrivateKeyStr, masterKey) {
  const payload = typeof encryptedPrivateKeyStr === 'string' ? JSON.parse(encryptedPrivateKeyStr) : encryptedPrivateKeyStr;
  const iv = base64ToArrayBuffer(payload.iv);
  const ciphertextBuffer = base64ToArrayBuffer(payload.ciphertext);

  const privateKeyPkcs8Buffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    masterKey,
    ciphertextBuffer
  );

  const privateKeyObj = await window.crypto.subtle.importKey(
    'pkcs8',
    privateKeyPkcs8Buffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['decrypt', 'unwrapKey']
  );

  return privateKeyObj;
}

/**
 * 6. Import Public Key JWK String to CryptoKey
 */
export async function importPublicKey(publicKeyJwkStr) {
  const jwk = typeof publicKeyJwkStr === 'string' ? JSON.parse(publicKeyJwkStr) : publicKeyJwkStr;
  return await window.crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['encrypt', 'wrapKey']
  );
}

/**
 * 7. Generate Random One-Time Recovery Key String (Format: CB-XXXX-XXXX-XXXX-XXXX)
 */
export function generateRecoveryKey() {
  const bytes = window.crypto.getRandomValues(new Uint8Array(10));
  const hex = bufferToHex(bytes).toUpperCase();
  return `CB-${hex.substr(0, 4)}-${hex.substr(4, 4)}-${hex.substr(8, 4)}-${hex.substr(12, 4)}`;
}

/**
 * 8. Derive Master Key from Recovery Key Code
 */
export async function deriveMasterKeyFromRecovery(recoveryKey, saltHex) {
  const cleanKey = recoveryKey.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  return await deriveMasterKey(`RECOVERY_${cleanKey}`, saltHex);
}

/**
 * 9. Generate Per-File AES-256-GCM Data Encryption Key (DEK)
 */
export async function generateDEK() {
  return await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * 10. Encrypt File ArrayBuffer with DEK (AES-256-GCM)
 */
export async function encryptFileContent(fileArrayBuffer, dekObj) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    dekObj,
    fileArrayBuffer
  );

  return {
    ciphertextBuffer,
    ivBase64: arrayBufferToBase64(iv)
  };
}

/**
 * 11. Decrypt File Ciphertext ArrayBuffer with DEK (AES-256-GCM)
 */
export async function decryptFileContent(ciphertextBuffer, dekObj, ivBase64) {
  const ivBuffer = base64ToArrayBuffer(ivBase64);
  const decryptedArrayBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(ivBuffer) },
    dekObj,
    ciphertextBuffer
  );

  return decryptedArrayBuffer;
}

/**
 * 12. Wrap DEK with RSA Public Key (RSA-OAEP)
 */
export async function wrapDEK(dekObj, recipientPublicKeyObj) {
  const wrappedBuffer = await window.crypto.subtle.wrapKey(
    'raw',
    dekObj,
    recipientPublicKeyObj,
    { name: 'RSA-OAEP' }
  );

  return arrayBufferToBase64(wrappedBuffer);
}

/**
 * 13. Unwrap DEK with RSA Private Key (RSA-OAEP)
 */
export async function unwrapDEK(wrappedKeyBase64, userPrivateKeyObj) {
  const wrappedBuffer = base64ToArrayBuffer(wrappedKeyBase64);
  const dekObj = await window.crypto.subtle.unwrapKey(
    'raw',
    wrappedBuffer,
    userPrivateKeyObj,
    { name: 'RSA-OAEP' },
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  return dekObj;
}
