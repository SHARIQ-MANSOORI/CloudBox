# Phase 7 — Production Deployment Documentation

This document describes the complete containerized deployment strategy for **CloudBox**, an enterprise-grade cloud storage platform.

---

## 1. Container & Infrastructure Architecture

```
                                    +---------------------------------------+
                                    |        Vercel Frontend Hosting        |
                                    |   (React + Vite Single Page App)     |
                                    +-------------------|-------------------+
                                                        |
                                       HTTPS API Calls  | (VITE_API_BASE_URL)
                                                        v
+---------------------------------------------------------------------------------------------------+
| AWS EC2 Instance (Ubuntu) — Elastic IP                                                            |
| Attached IAM Role: cloudbox-ec2-role-new (Grants S3 access without static keys)                   |
| Security Group: Ports 22 (SSH), 80 (HTTP), 443 (HTTPS) open                                       |
|                                                                                                   |
|   +-------------------------------------------------------------------------------------------+   |
|   | Docker Compose Network (cloudbox_net)                                                     |   |
|   |                                                                                           |   |
|   |   +--------------------------+        +-----------------------------------------------+   |   |
|   |   | Nginx Container          |        | Express API Container (api)                   |   |   |
|   |   | Port 80 / 443            |------->| Port 5000 (Node.js 20 LTS Alpine)             |   |   |
|   |   | Reverse Proxy + SSL      |        | Runs node-cron trash cleanup in-process       |   |   |
|   |   +--------------------------+        +-------|-------------------------------+-------+   |   |
|   |                                               |                               |           |   |
|   +-----------------------------------------------|-------------------------------|-----------+   |
|                                                   |                               |               |
|                                                   v                               v               |
|                                         +------------------+             +--------------------+   |
|                                         | Redis Container  |             | AWS Instance       |   |
|                                         | Port 6379        |             | Metadata Service   |   |
|                                         | redis:7-alpine   |             | (IMDS IAM Role)    |   |
|                                         | Persistent Vol   |             +---------|----------+   |
|                                         +------------------+                       |              |
+------------------------------------------------------------------------------------|--------------+
                                                    |                                |
                                                    v                                v
                                       +-------------------------+      +-------------------------+
                                       | AWS RDS PostgreSQL      |      | AWS S3 Bucket           |
                                       | Managed Database        |      | Presigned Uploads &     |
                                       | (Port 5432)             |      | Encrypted File Bytes    |
                                       +-------------------------+      +-------------------------+
```

### Component Breakdown
| Component | Hosting Environment | Details |
|---|---|---|
| **Frontend** | Vercel | Hosted as a static SPA. Built using `npm run build`, configured via `vercel.json` for client-side routing. |
| **Backend API** | Docker on EC2 (`api`) | Node.js 20 LTS Alpine container running Express. Includes `node-cron` in-process task scheduler for daily trash purging. |
| **Redis Store** | Docker on EC2 (`redis`) | `redis:7-alpine` container for OTP storage and refresh token tracking. Backed by persistent named volume (`redis_data`). |
| **Reverse Proxy** | Docker / EC2 (`nginx`) | Nginx container routing traffic on ports 80/443 to the backend container, terminating SSL, and setting proxy headers. |
| **Database** | AWS RDS PostgreSQL | External managed AWS service. The API container connects directly over the internal AWS network via `DATABASE_URL`. |
| **Object Storage** | AWS S3 | External managed AWS service. Presigned PUT/GET URLs generated server-side. Authentication is handled automatically via EC2 attached IAM Role (`cloudbox-ec2-role-new`). |

---

## 2. Step-by-Step Deployment Guide (EC2 Setup)

### Step 2.1: Prerequisites on EC2
Log into your EC2 instance via SSH:
```bash
ssh -i /path/to/your-key.pem ubuntu@<YOUR_EC2_ELASTIC_IP>
```

Verify Docker and Docker Compose are installed:
```bash
docker --version
docker compose version
```
*(If Docker is missing, install via `sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2` and add the `ubuntu` user to the `docker` group via `sudo usermod -aG docker ubuntu`).*

### Step 2.2: Clone Repository & Setup Environment
1. Clone the project repository onto the EC2 host:
   ```bash
   git clone https://github.com/your-org/CloudBox.git /home/ubuntu/CloudBox
   cd /home/ubuntu/CloudBox
   ```

2. Create the production `.env` file for the backend:
   ```bash
   cp backend/.env.production.example backend/.env
   nano backend/.env
   ```

3. Populate `backend/.env` with your real secrets:
   - `DATABASE_URL`: Set to your RDS PostgreSQL endpoint (`postgresql://user:password@cloudbox-rds.xxxx.us-east-1.rds.amazonaws.com:5432/cloudbox_db`).
   - `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET`: Generate random 64-character hex strings.
   - `CLIENT_URL`: Set to your production Vercel frontend URL (e.g. `https://cloudbox-app.vercel.app`).
   - `SMTP_*`: Configure your production email provider credentials (e.g. SendGrid / AWS SES).
   - Leave `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` empty/commented out so AWS SDK uses the attached EC2 IAM Role (`cloudbox-ec2-role-new`).

### Step 2.3: Launch Stack with Docker Compose
Start the services in detached daemon mode:
```bash
docker compose up -d --build
```

Verify running containers:
```bash
docker compose ps
```

Verify container logs:
```bash
docker compose logs -f api
```

Verify the health check endpoint:
```bash
curl http://localhost:5000/api/health
# Response: {"status":"ok","service":"CloudBox API","timestamp":"..."}
```

---

## 3. Nginx & Let's Encrypt HTTPS Setup (Certbot)

To secure your deployment with free TLS/SSL certificates via Certbot:

### Step 3.1: Configure Domain DNS
Point your custom domain (or subdomain, e.g. `api.yourdomain.com`) A-record to your EC2 Elastic IP address in your DNS manager (Cloudflare, Route53, GoDaddy, etc.).

### Step 3.2: Obtain SSL Certificate via Certbot
Run Certbot using the standalone webroot mode against the running Nginx container:
```bash
sudo apt-get update
sudo apt-get install -y certbot

sudo certbot certonly --webroot \
  -w /var/lib/docker/volumes/cloudbox_certbot_var/_data \
  -d api.yourdomain.com \
  --email admin@yourdomain.com \
  --agree-tos \
  --no-eff-email
```

Alternatively, if running standalone Certbot directly on host:
```bash
sudo systemctl stop nginx || docker compose stop nginx
sudo certbot certonly --standalone -d api.yourdomain.com
sudo docker compose start nginx
```

### Step 3.3: Update Nginx Configuration
Open `nginx/conf.d/cloudbox.conf` and update `yourdomain.com` with your actual domain name:
```nginx
ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
```

Reload Nginx:
```bash
docker compose exec nginx nginx -s reload
```

### Step 3.4: Auto-Renewal Verification
Certbot automatically installs a systemd timer on Ubuntu. Test dry-run renewal:
```bash
sudo certbot renew --dry-run
```

---

## 4. Production Environment Variables Reference

| Environment Variable | Category | Required | Description / Example |
|---|---|---|---|
| `NODE_ENV` | App | Yes | Must be set to `production`. |
| `PORT` | App | Yes | HTTP listening port inside container (default: `5000`). |
| `CLIENT_URL` | Security | Yes | Production Vercel domain(s) for CORS & Cookies (`https://cloudbox.vercel.app`). |
| `DATABASE_URL` | Database | Yes | RDS PostgreSQL connection string. |
| `DB_SSL` | Database | Optional | Set to `true` if RDS enforces SSL connections. |
| `REDIS_URL` | Cache | Yes | Connection string to Redis container (`redis://redis:6379`). |
| `JWT_ACCESS_SECRET` | Auth | Yes | Secret key for signing 15-minute JWT access tokens. |
| `JWT_REFRESH_SECRET` | Auth | Yes | Secret key for signing 7-day JWT refresh tokens. |
| `OTP_EXPIRY_MINUTES` | Auth | Yes | OTP code expiration time (default: `15`). |
| `TRASH_RETENTION_DAYS` | Storage | Yes | Auto-purge retention period for soft-deleted items (default: `30`). |
| `SMTP_HOST` | Email | Yes | SMTP server address for OTP emails (e.g. `smtp.sendgrid.net`). |
| `SMTP_PORT` | Email | Yes | SMTP port (e.g. `587`). |
| `SMTP_USER` | Email | Yes | SMTP authentication username. |
| `SMTP_PASS` | Email | Yes | SMTP authentication password / API key. |
| `SMTP_FROM` | Email | Yes | From email header (`"CloudBox Security" <no-reply@domain.com>`). |
| `AWS_REGION` | Storage | Yes | AWS region hosting S3 bucket (e.g. `us-east-1`). |
| `S3_BUCKET_NAME` | Storage | Yes | S3 bucket name (e.g. `cloudbox-user-files`). |
| `AWS_ACCESS_KEY_ID` | Storage | **No** | Omitted on EC2 — uses attached IAM role (`cloudbox-ec2-role-new`). |
| `AWS_SECRET_ACCESS_KEY` | Storage | **No** | Omitted on EC2 — uses attached IAM role (`cloudbox-ec2-role-new`). |

---

## 5. Frontend Vercel Deployment Guide

1. Push your repository to GitHub.
2. Log into [Vercel](https://vercel.com) and click **Add New Project**.
3. Import the `CloudBox` repository and choose the `frontend` folder as the Root Directory.
4. Framework Preset will automatically detect **Vite**.
5. Add the Environment Variable in Vercel settings:
   - `VITE_API_BASE_URL` = `https://api.yourdomain.com/api`
6. Click **Deploy**. Vercel will run `npm run build` and output the production build cleanly according to `vercel.json`.

---

## 6. Known Architecture Limitations

1. **Single EC2 Node Deployment**: This deployment runs on a single EC2 instance using Docker Compose. It does not auto-scale across multiple instances. (Suitable and cost-effective for portfolio & single-node deployments).
2. **In-Process Cron Job**: The `node-cron` daily trash cleanup runs inside the Node.js process itself. If the API container restarts, `node-cron` re-initializes automatically.
3. **Manual Code Updates**: Deploying updates requires ssh-ing to EC2 and running `git pull && docker compose up -d --build`.

---

## 7. Manual Actions Required on EC2

When ready to launch on your AWS EC2 host, execute the following steps manually:
- [ ] Connect to EC2 via SSH.
- [ ] Clone the repository into `/home/ubuntu/CloudBox`.
- [ ] Copy `backend/.env.production.example` to `backend/.env` and insert production credentials.
- [ ] Run `docker compose up -d --build`.
- [ ] Verify `curl http://localhost:5000/api/health` returns `{"status":"ok",...}`.
- [ ] Point domain A-record to the EC2 Elastic IP.
- [ ] Run Certbot to generate SSL certificates and update `nginx/conf.d/cloudbox.conf`.
- [ ] Deploy frontend to Vercel with `VITE_API_BASE_URL` pointing to your backend URL.
