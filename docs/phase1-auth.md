# Phase 1: Foundation & Authentication Documentation

## Overview
This document provides a comprehensive guide to the architecture, features, database schema, authentication lifecycle, environment setup, and design decisions implemented in Phase 1 of **CloudBox**.

---

## 1. Implemented Feature List

1. **Project Scaffolding & Architecture**
   - **Backend**: Pure JavaScript Node.js + Express application organized into modular `/config`, `/models`, `/migrations`, `/validators`, `/middleware`, `/services`, `/controllers`, and `/routes` directories.
   - **Frontend**: Single Page Application using Vite + React (JSX), Tailwind CSS, Lucide icons, and Axios.
   - **Environment Safety**: Documented `.env.example` with zero hardcoded credentials and comprehensive `.gitignore`.

2. **Database & Schema Management**
   - PostgreSQL connection managed via **Sequelize ORM**.
   - Reviewable migration history in `migrations/20260824000000-create-users.js`.
   - `User` model attributes: `id` (UUIDv4), `email` (unique string), `passwordHash` (bcrypt string), `isVerified` (boolean, default false), `createdAt`, `updatedAt`.

3. **OTP-Based Signup & Email Verification Flow**
   - `POST /api/auth/signup`: Accepts email & password, validates input via Zod, hashes password with bcrypt (10 salt rounds), creates unverified user record, generates a 6-digit OTP, stores OTP in Redis with a 15-minute TTL (`OTP_EXPIRY_MINUTES`), and sends OTP via Nodemailer with console logging fallback for dev testing.
   - `POST /api/auth/verify-otp`: Accepts email & 6-digit OTP, checks against Redis store, sets `isVerified = true`, deletes OTP from Redis upon consumption, and rejects invalid/expired codes.
   - **Rate Limiting**: `express-rate-limit` restricting `/api/auth/signup` and `/api/auth/verify-otp` to a maximum of 5 requests per 15 minutes per IP address.

4. **JWT Session Handling & Refresh Token Rotation**
   - `POST /api/auth/login`: Validates credentials, rejects unverified accounts (403), issues a 15-minute JWT Access Token in the response JSON body, and sets a 7-day JWT Refresh Token in a secure `httpOnly` cookie.
   - `POST /api/auth/refresh`: Validates refresh token cookie, checks active session in Redis (`refresh:<userId>:<tokenId>`), revokes old token, issues a new access token AND rotated refresh token cookie.
   - `POST /api/auth/logout`: Revokes active refresh token from Redis and clears the `refreshToken` cookie.

5. **Security Baseline & Middleware**
   - `helmet` HTTP header protection.
   - `cors` configured strictly to `CLIENT_URL` with `credentials: true`.
   - Zod request body validation middleware.
   - `authenticateToken` JWT access token verification middleware.
   - Centralized error-handling middleware eliminating raw stack trace leaks in responses.
   - Protected test route `GET /api/auth/me`.

6. **Consumer-Friendly Onboarding Frontend UI**
   - Dropbox/Notion-inspired visual palette (slate neutrals, soft ambient blues, rounded cards, micro-animations).
   - Form loading states, inline validation messages, password visibility toggles, and clear status banners.
   - Axios instance with automatic `401 Unauthorized` token refresh interceptor.
   - `AuthContext` for memory token state & session persistence across page refreshes.

---

## 2. Directory & File Structure

```
CloudBox/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js          # Sequelize connection & config
│   │   │   ├── redis.js             # Redis client with in-memory fallback
│   │   │   └── mailer.js            # Nodemailer transport setup
│   │   ├── models/
│   │   │   ├── index.js             # Sequelize models export
│   │   │   └── user.model.js        # User model definition
│   │   ├── migrations/
│   │   │   └── 20260824000000-create-users.js # Initial migration file
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js   # JWT access token verifier
│   │   │   ├── rateLimit.middleware.js # Express rate limiters (5 req / 15m)
│   │   │   ├── validate.middleware.js  # Zod schema validator
│   │   │   └── error.middleware.js     # Centralized error handler
│   │   ├── services/
│   │   │   ├── auth.service.js      # Core business logic (JWT, Redis, OTP)
│   │   │   └── mail.service.js      # Email sending & template formatting
│   │   ├── controllers/
│   │   │   └── auth.controller.js   # HTTP controller functions for /api/auth
│   │   ├── routes/
│   │   │   └── auth.routes.js       # Express routes for authentication
│   │   ├── validators/
│   │   │   └── auth.validator.js    # Zod schemas for signup/login/otp
│   │   └── app.js                   # Express app initialization & middleware
│   ├── server.js                    # Backend HTTP server entrypoint
│   ├── package.json                 # Backend dependencies & scripts
│   ├── .env.example                 # Documented environment variable template
│   └── .env                         # Local environment configuration
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx           # Centered branded layout wrapper
│   │   │   ├── Button.jsx           # Button with spinner & variant styles
│   │   │   ├── Input.jsx            # Input field with label, error & toggle
│   │   │   └── Alert.jsx            # Consumer-friendly alert banner
│   │   ├── pages/
│   │   │   ├── SignupPage.jsx       # Signup form page
│   │   │   ├── VerifyOtpPage.jsx    # 6-digit OTP verification screen
│   │   │   ├── LoginPage.jsx        # Login page
│   │   │   └── DashboardPage.jsx    # Protected welcome dashboard
│   │   ├── services/
│   │   │   └── api.js               # Axios instance with 401 refresh interceptor
│   │   ├── store/
│   │   │   └── AuthContext.jsx      # React Context for auth state & memory token
│   │   ├── App.jsx                  # React Router routes & auth guards
│   │   ├── main.jsx                 # Frontend entrypoint
│   │   └── index.css                # Tailwind CSS imports & animations
│   ├── index.html                   # HTML template with Inter font
│   ├── package.json                 # Frontend dependencies & scripts
│   ├── vite.config.js               # Vite setup & API proxy configuration
│   ├── tailwind.config.js           # Tailwind theme extension
│   └── postcss.config.js            # PostCSS configuration
├── docs/
│   └── phase1-auth.md               # Standalone Phase 1 documentation
├── .gitignore                       # Repository gitignore rule file
└── package.json                     # Root workspace configuration
```

---

## 3. Environment Variables Reference

| Variable Name | Description | Default / Example Value |
| :--- | :--- | :--- |
| `PORT` | Listening port for the backend Express server | `5000` |
| `CLIENT_URL` | Allowed origin URL for CORS and cookie delivery | `http://localhost:5173` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/cloudbox_db` |
| `REDIS_URL` | Redis connection URL for OTP and session tracking | `redis://localhost:6379` |
| `JWT_ACCESS_SECRET` | Secret key used for signing short-lived access tokens (15m) | `your_super_secret_access_key` |
| `JWT_REFRESH_SECRET` | Secret key used for signing long-lived refresh tokens (7d) | `your_super_secret_refresh_key` |
| `OTP_EXPIRY_MINUTES` | Expiration time for generated OTP security codes (minutes) | `15` |
| `SMTP_HOST` | Hostname of SMTP mail server | `smtp.mailtrap.io` |
| `SMTP_PORT` | Port number of SMTP mail server | `2525` |
| `SMTP_USER` | Username for SMTP authentication | `your_smtp_username` |
| `SMTP_PASS` | Password for SMTP authentication | `your_smtp_password` |
| `SMTP_FROM` | Display sender address for outgoing emails | `"CloudBox" <no-reply@cloudbox.app>` |

---

## 4. Authentication Lifecycle (Step-by-Step)

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant React App (Client)
    participant Express API (Backend)
    participant Redis Cache
    participant PostgreSQL DB

    Note over User, PostgreSQL DB: 1. Signup & OTP Generation
    User->>React App: Submits Email & Password
    React App->>Express API: POST /api/auth/signup
    Express API->>PostgreSQL DB: Create Unverified User (isVerified = false)
    Express API->>Redis Cache: Store OTP key `otp:email` (TTL = 15 mins)
    Express API-->>User: Sends OTP email (Nodemailer / Console)
    Express API-->>React App: 201 Created

    Note over User, PostgreSQL DB: 2. OTP Verification
    React App->>Express API: POST /api/auth/verify-otp { email, otp }
    Express API->>Redis Cache: Get `otp:email`
    Express API->>PostgreSQL DB: Update User (isVerified = true)
    Express API->>Redis Cache: Delete `otp:email`
    Express API-->>React App: 200 OK

    Note over User, PostgreSQL DB: 3. Login & Session Establishment
    User->>React App: Submits Credentials
    React App->>Express API: POST /api/auth/login { email, password }
    Express API->>PostgreSQL DB: Validate Email & Password Hash
    Express API->>Redis Cache: Save `refresh:userId:tokenId` (7 days)
    Express API-->>React App: 200 OK + JSON AccessToken (15m) + httpOnly Cookie RefreshToken (7d)
    React App->>React App: Store AccessToken in React AuthContext Memory State

    Note over User, PostgreSQL DB: 4. Automatic Token Refresh Interception
    React App->>Express API: GET /api/auth/me (Authorization: Bearer ExpiredToken)
    Express API-->>React App: 401 Token Expired
    React App->>Express API: POST /api/auth/refresh (Cookie: refreshToken)
    Express API->>Redis Cache: Check & Delete `refresh:userId:oldTokenId`
    Express API->>Redis Cache: Save `refresh:userId:newTokenId`
    Express API-->>React App: 200 OK + New AccessToken + Rotated Refresh Cookie
    React App->>Express API: Retries original request with new AccessToken

    Note over User, PostgreSQL DB: 5. Logout
    React App->>Express API: POST /api/auth/logout
    Express API->>Redis Cache: Delete `refresh:userId:tokenId`
    Express API-->>React App: Clear Cookie & Reset Memory State
```

---

## 5. Architectural & Design Rationale

1. **Why In-Memory Access Tokens + HTTP-Only Cookies?**
   - Storing access tokens in `localStorage` or `sessionStorage` leaves applications vulnerable to Cross-Site Scripting (XSS) attacks. By storing the short-lived access token strictly in JavaScript memory state and delivering the refresh token in an `httpOnly`, `sameSite: 'lax'` cookie, client scripts cannot extract the refresh credentials.

2. **Why Refresh Token Rotation in Redis?**
   - If a refresh token cookie were ever intercepted, without rotation, the attacker could maintain indefinite access. With token rotation, every refresh request revokes the previous token ID (`tokenId`) and issues a new one. Storing active token IDs in Redis allows immediate server-side revocation during logout or security alerts.

3. **Why 6-Digit OTP in Redis with TTL?**
   - OTP codes are temporary and ephemeral. Storing them in Redis with a matching key expiration time automatically cleans up unused codes without cluttering the relational database.

4. **Why Rate Limiting on OTP Endpoints?**
   - Restricting `/api/auth/signup` and `/api/auth/verify-otp` to 5 requests per 15 minutes per IP protects the system against email spamming, SMS/email resource exhaustion, and brute-force guessing of 6-digit codes.

---

## 6. Known Considerations for Future Phases

- **Multi-device session management**: The current implementation supports individual session tokens per login; Phase 8 can expand this to list all active user devices.
- **Email Delivery in Production**: Local development utilizes console logging fallback if live SMTP credentials are not supplied. Production deployments will require configuring SendGrid/Mailgun/SES credentials in `.env`.
