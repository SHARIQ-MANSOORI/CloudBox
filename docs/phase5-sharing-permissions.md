# Phase 5: Sharing & Role-Based Permissions Documentation

## Overview
This document details the architecture, `FileShare` database model, centralized authorization service (`getEffectiveFileRole` & `getEffectiveFolderRole`), folder permission cascading with explicit file overrides, role capabilities matrix (`Owner`, `Editor`, `Viewer`), share management endpoints, consumer UI components, and the flagged open question for Phase 6 (Client-Side Encryption).

---

## 1. Implemented Feature List

1. **Database Model & Migration**
   - **`FileShare` Model** ([fileShare.model.js](file:///c:/Users/shari/OneDrive/Desktop/CloudBox/backend/src/models/fileShare.model.js)): `id` (UUID PK), `fileId` (FK → File, nullable), `folderId` (FK → Folder, nullable), `ownerId` (FK → User), `sharedWithUserId` (FK → User), `role` (enum: `'viewer'`, `'editor'`), `createdAt`. Exactly one of `fileId` or `folderId` is set.
   - **Migration**: `migrations/20260824000004-create-file-shares.js` creating the `file_shares` table with unique composite indexes on `(fileId, sharedWithUserId)` and `(folderId, sharedWithUserId)`.

2. **Centralized Authorization Service (`permission.service.js`)**
   - Reusable `getEffectiveFileRole(userId, fileId)` and `getEffectiveFolderRole(userId, folderId)` methods determining the effective role (`'owner'`, `'editor'`, `'viewer'`, or `'none'`).
   - Handles parent folder hierarchy cascading and ensures explicit file-level shares take precedence over inherited folder-level shares.

3. **Share Management Endpoints**
   - `POST /api/files/:id/share` & `POST /api/folders/:id/share`: Owner shares item by target email, assigning `'viewer'` or `'editor'` role. Rejects non-existent emails and self-sharing.
   - `GET /api/files/:id/shares` & `GET /api/folders/:id/shares`: Owner-only list of collaborators and their assigned roles.
   - `PATCH /api/files/:id/shares/:shareId` & `PATCH /api/folders/:id/shares/:shareId`: Owner updates collaborator role between `'viewer'` and `'editor'`.
   - `DELETE /api/files/:id/shares/:shareId` & `DELETE /api/folders/:id/shares/:shareId`: Owner revokes collaborator access.
   - `GET /api/shared-with-me`: Lists all files and folders shared directly with the authenticated user.

4. **Extended Existing Endpoints with Permission Enforcement**
   - `GET /api/folders/:id/contents`: Allows owners and shared users (`userRole` $\neq$ `'none'`). Attaches `userRole` and `isShared` flags to items.
   - `GET /api/files/:id/download-url`: Allows `owner`, `editor`, or `viewer`.
   - `PATCH /api/files/:id` & `PATCH /api/folders/:id` (rename): Allows `owner` or `editor`.
   - `POST /api/files/upload-url` & `POST /api/uploads/init`: Allows `owner` or `editor` on target folder/file.
   - `GET /api/files/:id/versions`: Allows `owner`, `editor`, or `viewer`.
   - `POST /api/files/:id/versions/:versionId/restore`: Allows `owner` or `editor`.
   - `DELETE /api/files/:id`, `DELETE /api/folders/:id`, `POST /api/files/:id/restore`, `POST /api/folders/:id/restore`, `DELETE /api/trash/:type/:id`: **Owner ONLY**. Rejects shared editors/viewers with 403 Forbidden.

5. **Consumer Frontend & Role-Aware UX**
   - **Navigation Tab**: Added **Shared with me** section alongside **My Drive** and **Trash**.
   - **SharedWithMeView** ([SharedWithMeView.jsx](file:///c:/Users/shari/OneDrive/Desktop/CloudBox/frontend/src/components/SharedWithMeView.jsx)): Dedicated space displaying items shared directly with the user, showing uploader email and role badges (`Viewer` / `Editor`).
   - **ShareModal** ([ShareModal.jsx](file:///c:/Users/shari/OneDrive/Desktop/CloudBox/frontend/src/components/ShareModal.jsx)): Google Docs/Dropbox style modal to invite collaborators, assign roles, change roles, or revoke access.
   - **Role-Aware UI**: Viewers see view/download controls only (no upload, create folder, rename, delete, or share buttons). Editors see upload and rename controls (no delete or share buttons).
   - **Visual Indicators**: Shared items display a subtle `"Shared"` badge and avatar icon.

---

## 2. Authorization Capabilities Matrix

| Action / Capability | Owner | Shared Editor | Shared Viewer | Unshared User |
| :--- | :---: | :---: | :---: | :---: |
| **View Folder Contents** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ Denied (403) |
| **Download File** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ Denied (403) |
| **View Version History** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ Denied (403) |
| **Upload New File / Version** | ✅ Yes | ✅ Yes | ❌ Denied (403) | ❌ Denied (403) |
| **Rename File / Folder** | ✅ Yes | ✅ Yes | ❌ Denied (403) | ❌ Denied (403) |
| **Restore Previous Version** | ✅ Yes | ✅ Yes | ❌ Denied (403) | ❌ Denied (403) |
| **Move to Trash (Soft Delete)** | ✅ Yes | ❌ Denied (403) | ❌ Denied (403) | ❌ Denied (403) |
| **Restore Item from Trash** | ✅ Yes | ❌ Denied (403) | ❌ Denied (403) | ❌ Denied (403) |
| **Permanent Purge from Trash** | ✅ Yes | ❌ Denied (403) | ❌ Denied (403) | ❌ Denied (403) |
| **Invite / Manage Collaborators** | ✅ Yes | ❌ Denied (403) | ❌ Denied (403) | ❌ Denied (403) |

---

## 3. Resolution Algorithm: Folder Cascading & File-Level Overrides

```
User accesses File X inside Folder F
                   │
                   ▼
     Is User the Owner of File X? ──── YES ───► Return 'owner'
                   │
                  NO
                   ▼
Does an explicit FileShare exist for File X? ──── YES ───► Return FileShare.role ('editor'/'viewer')
                   │
                  NO
                   ▼
  Traverse Ancestor Folder Chain (Folder F, Parent F', Root)
  Does any Ancestor Folder have a FileShare for User? ──── YES ───► Return FolderShare.role ('editor'/'viewer')
                   │
                  NO
                   ▼
             Return 'none' (403 Forbidden)
```

---

## 4. FLAGGED OPEN QUESTION FOR PHASE 6: Sharing vs. Client-Side Zero-Knowledge Encryption

> [!IMPORTANT]
> **Open Rationale & Architectural Design Challenge for Phase 6:**
> In Phase 6, zero-knowledge client-side encryption will be introduced. Files encrypted client-side with an owner's passphrase/key cannot be read by another user without key exchange.
>
> **Key Questions to Resolve in Phase 6**:
> 1. Should file encryption keys (DEKs) be encrypted with the recipient's public key (Asymmetric Key Exchange / WebCrypto API `SubtleCrypto`) when shared?
> 2. Or will shared files require password-protected key wrapping / asymmetric RSA/ECDH key pairs generated per user upon signup?
> 3. How will folder-level sharing work when new files are added to a shared encrypted folder?
>
> *This question is explicitly documented here and deferred to Phase 6.*
