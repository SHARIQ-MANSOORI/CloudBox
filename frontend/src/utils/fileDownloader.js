import { getFileDownloadUrl } from '../services/api';
import { unwrapDEK, decryptFileContent } from './crypto';

/**
 * Transparently downloads presigned file bytes from S3, unwraps DEK using current user's
 * private key, decrypts ciphertext in-browser via Web Crypto API, and triggers browser file save.
 */
export const downloadAndDecryptFile = async ({ fileId, fileName, mimeType, userPrivateKey }) => {
  const { downloadUrl, wrappedKey, iv } = await getFileDownloadUrl(fileId);

  // Fetch raw S3 object bytes
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch file payload from storage (HTTP ${response.status})`);
  }
  const ciphertextBuffer = await response.arrayBuffer();

  let blob;
  if (wrappedKey) {
    if (!userPrivateKey) {
      throw new Error('Your encryption keys are locked. Please click the Security badge to unlock them before downloading.');
    }
    // Zero-Knowledge Client-Side Decryption
    const dekObj = await unwrapDEK(wrappedKey, userPrivateKey);
    const decryptedBuffer = await decryptFileContent(ciphertextBuffer, dekObj, iv);
    blob = new Blob([decryptedBuffer], { type: mimeType || 'application/octet-stream' });
  } else {
    // Unencrypted file
    blob = new Blob([ciphertextBuffer], { type: mimeType || 'application/octet-stream' });
  }

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.setAttribute('download', fileName || 'download');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
};
