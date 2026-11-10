# HireJob - Modern Job Marketplace Platform

HireJob connects employers, clients, and service providers for both **Temporary Gigs** and **Permanent Careers** with location-based discovery, direct applications, user ratings, and AI-powered recommendations.

---

## 🛠️ Tech Stack Architecture

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query, React Router v7, React Icons, React Hot Toast
- **Backend**: Java 21, Spring Boot 3.4, Spring Security + JWT, Spring Data JPA, Spring Data Redis
- **Database & Cache**: PostgreSQL 16 (Relational & Spatial Search), Redis 7 (Caching & Fast Lookup)
- **Infrastructure**: Docker Compose for automated containerization
- **API Documentation**: SpringDoc OpenAPI / Swagger UI (`/swagger-ui.html`)
- **Planned AI / ML**: Embeddings-based job-candidate matching, automated job description optimization, spam/fraud detection.

---

## 🚀 Features

- **Authentication & Roles**:
  - Secure JWT authentication (`ROLE_POSTER`, `ROLE_CLIENT`, `ROLE_ADMIN`)
  - Registration with role selection and profile management
- **Job Posting & Management**:
  - Temporary gigs (short-term tasks, hourly) vs Permanent roles (full-time)
  - Budget/Salary specification (Min and Max)
  - Image uploads with secure static asset serving
  - Categorization (Home Services, IT, Creative, Logistics, etc.)
- **Location-Based Search & Discovery**:
  - Proximity search by city/location
  - Filter by job type (Temporary vs Permanent) and category
  - Keyword search across titles and descriptions
- **Applications & Client Workflow**:
  - Service providers can submit direct applications with custom messages
  - Employers can review applicants and accept/reject them in real time
- **Ratings & Reviews**:
  - Verified ratings (1-5 stars) and detailed comments
  - Reputation calculation and profile feedback display

---

## 📁 Project Structure

```
HireJob/
├── backend/                       # Spring Boot 3.4 (Java 21) REST API
│   ├── src/main/java/com/hirejob/
│   │   ├── config/                # Security, Redis, CORS, Web configs
│   │   ├── controller/            # Auth, Job, User, Review, Application REST controllers
│   │   ├── dto/                   # Request & Response Data Transfer Objects
│   │   ├── exception/             # Global error handlers
│   │   ├── model/entity/          # User, Job, JobApplication, Review JPA Entities
│   │   ├── model/enums/           # Roles, JobTypes, JobStatus, ApplicationStatus
│   │   ├── repository/            # Spring Data JPA repositories with custom queries
│   │   ├── security/              # JWT provider, filter, UserDetailsService
│   │   └── service/               # Core business services
│   ├── src/main/resources/
│   │   └── application.yml        # Database, Redis, JWT & Upload configs
│   ├── mvnw.cmd                   # Maven wrapper
│   └── pom.xml
│
├── frontend/                      # React + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/            # Layout, JobCard, Search, Filters, Reviews, Common
│   │   ├── context/               # AuthContext for session management
│   │   ├── pages/                 # Home, Login, Register, Jobs, JobDetail, PostJob, Dashboard, Profile
│   │   ├── services/              # Axios API clients
│   │   ├── types/                 # TypeScript interfaces and DTOs
│   │   ├── App.tsx                # Main router with protected routes
│   │   └── main.tsx
│   ├── vite.config.ts             # Tailwind plugin & backend API proxy configuration
│   └── package.json
│
├── docker-compose.yml             # PostgreSQL 16 + Redis 7 setup
└── README.md
```

---

## 🏃 Getting Started

### 1. Start Database & Redis (Docker)
```bash
docker compose up -d
```
This spins up PostgreSQL on port `5432` and Redis on port `6379`.

### 2. Run the Backend (Spring Boot)
```bash
cd backend
.\mvnw.cmd spring-boot:run
```
The API starts at `http://localhost:8080`.
- Swagger UI: `http://localhost:8080/swagger-ui.html`

### 3. Run the Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser. All `/api` requests are automatically proxied to Spring Boot.

---

## 🤖 Future AI & Machine Learning Integration

1. **Smart Candidate-Job Vector Match**:
   - Store skill embeddings via `pgvector` in PostgreSQL.
   - Match candidate qualifications with job listings automatically.
2. **AI Job Post Generator**:
   - Provide an AI prompt assistant to write high-converting job descriptions and recommend fair market rates.
3. **Mobile App**:
   - Future expansion to React Native (Expo) sharing the TypeScript API client and authentication flow.
