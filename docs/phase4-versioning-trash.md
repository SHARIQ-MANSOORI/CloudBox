# Phase 4: File Versioning & Soft Trash Documentation

## Overview
This document details the architecture, file versioning system, S3 version key convention, 20-version retention cap, 30-day soft trash system, folder deletion cascade, parent chain restoration handling, and `node-cron` background cleanup job implemented in Phase 4 of **CloudBox**.

---

## 1. Implemented Feature List

1. **Database Schema Enhancements**
   - **`FileVersion` Model**: `id` (UUID PK), `fileId` (FK → File), `s3Key` (string), `sizeInBytes` (bigint), `versionNumber` (integer), `createdBy` (FK → User), `createdAt`.
   - **`File` Model Attributes**: `currentVersionId` (FK → FileVersion), `deletedAt` (timestamp, nullable), `trashExpiresAt` (timestamp, nullable).
   - **`Folder` Model Attributes**: `deletedAt` (timestamp, nullable), `trashExpiresAt` (timestamp, nullable).
   - **Migration**: `migrations/20260824000003-add-versioning-and-trash.js` adding the `file_versions` table and soft delete columns with performance indexes on `fileId`, `deletedAt`, and `trashExpiresAt`.

2. **File Versioning System & S3 Key Isolation**
   - **S3 Key Convention**: `{userId}/{fileId}/versions/{versionNumber}/{originalFilename}`. Every completed file upload (both Phase 2 single-shot and Phase 3 resumable multipart) writes to a distinct versioned key in AWS S3 so older versions are never overwritten.
   - **`currentVersionId` Pointer**: After a successful upload, `File.currentVersionId` is repointed to the newest `FileVersion` record.
   - **Presigned Downloads**: `GET /api/files/:id/download-url` resolves the presigned download URL against `currentVersionId`'s `s3Key`.
   - **Inline 20-Version Retention Cap**: When a 21st version is uploaded for a file, the oldest version (lowest `versionNumber`) is automatically purged inline (deleting its S3 object and DB `FileVersion` row).

3. **Version Management Endpoints**
   - `GET /api/files/:id/versions`: Lists all versions of a file (version number, size, date, uploader, current version indicator), ordered newest first.
   - `POST /api/files/:id/versions/:versionId/restore`: Repoints `file.currentVersionId`, `file.s3Key`, and `file.sizeInBytes` to the selected version without destroying newer versions in history.

4. **30-Day Soft Trash System & Parent Chain Restoration**
   - **Soft Delete**: `DELETE /api/files/:id` and `DELETE /api/folders/:id` set `deletedAt = NOW()` and `trashExpiresAt = NOW() + 30 days`. S3 objects and `FileVersion` rows are untouched.
   - **Folder Cascade**: Soft-deleting a folder cascades recursively to set `deletedAt` and `trashExpiresAt` on all contained subfolders and files.
   - **Folder Contents Filtering**: `GET /api/folders/:id/contents` queries enforce `where: { deletedAt: null }` so soft-deleted items are excluded from normal drive listings.
   - **Trash Listing**: `GET /api/trash` retrieves soft-deleted folders and files, calculating `daysRemaining` until auto-purge.
   - **Parent Chain Restoration**: `POST /api/files/:id/restore` and `POST /api/folders/:id/restore` clear `deletedAt`/`trashExpiresAt`. If a restored item's parent folder was soft-deleted, its parent folder chain is automatically restored.
   - **Manual Permanent Purge**: `DELETE /api/trash/:type/:id` permanently deletes all S3 objects across all `FileVersion` records for a file (or recursively for a folder) and destroys the database rows.

5. **Scheduled Cleanup Job (`node-cron`)**
   - Daily cron job scheduled at midnight (`0 0 * * *`) in `src/config/cron.js`.
   - Queries `File` and `Folder` records where `trashExpiresAt <= NOW()`.
   - Reuses `purgeExpiredTrash()` service method to permanently purge expired items from S3 and PostgreSQL, logging a summary of purged items.

6. **Frontend UI & Consumer Experience**
   - **Top / Mobile Navigation**: Tab bar to switch between **My Drive** and **Trash**.
   - **Trash View**: Renders soft-deleted items with `"Deleted 3 days ago · 27 days left"` badges, **Restore** buttons (with toast notifications), and **Delete forever** confirmation prompts.
   - **Version History Modal**: Accessible from file dropdown menus (`Version History`), showing interactive version timeline and **Restore version** buttons.
   - **Soft Delete Modal**: Updated `DeleteConfirmModal` copy to *"Move to Trash? Items can be restored within 30 days"*.

---

## 2. Directory & File Structure Additions

```
CloudBox/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── cron.js                     # node-cron daily cleanup task
│   │   ├── controllers/
│   │   │   ├── version.controller.js       # File version endpoints controller
│   │   │   └── trash.controller.js         # Soft trash endpoints controller
│   │   ├── migrations/
│   │   │   └── 20260824000003-add-versioning-and-trash.js # Database migration
│   │   ├── models/
│   │   │   ├── fileVersion.model.js        # FileVersion Sequelize model
│   │   │   ├── file.model.js               # Updated with version & trash columns
│   │   │   └── folder.model.js             # Updated with trash columns
│   │   ├── routes/
│   │   │   ├── version.routes.js           # Version routes under /api/files
│   │   │   └── trash.routes.js             # Trash routes under /api/trash
│   │   └── services/
│   │       ├── version.service.js          # Version creation, cap & restore logic
│   │       └── trash.service.js            # Soft delete, parent restore & purge service
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── TrashView.jsx               # Soft trash listing & purge view
│   │   │   ├── VersionHistoryModal.jsx     # Version history timeline modal
│   │   │   └── DeleteConfirmModal.jsx      # Updated soft delete prompt modal
│   │   └── pages/
│   │       └── DashboardPage.jsx           # Updated with Drive/Trash tabs & versioning
└── docs/
    └── phase4-versioning-trash.md          # Standalone Phase 4 documentation
```

---

## 3. End-to-End Architectural Workflows

### A. Version Creation & 20-Version Retention Cap
```
Upload Completed (Single-shot or Multipart)
      │
      ▼
Generate S3 Key: {userId}/{fileId}/versions/{versionNumber}/{filename}
      │
      ▼
Create FileVersion DB Record (size, s3Key, versionNumber, createdBy)
      │
      ▼
Update File.currentVersionId = version.id
      │
      ▼
Total FileVersions > 20? ───── YES ────► Find oldest FileVersion (#1)
      │                                       │
      NO                                 Delete S3 Object (oldest.s3Key)
      │                                       │
      ▼                                  Destroy oldest FileVersion DB Row
  Complete
```

### B. Soft Delete, Parent Restoration & Permanent Purge
```
User clicks "Move to Trash"
      │
      ▼
Set deletedAt = NOW(), trashExpiresAt = NOW() + 30 days
(If folder: recursively soft-delete all nested files & subfolders)
      │
      ├────────────────────────┬────────────────────────┐
      ▼                        ▼                        ▼
Folder contents query      User clicks Restore      30 Days Expire / Purge
(where deletedAt: null)        │                        │
Excludes trash items       Traverse parent chain;    Run purgeExpiredTrash()
                           Restore deleted parents;  Delete S3 objects (all versions)
                           Clear deletedAt/expires   Destroy DB records
```

---

## 4. Production Deployment & Process Management Notes

1. **`node-cron` Execution Context**:
   - `node-cron` runs in-memory within the Node.js Express process.
   - For multi-instance load-balanced deployments (e.g. EC2 autoscaling group or AWS ECS container tasks), either:
     - Run `node-cron` on a dedicated worker instance / singleton container task, OR
     - Use a process manager like **PM2** (`pm2 start server.js`) with a single cron worker instance to avoid duplicate daily cleanup executions.
