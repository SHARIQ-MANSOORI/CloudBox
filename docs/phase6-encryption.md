# Phase 6: Client-Side End-to-End Encryption (Zero-Knowledge Storage) Documentation

## Overview
This document details the architecture, cryptographic algorithms, database schema changes, key lifecycle workflows, sharing key-exchange protocol, and server-side zero-knowledge audit for Phase 6 of CloudBox.

CloudBox implements **Zero-Knowledge Client-Side End-to-End Encryption (E2EE)** using the browser-native **Web Crypto API** (`window.crypto.subtle`). All plaintext file content and cryptographic keys are encrypted client-side in the browser before being transmitted over the network or stored in AWS S3 / PostgreSQL.

---

## 1. Cryptographic Scheme & Algorithms

CloudBox uses a two-tier **Envelope Encryption** architecture combined with asymmetric RSA key wrapping for file sharing and PBKDF2 symmetric key derivation for private key protection:

| Component | Primitive / Algorithm | Parameters / Configuration | Purpose |
| :--- | :--- | :--- | :--- |
| **User Keypair** | **RSA-OAEP** | 2048-bit modulus, SHA-256 hash | Asymmetric keypair per user. Public key is plaintext; private key is encrypted client-side. |
| **Master Key** | **PBKDF2** | 100,000 iterations, SHA-256, 16-byte random salt | Derived in-browser from user password + stored salt to encrypt user's private key. |
| **Data Encryption Key (DEK)** | **AES-GCM** | 256-bit symmetric key, 12-byte random IV | Generated randomly in-browser per file version. Encrypts file payload before upload. |
| **Key Wrapping** | **RSA-OAEP** | SHA-256 hash | Wraps (encrypts) file DEK with uploading user's or recipient's RSA public key. |
| **Recovery Key** | **PBKDF2 + AES-GCM** | Random `CB-XXXX-XXXX-XXXX-XXXX` string | Secondary master key deriving key to encrypt private key as an account recovery safety net. |

---

## 2. Database Schema Additions & Models

### 2.1 `UserKeys` Model (`user_keys` Table)
Stores user's public key JWK, salt, and master-key encrypted private key blobs:
- `id` (UUID PK): Primary key.
- `userId` (UUID FK → `User.id`, unique): Owner user ID.
- `publicKey` (TEXT): Plaintext RSA-OAEP public key JWK JSON string (safe to store openly).
- `encryptedPrivateKey` (TEXT): AES-256-GCM encrypted PKCS#8 private key, wrapped with password-derived master key.
- `encryptedPrivateKeyRecovery` (TEXT): AES-256-GCM encrypted PKCS#8 private key, wrapped with recovery-key-derived master key.
- `pbkdf2Salt` (STRING): 16-byte hex salt used for PBKDF2 key derivation.

### 2.2 `FileVersion` Model Additions (`file_versions` Table)
- `wrappedKey` (TEXT): File DEK wrapped with uploader's RSA public key.
- `iv` (STRING): Base64-encoded 12-byte IV used for file content AES-256-GCM encryption.

### 2.3 `UploadSession` Model Additions (`upload_sessions` Table)
- `wrappedKey` (TEXT): Preserves file DEK wrapped key during resumable multipart uploads.
- `iv` (STRING): Preserves IV during resumable multipart uploads.

### 2.4 `FileShare` Model Additions (`file_shares` Table)
- `wrappedKeyForUser` (TEXT): File DEK re-wrapped with `sharedWithUserId`'s RSA public key.

---

## 3. Complete Key Lifecycle

```
========================================================================================
SIGNUP & KEYPAIR GENERATION
========================================================================================
User Enters Password ──► PBKDF2 (100k Iterations, Salt) ──► Password Master Key
                                                                 │
Generate RSA-OAEP 2048-bit Keypair                               │ Encrypt Private Key
  ├─ Public Key (JWK String) ───────────────────────────────────►┼──────────────────────► Store in DB (user_keys)
  └─ Private Key (PKCS#8) ───► AES-256-GCM (Master Key) ─────────┘
                                       │
Generate Recovery Key (CB-XXXX...) ────┴─► AES-256-GCM (Recovery Key) ────────────────► Display ONCE to User

========================================================================================
LOGIN & SESSION KEY UNLOCK
========================================================================================
User Enters Password ──► Fetch user_keys ──► Derive Master Key ──► Decrypt Private Key ──► Hold in Memory Session

========================================================================================
FILE UPLOAD FLOW (Direct & Resumable Multipart)
========================================================================================
Plaintext File ──► Generate Random DEK (AES-GCM) ──► Encrypt Content ──► S3 (Ciphertext Bytes)
                           │
                           ├─ Wrap DEK with Owner Public Key ─────────► Postgres (FileVersion.wrappedKey)
                           └─ Generate Random IV ─────────────────────► Postgres (FileVersion.iv)

========================================================================================
FILE SHARE FLOW (Asymmetric Key Exchange / Re-wrapping)
========================================================================================
Owner's Browser:
  1. Fetch Recipient's Public Key (from server)
  2. Decrypt File DEK using Owner's Private Key (already in memory)
  3. Re-wrap File DEK with Recipient's Public Key ───────────────────► Postgres (FileShare.wrappedKeyForUser)

========================================================================================
FILE DOWNLOAD & DECRYPTION FLOW
========================================================================================
Downloader's Browser:
  1. Fetch Presigned Download URL + wrappedKey (Owner or FileShare copy) + iv
  2. Fetch Ciphertext Bytes from S3
  3. Unwrap DEK using Downloader's Private Key (from memory session)
  4. Decrypt Ciphertext Bytes using DEK + iv ────────────────────────► Save Decrypted File locally
```

---

## 4. Server Zero-Knowledge Visibility Audit

| Data Asset | Server Visibility | Reason |
| :--- | :--- | :--- |
| **User Password** | ❌ Never sees plaintext | Hashed via bcrypt (Phase 1) for auth authentication. |
| **PBKDF2 Master Key** | ❌ Never receives | Derived purely inside browser memory. |
| **User Private Key** | ❌ Never sees in usable form | Received/stored ONLY as AES-256-GCM ciphertext. |
| **Data Encryption Key (DEK)** | ❌ Never sees plaintext | Received/stored ONLY wrapped with RSA public keys. |
| **File Bytes in S3** | ❌ Opaque Ciphertext | Encrypted client-side before upload; S3 sees raw random bytes. |
| **User Public Key** | ✅ Plaintext (Intended) | Publicly distributable for sharing re-wrapping. |
| **PBKDF2 Salt & IVs** | ✅ Plaintext (Intended) | Non-secret parameters required for derivation and decryption. |

---

## 5. Known Limitations & Architectural Notes

1. **Owner Online Requirement at Share Time**:
   - Because file DEKs are stored encrypted, sharing a file requires the owner's browser to be active and logged in to unlock their private key and re-encrypt the DEK with the recipient's public key.
2. **Password Reset without Recovery Key**:
   - Because the server holds zero knowledge of private keys or master keys, resetting a password without the one-time **Recovery Key** results in permanent, unrecoverable loss of existing encrypted files.
3. **Session Key Lifespan**:
   - Decrypted private keys exist only within transient browser memory (`AuthContext`) during an active session and are wiped immediately on sign out or browser tab closure.
