# Phase 2: Core File & Folder CRUD Documentation

## Overview
This document provides a comprehensive overview of the architecture, data models, S3 presigned URL integration, API endpoints, upload lifecycle, and design decisions implemented in Phase 2 of **CloudBox**.

---

## 1. Implemented Feature List

1. **Database Schema & Models**
   - **`Folder` Model**: `id` (UUID PK), `name` (string), `ownerId` (FK → User), `parentFolderId` (FK → Folder, nullable for root), `createdAt`, `updatedAt`.
   - **`File` Model**: `id` (UUID PK), `name` (string), `ownerId` (FK → User), `folderId` (FK → Folder, nullable for root), `s3Key` (string), `sizeInBytes` (bigint), `mimeType` (string), `createdAt`, `updatedAt`.
   - **Sequelize Migration**: Created in `migrations/20260824000001-create-folders-and-files.js` with foreign key constraints and performance indexes on `ownerId`, `parentFolderId`, and `folderId`.

2. **Direct AWS S3 Integration**
   - Implemented via `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`.
   - Presigned PUT URL generation for direct browser-to-S3 file uploads.
   - Presigned GET URL generation for secure file downloads.
   - S3 object deletion using `DeleteObjectCommand`.
   - Developer fallback mock endpoints for local dev environments where AWS credentials have not been populated.

3. **Folder Management Endpoints**
   - `POST /api/folders`: Creates a new folder inside root or a parent folder (with parent ownership verification).
   - `GET /api/folders/:id/contents`: Lists child folders and files inside folder `:id` (or root if `:id` is `"root"`) along with breadcrumb trail array.
   - `PATCH /api/folders/:id`: Renames folder.
   - `DELETE /api/folders/:id`: Hard deletes folder. Rejects deletion with status `400` if the folder contains child files or subfolders.

4. **File Management Endpoints**
   - `POST /api/files/upload-url`: Generates a unique `fileId`, creates database record, and issues a presigned PUT URL.
   - `POST /api/files/:id/confirm`: Confirms file record after direct S3 upload completion.
   - `GET /api/files/:id/download-url`: Verifies file ownership and returns a presigned GET download URL with `ResponseContentDisposition`.
   - `PATCH /api/files/:id`: Renames file record.
   - `DELETE /api/files/:id`: Hard deletes file (removes object from S3 and deletes DB record).

5. **Request Body Validation**
   - Zod validation schemas for folder and file requests (`folder.validator.js` and `file.validator.js`) wrapped with Phase 1's validation middleware.

6. **Consumer-Friendly Dropbox/Drive Dashboard UI**
   - Extended [DashboardPage.jsx](file:///c:/Users/shari/OneDrive/Desktop/CloudBox/frontend/src/pages/DashboardPage.jsx) with interactive breadcrumb navigation, folder/file grid & list views, mime-type icon resolution, and human-readable file sizes.
   - Action modals for Folder Creation, Unified Renaming, Hard Deletion Confirmation, and Direct S3 Upload Progress tracking.

---

## 2. Directory & File Structure Additions

```
CloudBox/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── s3.js                        # AWS S3 client configuration
│   │   ├── models/
│   │   │   ├── folder.model.js              # Folder model definition
│   │   │   └── file.model.js                # File model definition
│   │   ├── migrations/
│   │   │   └── 20260824000001-create-folders-and-files.js # Folder & File migration
│   │   ├── validators/
│   │   │   ├── folder.validator.js          # Zod folder schemas
│   │   │   └── file.validator.js            # Zod file schemas
│   │   ├── services/
│   │   │   ├── s3.service.js                # Presigned PUT/GET & S3 delete logic
│   │   │   ├── folder.service.js            # Folder business logic & breadcrumbs
│   │   │   └── file.service.js              # File business logic & CRUD
│   │   ├── controllers/
│   │   │   ├── folder.controller.js          # Folder HTTP handlers
│   │   │   └── file.controller.js            # File HTTP handlers & mock S3 fallbacks
│   │   └── routes/
│   │       ├── folder.routes.js             # Folder API routes
│   │       └── file.routes.js               # File API routes
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Modal.jsx                    # Accessible modal dialog
│   │   │   ├── CreateFolderModal.jsx        # Create folder modal
│   │   │   ├── RenameModal.jsx              # Rename file/folder modal
│   │   │   ├── DeleteConfirmModal.jsx       # Delete confirmation modal
│   │   │   └── UploadModal.jsx              # Direct S3 upload & progress modal
│   │   ├── utils/
│   │   │   ├── formatters.js                # Human-readable file size & date helpers
│   │   │   └── fileIcons.jsx                # Mime-type visual icon mapping
│   │   └── pages/
│   │       └── DashboardPage.jsx            # Extended File & Folder storage browser
└── docs/
    └── phase2-file-folder-crud.md           # Standalone Phase 2 documentation
```

---

## 3. Environment Variables Reference

| Variable Name | Description | Example Value |
| :--- | :--- | :--- |
| `AWS_REGION` | AWS region where the S3 bucket is hosted | `us-east-1` |
| `S3_BUCKET_NAME` | Name of the AWS S3 storage bucket | `cloudbox-user-files` |
| `AWS_ACCESS_KEY_ID` | IAM access key ID with S3 read/write permissions | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | IAM secret access key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |

---

## 4. S3 Key Prefix Convention

> [!IMPORTANT]
> **Key Structure**: `{userId}/{fileId}/{originalFilename}`
> 
> All files stored in AWS S3 strictly enforce this prefix structure.
> - **Isolation**: Prevents key collisions between users.
> - **Versioning Foundation**: Later phases (file versioning) will depend on this exact prefix structure to isolate versions under the `{userId}/{fileId}/` prefix.

---

## 5. Direct Browser-to-S3 Upload Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Browser (React App)
    participant Express API (Backend)
    participant AWS S3 Bucket

    User->>Browser: Selects file to upload
    Browser->>Express API: POST /api/files/upload-url { name, mimeType, sizeInBytes, folderId }
    Express API->>Express API: Generate fileId (UUID) & S3 Key: `{userId}/{fileId}/{filename}`
    Express API->>Express API: Generate Presigned PUT URL via `@aws-sdk/s3-request-presigner`
    Express API-->>Browser: Returns { file, uploadUrl, s3Key }

    Note over Browser, AWS S3 Bucket: Direct Browser-to-S3 Upload (No Express Proxy)
    Browser->>AWS S3 Bucket: PUT uploadUrl (File Bytes, Header: Content-Type)
    AWS S3 Bucket-->>Browser: 200 OK

    Browser->>Express API: POST /api/files/:id/confirm { sizeInBytes }
    Express API-->>Browser: Returns updated File record
    Browser->>Browser: Refreshes folder view
```

---

## 6. Design Rationale & Known Limitations

1. **Why Direct Presigned URLs instead of Express Upload Proxying?**
   - Proxying file streams through Express consumes server RAM, CPU, and network bandwidth. Direct browser-to-S3 upload allows CloudBox to scale to millions of concurrent file transfers without choking backend servers.

2. **Why Non-Empty Folder Deletion Rejection?**
   - To prevent accidental bulk data loss, `DELETE /api/folders/:id` checks for child files or subfolders and returns a `400 Bad Request` if any exist.

3. **Known Limitation (Hard Delete Only in Phase 2)**:
   - File and folder deletion in Phase 2 immediately purges the DB record and S3 object. Soft deletion, trash recovery, and retention policies will be implemented in Phase 4.
