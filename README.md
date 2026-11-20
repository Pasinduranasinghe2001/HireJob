# HireJob — Sri Lanka's Direct Skilled Trades & Job Marketplace

HireJob is a full-stack marketplace connecting clients with verified service providers, skilled trades, temporary gigs, and permanent career opportunities across Sri Lanka. Built with **React 19 + TypeScript + Vite** on the frontend and **Java 21 + Spring Boot 3.4 + PostgreSQL** on the backend.

---

## Live Production Deployment

| Component | Host | Live URL |
| :--- | :--- | :--- |
| **Web Application (Frontend)** | Vercel | [https://hire-job-five.vercel.app/](https://hire-job-five.vercel.app/) |
| **REST API (Backend)** | Render (Docker / Java 21) | [https://hirejob.onrender.com](https://hirejob.onrender.com) |
| **Source Repository** | GitHub | [https://github.com/Pasinduranasinghe2001/HireJob](https://github.com/Pasinduranasinghe2001/HireJob) |

---

## Key Platform Features

### 1. Public Browsing, Trilingual UI & Theme Experience
- **Free Anonymous Browsing**: Visitors can freely browse all service listings, filter by type/category/district, view full service details, and contact providers directly without creating an account (`/` , `/jobs`, `/jobs/:id`).
- **Trilingual Support**: Live switcher in the navigation bar supporting **English (`en`)**, **Sinhala (`si` — සිංහල)**, and **Tamil (`ta` — தமிழ்)**.
- **Dark / Light Mode with Interactive Hanging Lamp**: Users can toggle Dark/Light themes from the Navbar or by pulling the animated hanging ceiling lamp cord on the Hero section (`HangingLamp.tsx`).
- **Saved / Remembered Services Drawer**: Any visitor or user can bookmark listings into a slide-over Saved Services drawer (`SavedServicesDrawer.tsx`).

### 2. Authentication, Verification & Account Security
- **Email-First 2-Step Registration (`/register`)**:
  - **Step 1 (Email Ownership Verification)**: Checks email validity and uniqueness, dispatches a 6-digit OTP (`POST /api/auth/register/send-email-otp`) with a 2-minute (120s) countdown timer and **Resend Code** support (resending generates a fresh code and invalidates the previous code), verified via `POST /api/auth/register/verify-email-otp`.
  - **Step 2 (Account Details)**: After email verification succeeds, users choose **Personal** or **Business**, provide their Full/Business Name, Mobile Phone Number, and Password (8+ characters with at least one letter and one number), and create a verified account (`POST /api/auth/register`).
- **Single-Face Login (`/login`)**:
  - Validates email or Sri Lankan mobile number format and verifies BCrypt-hashed credentials against PostgreSQL.
  - Locks all interactive buttons/inputs during sign-in attempts to prevent duplicate submissions.
  - Includes a modal **Forgot Password** reset flow (`POST /api/auth/forgot-password/send` + `/api/auth/forgot-password/reset`) with 6-digit OTP verification and 2-minute expiry.
- **Google OAuth 2.0 Sign-In**:
  - Official Google Identity Services (`Continue with Google`) button verified server-side via `GoogleTokenVerifier` (`POST /api/auth/google`), allowing instant registration and sign-in with Gmail accounts.
- **Multi-User Stateless Sessions & Refresh Persistence**:
  - Concurrent users across browsers/devices authenticate safely via stateless Bearer JWT tokens (`JwtAuthenticationFilter` + `JwtTokenProvider`) and synchronous local session hydration (`AuthContext`), preventing unintended logouts on page refresh or backend wake-ups.
- **Post-Registration Two-Factor Authentication (2FA)**:
  - Configurable from `/profile` (`POST /api/auth/toggle-2fa`) with three supported methods:
    1. **Email Code OTP** (`EMAIL_OTP`)
    2. **Mobile SMS OTP** (`SMS_OTP` — via Twilio when configured, requiring a saved mobile number)
    3. **Biometric Passkey / WebAuthn** (`PASSKEY` — uses browser `navigator.credentials.create` / `get` with OTP backup)
- **Password & Profile Management (`/profile`)**:
  - Users can update their display name and mobile number (`PUT /api/users/me`), change passwords (`PUT /api/users/me/password`), and Google-registered accounts can optionally set a local password without supplying an auto-generated placeholder password. All passwords are stored exclusively using `BCryptPasswordEncoder(12)`.
- **Cloud-Compatible HTTPS Email Delivery**:
  - Supports **Brevo HTTPS API**, **Resend HTTPS API**, **Google Apps Script Gmail Webhook** (HTTPS port 443 for cloud hosts such as Render Free Tier that block outbound SMTP port 587), and **Gmail SMTP** fallback (`EmailService.java`).

### 3. Service Postings, Client Identification & Priority Boost
- **Posting Services (`/post-job`)**:
  - Authenticated users can create **Temporary Gigs** (`TEMPORARY`) or **Permanent Roles** (`PERMANENT`) across categories (Home Services, IT, Construction, Design & Creative, Delivery & Moving, Education & Tutoring, Automotive, etc.).
  - Enforces **Provider & Client Identification Details** (verified poster identity, Contact Phone Number, WhatsApp Number, Contact Email, District/City Location, LKR min/max budget, and Service Description).
  - Supports uploading up to **5 portfolio photos** (`POST /api/jobs/:id/images`) rendered in an auto-playing carousel (`ImageCarousel.tsx`).
- **Auto-Expiring Listings**:
  - Posters can select `Unlimited` (default), `7 Days`, `14 Days`, or `30 Days` duration so temporary listings automatically expire/close when finished (`JobCleanupScheduler` / `expiresAt`).
- **Direct Contact & Inquiries**:
  - One-tap **Call**, **WhatsApp Chat**, **Email Provider**, and in-app **Job Application / Inquiry** (`POST /api/applications`), plus customer **1–5 Star Reviews** (`POST /api/reviews`).
- **Paid Priority Boost Monetization (`/dashboard`, `/jobs/:id`)**:
  - Posters can promote listings to the top of search results and feature them with a Priority badge via `PriorityBoostModal.tsx` (`POST /api/payments/priority-boost`):
    - **7 Days Priority Boost**: `LKR 1,500` (`7_DAYS_PRIORITY`)
    - **30 Days Super Placement**: `LKR 3,500` (`30_DAYS_PRIORITY`)
    - Payment options: Card (`CARD`), PayHere (`PAYHERE`), Bank Transfer (`BANK_TRANSFER`).

### 4. Smart Sri Lankan Search & ML Spam Protection
- **District & City Autocomplete**: Covers locations across Sri Lanka with `Entire Sri Lanka (All Country)` as the default national scope (`fuzzySearch.ts`).
- **Typo-Tolerant Fuzzy Search**: Backend Levenshtein distance + canonical service keyword normalization (`JobService.fuzzyNormalizeKeyword`) combined with frontend fuzzy matching handles common spelling variations (e.g., `celaning` → `cleaning`, `electrian` → `electrical`).
- **Automated ML Spam Filter (`MlSpamFilterService`)**: Calculates a spam score (`0.0–1.0`) and flags suspicious listings containing scam phrases, shortened redirect links, or embedded phone numbers in titles for admin review.

### 5. Company Admin Command Center (`/admin`)
- Protected strictly by `ROLE_ADMIN` on both frontend (`ProtectedRoute`) and backend (`@PreAuthorize("hasRole('ADMIN')")` + `SecurityConfig` + optional IP allow-list `AdminAccessFilter`).
- Company administrator account provisioned securely on startup via `AdminAccountInitializer` with BCrypt-hashed credentials.
- Capabilities in `/admin` (`AdminController.java`, `AdminPage.tsx`):
  - **Analytics & Revenue Overview**: Active listings, registered users, ML spam flags, and company Priority Boost revenue.
  - **Team & User Management**: Create team/moderator accounts (`POST /api/admin/team`), activate/suspend/update roles (`PUT /api/admin/users/:id`), and remove accounts (`DELETE /api/admin/users/:id`). User passwords are encrypted and strictly hidden from all admin APIs.
  - **Listing & Task Moderation**: Toggle status (`ACTIVE`/`CLOSED`/`EXPIRED`), flag/unflag spam listings, grant/revoke Priority placement, delete listings, and inspect platform tasks/payments.
  - **Runtime Platform Settings (`/api/settings/public`, `/api/admin/settings`)**: Toggle public registration availability, announcement banners, and site settings without redeploying.

---

## Tech Stack

- **Frontend**: React 19 (`^19.3.1`), TypeScript (`~7.0.2`), Vite 8 (`^8.3.6`), Tailwind CSS v4 (`@tailwindcss/vite`), React Router v7, TanStack React Query, Axios, React Hot Toast, React Icons
- **Backend**: Java 21, Spring Boot `3.4.0`, Spring Security + JJWT (`0.12.6`), Spring Data JPA, Spring Data Redis, Spring Mail, Bean Validation
- **Database & Infrastructure**: PostgreSQL 16 (production managed DB on Render / local Docker), Redis 7, Docker multi-stage build (`backend/Dockerfile`), Vercel SPA rewrites (`frontend/vercel.json`)

---

## Project Structure

```text
HireJob/
├── backend/                               # Spring Boot 3.4 (Java 21) REST API
│   ├── src/main/java/com/hirejob/
│   │   ├── config/                        # SecurityConfig, AdminAccountInitializer, CorsConfig, RedisConfig, WebConfig, JacksonSecurityConfig
│   │   ├── controller/                    # AuthController, JobController, UserController, ApplicationController, ReviewController, PaymentController, AdminController, SettingsController
│   │   ├── dto/                           # Request & Response DTOs (Auth, Register, OtpRequests, JobRequest, TwoFactor, Admin, etc.)
│   │   ├── exception/                     # GlobalExceptionHandler & custom HTTP exceptions
│   │   ├── model/                         # User, Job, JobApplication, Review, Payment, PlatformSetting entities & Role/JobType/Status enums
│   │   ├── repository/                    # Spring Data JPA repositories
│   │   ├── security/                      # JwtTokenProvider, JwtAuthenticationFilter, GoogleTokenVerifier, RateLimitFilter, AdminAccessFilter, PhoneNormalizer, SessionCookieService
│   │   └── service/                       # AuthService, JobService, UserService, AdminService, EmailService, SmsService, PaymentService, ReviewService, JobApplicationService, MlSpamFilterService
│   ├── src/main/resources/
│   │   └── application.yml                # Server, PostgreSQL, Mail, JWT, Google OAuth, Email Webhook & Admin configuration
│   ├── Dockerfile                         # Production multi-stage Maven + Temurin JRE 21 image (Render)
│   ├── mvnw / mvnw.cmd
│   └── pom.xml
│
├── frontend/                              # React 19 + TypeScript + Vite + Tailwind CSS v4
│   ├── public/                            # logo-icon.png, favicon assets
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/                    # GoogleSignInButton, HangingLamp, ImageCarousel, LoadingSpinner, ProtectedRoute, SavedServicesDrawer, StarRating
│   │   │   ├── jobs/                      # JobCard, JobFilter, JobSearch, PriorityBoostModal
│   │   │   ├── layout/                    # Layout, Navbar, Footer
│   │   │   └── reviews/                   # ReviewCard
│   │   ├── context/                       # AuthContext, LanguageContext, ThemeContext, SavedServicesContext
│   │   ├── pages/                         # HomePage, JobsPage, JobDetailPage, LoginPage, RegisterPage, PostJobPage, DashboardPage, ProfilePage, AdminPage
│   │   ├── services/                      # api.ts (Axios + interceptors), auth.service.ts, job.service.ts
│   │   ├── types/                         # TypeScript interfaces
│   │   ├── utils/                         # authHelpers.ts, fuzzySearch.ts
│   │   ├── App.tsx                        # Router & protected route guards
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts                     # Tailwind v4 plugin & local `/api` proxy to localhost:8081
│   └── vercel.json                        # Vercel SPA fallback rewrite rules
│
├── docker-compose.yml                     # Local PostgreSQL 16 + Redis 7 services
└── README.md
```

---

## REST API Overview

| Domain | Key Endpoints | Auth |
| :--- | :--- | :--- |
| **Auth & Registration** | `GET /api/auth/google/config`, `POST /api/auth/register/send-email-otp`, `POST /api/auth/register/verify-email-otp`, `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/google`, `POST /api/auth/verify-2fa`, `POST /api/auth/forgot-password/send`, `POST /api/auth/forgot-password/reset`, `POST /api/auth/toggle-2fa` | Public (except `/toggle-2fa`) |
| **Users** | `GET /api/users/me`, `PUT /api/users/me`, `PUT /api/users/me/password`, `GET /api/users/:id/profile` | Authenticated (`profile` public) |
| **Jobs / Services** | `GET /api/jobs`, `GET /api/jobs/:id`, `GET /api/jobs/search`, `GET /api/jobs/my-jobs`, `POST /api/jobs`, `PUT /api/jobs/:id`, `DELETE /api/jobs/:id`, `POST /api/jobs/:id/images`, `POST /api/jobs/:id/promote` | `GET` public (except `my-jobs`); writes authenticated |
| **Applications** | `POST /api/applications`, `GET /api/applications/job/:jobId`, `GET /api/applications/my-applications`, `PUT /api/applications/:id/status` | Authenticated |
| **Reviews** | `POST /api/reviews`, `GET /api/reviews/job/:jobId`, `GET /api/reviews/user/:userId` | `GET` public; `POST` authenticated |
| **Payments** | `POST /api/payments/priority-boost`, `GET /api/payments/my-payments` | Authenticated |
| **Settings & Admin** | `GET /api/settings/public`, `GET /api/admin/stats`, `GET/POST/PUT/DELETE /api/admin/users`, `GET/PUT/DELETE /api/admin/jobs`, `GET /api/admin/tasks`, `GET /api/admin/payments`, `GET/PUT /api/admin/settings` | `settings/public` public; `/api/admin/**` requires `ROLE_ADMIN` |

---

## Environment Configuration (Production & Local)

### Backend (`backend/.env` locally or Render Environment Variables)
| Variable | Purpose |
| :--- | :--- |
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | PostgreSQL JDBC connection string and credentials |
| `JWT_SECRET` | Base64 HMAC signing key (at least 64 bytes recommended in production) |
| `CORS_ALLOWED_ORIGINS` | Allowed frontend origins (e.g. `http://localhost:5173,https://hire-job-five.vercel.app`) |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Web Client ID for ID token verification |
| `EMAIL_WEBHOOK_URL` / `BREVO_API_KEY` / `RESEND_API_KEY` | HTTPS OTP email provider (port 443, ideal for Render Free Tier) |
| `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD` | Optional Gmail SMTP credentials for local development |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | Optional Twilio credentials for SMS OTP delivery |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FULL_NAME` | Company administrator bootstrap credentials (password must be 8+ chars) |
| `UPLOAD_DIR` | Directory for uploaded service portfolio images (default: `uploads`) |

### Frontend (Vercel Environment Variables / `frontend/.env`)
| Variable | Purpose |
| :--- | :--- |
| `VITE_API_URL` | Backend base origin (e.g. `https://hirejob.onrender.com`; leave unset in dev for Vite `/api` proxy) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth 2.0 Web Client ID for client-side Identity Services button |

---

## Local Development Setup

### 1. Start PostgreSQL & Redis (Docker Compose)
```bash
docker compose up -d
```

### 2. Start Backend API (Spring Boot on port `8081`)
```bash
cd backend
./mvnw spring-boot:run
```
*(On Windows PowerShell, use `.\mvnw.cmd spring-boot:run`.)*

### 3. Start Frontend App (Vite on port `5173`)
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`. API calls to `/api/**` are automatically proxied to `http://localhost:8081`.
