# CloudBox — A Cloud Storage Platform Built for Data Reliability and Security

CloudBox is a secure, personal cloud file storage platform that enables seamless file management, sharing, and version control, built from the ground up with native zero-knowledge end-to-end encryption.




## Table of Contents
1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Architecture Overview](#architecture-overview)
4. [Why These Design Decisions](#why-these-design-decisions)
5. [Getting Started / Local Setup](#getting-started--local-setup)
6. [Environment Variables](#environment-variables)
7. [Deployment](#deployment)
8. [Future Improvements](#future-improvements)
9. [Author / Contact](#author--contact)

---

## Features

### Authentication
* **Custom Security Workflow**: Secure registration using OTP-based email verification at signup.
* **JWT Session Management**: Custom JSON Web Token (JWT) system with short-lived access tokens and refresh token rotation.
* **Secured Storage**: Passwords are securely hashed using `bcrypt` before storage.
* **Abuse Prevention**: Strict rate-limiting on sensitive auth and OTP routes to prevent brute-force attacks.

### File Management
* **Intuitive Hierarchical Navigation**: Full CRUD operations for folders and files with folder-level nested browsing.

### Resumable Uploads
* **Reliable Large-File Uploads**: Handles massive uploads via chunked S3 multipart uploads.
* **Client-side Progress Tracking**: Real-time status bar showing percentage and upload speed.
* **Network Interruption Support**: Automatically pauses and resumes uploads when connectivity drops without losing progress.

### Versioning
* **No Destructive Overwrites**: Every re-upload of a file creates a new historical version rather than replacing it.
* **Audit Trail & Rollback**: Browse complete version history and restore any file to a previous version with a single click.

### Trash & Recovery
* **Safety Net**: Deleted folders and files are moved to the Trash for a 30-day recovery window.
* **Cascading Soft Delete**: Deleting a folder automatically soft-deletes all nested items.
* **Automated Cleanup**: A backend background job runs periodically to permanently purge items older than 30 days.

### Sharing & Permissions
* **Granular Access Control**: Share files and folders with three access levels: Owner, Editor, or Viewer.
* **Permission Cascading**: Sharing a folder automatically applies those permissions to all nested subfolders and files.

### Security & Encryption
* **Zero-Knowledge Architecture**: True end-to-end encryption where keys are generated, stored, and verified client-side.
* **Dual-Key Cryptography**:
  * Upon signup, a unique RSA-256 keypair is generated directly in the user's browser.
  * Every uploaded file is encrypted locally using a unique symmetric AES-256-GCM data encryption key (DEK).
  * The DEK is wrapped using the user's public RSA key and sent to the server.
  * Files are fully encrypted in-browser before upload and decrypted in-browser after download.
* **Safety Net**: Users are provided a one-time account recovery key to regain access to their encrypted files if they forget their password.

---

## Tech Stack

| Category | Technology |
| :--- | :--- |
| **Frontend** | React (Vite), JavaScript (ES6+), React Router, Axios, Tailwind CSS |
| **Backend** | Node.js, Express.js, JavaScript |
| **Database** | PostgreSQL, Sequelize ORM |
| **Cache & Session** | Redis (OTP storage & refresh token tracking) |
| **Object Storage** | AWS S3 (Multipart upload API, per-user folder prefix conventions) |
| **Authentication** | `bcrypt` (password hashing), `jsonwebtoken` (JWT, access/refresh rotation) |
| **Email Delivery** | Nodemailer via Gmail SMTP (configured for zero-cost, domain-free delivery) |
| **Cryptography** | Web Crypto API (browser-native encryption; no third-party libraries) |
| **Background Jobs** | `node-cron` (scheduled trash cleanup) |
| **Infrastructure** | AWS EC2 (Ubuntu t3.micro), AWS RDS (PostgreSQL), AWS S3 (single bucket) |
| **Containerization** | Docker, Docker Compose (for API and Redis service packaging) |
| **Proxy & SSL** | Nginx host-level proxy, Let's Encrypt / Certbot SSL certificates |
| **DNS** | Free wildcard hostname through `nip.io` |
| **Hosting** | Vercel (Frontend), Self-hosted on AWS EC2 (Backend) |
| **Access Control** | AWS EC2 IAM Instance Profile (no static AWS keys saved in code or config) |

---

## Architecture Overview

```
                      +-------------------+
                      |   React Frontend  |
                      |     (Vite)        |
                      +---------+---------+
                                |
                         HTTPS  |  (nip.io / Vercel)
                                v
                      +---------+---------+
                      |    Nginx Proxy    |
                      +---------+---------+
                                |
                                v
                      +---------+---------+
                      |    Express API    |
                      |  (EC2 t3.micro)   |
                      +----+----+----+----+
                           |    |    |
       +-------------------+    |    +-------------------+
       | PostgreSQL             |             Redis      |
       v                        v                        v
+------+------+           +-----+-----+           +------+------+
|  AWS RDS    |           |  AWS S3   |           | OTP Cache & |
| (Metadata)  |           | (Objects) |           | JWT Store   |
+-------------+           +-----------+           +-------------+
```

### Key Architectural Concepts
1. **Request Flow**: All client requests resolve through the Nginx reverse proxy. Nginx terminates SSL and forwards requests locally to the Express Node.js application. Express coordinates business logic across PostgreSQL (for application state metadata), Redis (for session caching), and AWS S3 (for file storage).
2. **S3 Folder Prefix Convention**: The application utilizes a single AWS S3 bucket to store all files. Isolation is achieved logically using a per-user UUID prefix convention (e.g. `s3://bucket-name/<user-uuid>/<file-uuid>`).
3. **Envelope Encryption Scheme**:
   * During signup, the browser generates an RSA key pair. The private key is encrypted with a master key derived from the user's password using PBKDF2 and sent to the server.
   * When a file is uploaded, the browser generates a random AES-256-GCM symmetric key. The file is encrypted with this AES key.
   * The AES key is then encrypted (wrapped) with the user's public RSA key. The wrapped key is stored in the database alongside the encrypted file on S3.
   * When sharing, the owner's client decrypts the AES key using their private key, re-encrypts (re-wraps) it using the recipient's public key, and saves it to the database for the recipient.

---

## Why These Design Decisions?

### PostgreSQL over MongoDB
CloudBox manages a deeply relational and hierarchical data structure (Users, Folders, Files, File Versions, and granular Roles/Permissions). Storing these relationships in a relational database with strict foreign keys guarantees transactional integrity, prevents orphan files during deletion cascades, and enables efficient SQL joins compared to an unstructured Document store.

### Single S3 Bucket with Key Prefixes
Creating a separate AWS S3 bucket for every single user introduces huge cloud provisioning overhead and hits default AWS bucket limits. Using a single bucket with structured prefix directories (`/<user-uuid>/<file-uuid>`) provides infinite scalability at zero overhead while maintaining absolute data segregation via database metadata rules.

### Native Client-Side Web Crypto API
Instead of relying on heavy third-party encryption libraries, the app uses the browser's built-in, hardware-accelerated **Web Crypto API**. This ensures zero-knowledge privacy: files are encrypted on the client device before they are transmitted over the web. The server never receives raw, unencrypted files or user passwords in plain text.

### Gmail SMTP instead of AWS SES
To run the project with zero maintenance cost, we chose Gmail SMTP over AWS SES. SES requires verifying custom domains and requesting sandbox removal, which incurs DNS purchase costs and operational limits. Using a secure Google App Password provides free, sandbox-free delivery instantly.

---

## Getting Started / Local Setup

### Prerequisites
* Node.js (v18 or higher)
* Docker and Docker Compose (to run Postgres and Redis easily)
* An S3 Bucket (or a local S3 simulator like LocalStack)

### Step 1: Clone the Repository
```bash
git clone https://github.com/yourusername/CloudBox.git
cd CloudBox
```

### Step 2: Set Up Environment Variables
Create `.env` files in both the `backend` and `frontend` directories using the tables provided in the [Environment Variables](#environment-variables) section.

For example, create `backend/.env`:
```bash
cp backend/.env.example backend/.env
```

### Step 3: Run Database & Cache via Docker Compose
Use the provided `docker-compose.yml` to spin up local PostgreSQL and Redis instances:
```bash
docker compose up -d
```

### Step 4: Install Dependencies & Run Backend
Navigate to the backend directory, install packages, and start the development server:
```bash
cd backend
npm install
npm run dev
```

### Step 5: Install Dependencies & Run Frontend
In a new terminal window, navigate to the frontend directory, install packages, and start Vite:
```bash
cd ../frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser to view the application.

---

## Environment Variables

### Backend Environment Variables (`backend/.env`)

| Variable Name | Description | Example Format |
| :--- | :--- | :--- |
| `PORT` | Port number the backend server runs on | `5000` |
| `NODE_ENV` | Mode of execution (`development` or `production`) | `development` |
| `CLIENT_URL` | URL of the React frontend | `http://localhost:5173` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:5173,https://your-domain.app` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `DB_SYNC` | Automatically sync database tables on startup | `true` |
| `DB_SSL` | Enable SSL for production database connection | `true` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `JWT_ACCESS_SECRET` | Secret key used to sign access tokens | `<random-32-char-string>` |
| `JWT_REFRESH_SECRET` | Secret key used to sign refresh tokens | `<random-32-char-string>` |
| `OTP_EXPIRY_MINUTES` | Lifetime of sign-up verification codes | `10` |
| `TRASH_RETENTION_DAYS` | Number of days files remain in the trash | `30` |
| `SMTP_HOST` | SMTP server host address | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | Email address used for sending OTPs | `example@gmail.com` |
| `SMTP_PASS` | App password for email client authentication | `yourgmailkey` |
| `SMTP_FROM` | Mail sender string header value | `"CloudBox" <example@gmail.com>` |
| `AWS_REGION` | AWS region where services are provisioned | `ap-south-1` |
| `S3_BUCKET_NAME` | S3 bucket name used for storing user files | `cloudbox-storage-s3` |

### Frontend Environment Variables (`frontend/.env`)

| Variable Name | Description | Example Format |
| :--- | :--- | :--- |
| `VITE_API_URL` | Endpoint URL of the Express Backend | `http://localhost:5000/api` |

---

## Deployment

The production deployment of CloudBox uses a secure, cost-effective setup on AWS and Vercel.

* **Frontend**: Deployed on **Vercel** for instant edge rendering, global CDN delivery, and automatic SSL setup.
* **Backend API**: Hosted on an **AWS EC2 (Ubuntu t3.micro)** instance. Process management is handled via `pm2` with automatic service restarts.
* **Reverse Proxy**: **Nginx** runs on the EC2 host. It intercepts incoming traffic, terminates SSL using Let's Encrypt certificates managed by **Certbot**, and forwards requests internally to the Express server.
* **Database**: Hosted on **AWS RDS (PostgreSQL)** inside a secure security group.
* **Storage**: **AWS S3** is integrated. The EC2 instance assumes an **IAM role** with full S3 read/write permissions for the target bucket, eliminating the need to save static access keys inside configuration files.
* **SSL & Hostname**: Utilizes a free wildcard DNS hostname via `nip.io` mapped to the EC2 elastic IP.


---

## Future Improvements

* **Automated CI/CD**: Implement GitHub Actions pipelines to run linting, Jest tests, and automatically build/deploy the client and API on new merges.
* **Storage Quota System**: Add a frontend user interface and backend limits enforcing storage caps (e.g. 5GB free tier).
* **Full-text File Search**: Integrate indexing services (like Elasticsearch or PostgreSQL full-text search) for metadata keywords.
* **Edge CDN Caching**: Cache public or shared encrypted files on AWS CloudFront edge servers to reduce S3 fetch latency.


---

## Author / Contact

Created by [Shariq Mansoori](https://github.com/SHARIQ-MANSOORI).


