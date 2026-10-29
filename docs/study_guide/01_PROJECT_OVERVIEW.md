# CampuSync Technical Documentation & Study Guide
## Module 1: Project Overview, Objectives & Repository Architecture

---

### 1. Project Synopsis & The Real-World Problem Solved

#### What is CampuSync?
**CampuSync** is a production-deployed, full-stack **Campus Placement and Internship Management Portal**. It acts as a centralized operating system for university Training and Placement Cells (T&P Cells / Placement Offices), connecting two primary stakeholders:
1. **Students**: Seeking internship and full-time employment opportunities, managing academic profiles and resumes, applying for drives, tracking recruitment progression in real-time, and receiving status notifications.
2. **Placement Officers / Administrators**: Authoring and publishing placement drives, defining automated academic eligibility cutoffs (CGPA, departments, graduation cohorts), screening applicant pools, scheduling interviews, updating candidate statuses, downloading verified student resumes, and analyzing institutional placement metrics through a KPI-driven dashboard.

#### The Problem It Solves
Traditional campus placement operations in engineering colleges and universities suffer from major systemic inefficiencies:
- **Dispersed Information Silos**: Placement notices are traditionally scattered across notice boards, email threads, WhatsApp groups, and spreadsheets (Google Sheets / Excel), causing missed deadlines and student confusion.
- **Manual Eligibility Audits**: Placement officers must manually cross-verify whether hundreds of applicants satisfy minimum CGPA requirements, graduation year criteria, and allowed engineering departments, leading to administrative overhead and human error.
- **Lack of Application Transparency**: Students rarely have visibility into where their application stands in the recruitment pipeline (e.g., whether they are shortlisted, scheduled for interviews, or rejected), creating anxiety and constant manual queries to placement staff.
- **Unverified & Inconsistent Resumes**: Students frequently submit outdated, unverified, or non-standard resume formats without central tracking of revisions.
- **Absence of Real-Time Placement Analytics**: Institutional leadership lacks immediate, deduplicated metrics regarding overall placement rates, total offers extended, branch-wise selection distributions, and corporate hiring volumes.

CampuSync eliminates these operational bottlenecks by providing an automated, role-governed web application with automated eligibility verification, structured status workflows, secure document handling, and live analytics.

---

### 2. Stakeholder Personas & Core User Journeys

CampuSync implements a strict **Dual-Role Access Model** enforced by JSON Web Tokens (JWT) and role-based Express middleware:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CampuSync User Personas                         │
├───────────────────────────────────┬────────────────────────────────────┤
│         Student Persona           │    Admin / Placement Officer       │
├───────────────────────────────────┼────────────────────────────────────┤
│ • Registers via public portal     │ • Securely provisioned via CLI     │
│ • Completes academic profile      │ • Authors & updates job listings   │
│ • Uploads verified PDF resume     │ • Defines eligibility cutoffs      │
│ • Explores eligible listings      │ • Reviews incoming candidate pools │
│ • Submits job applications        │ • Downloads candidate resumes      │
│ • Tracks stage transitions        │ • Advances lifecycle statuses      │
│ • Receives in-app notifications   │ • Monitors institutional KPIs      │
└───────────────────────────────────┴────────────────────────────────────┘
```

#### User Journey A: The Student Experience
1. **Onboarding & Authentication**: The student registers via `/register`, establishing a secure account permanently bound to the `student` role. Upon logging in via `/login`, a JWT bearer token is stored in the browser's `localStorage` and automatically injected into subsequent API requests.
2. **Profile Completion**: The student navigates to `/profile`, filling out academic parameters (10 engineering branches, CGPA, graduation year, roll number, technical skills, biography, LinkedIn, and GitHub links). A dynamic completeness meter tracks profile readiness towards 100%.
3. **Resume Management**: The student uploads their PDF resume. The backend inspects the file's binary magic bytes (`%PDF-`), enforces a 5MB threshold, strips path traversal characters, and streams the binary into MongoDB GridFS.
4. **Discovering Opportunities**: On `/listings`, the student views all published drives. An automated client/server evaluation engine checks the student's profile against the listing's cutoffs and marks each drive as `Eligible`, `Ineligible` (with detailed reason breakdowns), or `Incomplete Profile`.
5. **Applying**: If eligible, the student submits a statement of interest (`coverLetter`). The system verifies eligibility server-side, validates the application deadline, and prevents duplicate submissions via database compound indexing (`student + listing`).
6. **Tracking & Notifications**: On `/applications`, the student monitors all submissions across the 7 valid stages (`submitted`, `under_review`, `shortlisted`, `interview_scheduled`, `selected`, `rejected`, `withdrawn`). They can withdraw active applications prior to decision stages and receive notification badges whenever the placement office updates their status.

#### User Journey B: The Placement Officer / Admin Experience
1. **Administrative Authentication**: The placement director signs in with provisioned administrative credentials, unlocking the admin navigation workspace and analytics capabilities.
2. **Listing Administration**: On `/listings`, the administrator creates recruitment drives (`Amazon`, `Goldman Sachs`, `Cisco`, etc.), setting compensation, employment types (`full_time`, `internship`, `internship_and_full_time`), work arrangement (`on_site`, `hybrid`, `remote`), application deadlines, required skills, and explicit eligibility parameters.
3. **Applicant Pool Screening**: The administrator clicks "View Applicants" on any drive, viewing the complete candidate roster with student names, emails, departments, CGPAs, cover letters, and application timestamps.
4. **Candidate Assessment & Resume Retrieval**: The administrator downloads the applicant's exact PDF resume streamed on-the-fly from GridFS with strict security headers (`Content-Disposition: attachment`, `X-Content-Type-Options: nosniff`).
5. **Stage Progression**: The administrator transitions candidate statuses (e.g. from `under_review` to `interview_scheduled` to `selected`). Each valid transition triggers an automated `Notification` document for the affected student.
6. **Executive Dashboard & KPIs**: On `/dashboard`, the placement cell reviews real-time institutional metrics: total registered students, active placement drives, total submissions, unique students placed, gross offers, placement rate percentage, selection rate percentage, company-wise application volumes, and status distribution bars.

---

### 3. Repository Directory Structure & File Map

CampuSync is structured as an **NPM Monorepo Workspaces** project separating concerns cleanly into `client` (frontend SPA) and `server` (backend REST API):

```
placement-portal/ (Repository Root)
├── package.json              # Monorepo workspaces definition ("client", "server") & unified scripts
├── package-lock.json         # Pinned dependency tree
├── render.yaml               # Infrastructure-as-Code blueprint for Render backend deployment
├── vercel.json               # Root routing & reverse-proxy configuration for Vercel deployment
├── README.md                 # Public project documentation & quickstart
├── docs/                     # Technical specifications & study guides
│   ├── ARCHITECTURE.md       # Initial architectural blueprint
│   ├── DATABASE_DESIGN.md    # Initial database schema specification
│   └── study_guide/          # Comprehensive technical study guide modules (Modules 1-8)
│
├── client/                   # Frontend Workspace (React 18 + TypeScript + Vite + Tailwind CSS)
│   ├── package.json          # Frontend dependencies (React, React Router v6, Axios, Lucide React)
│   ├── tsconfig.json         # Strict TypeScript configuration for DOM & React JSX
│   ├── tsconfig.node.json    # TypeScript configuration for Vite build tools
│   ├── vite.config.ts        # Vite configuration & dev server proxy rules
│   ├── vercel.json           # Client-specific SPA routing fallback
│   ├── index.html            # Single Page Application HTML host page
│   └── src/
│       ├── main.tsx          # Application entry point (mounts React DOM root)
│       ├── App.tsx           # Route definitions, AuthProvider, Navbar, and layout structure
│       ├── index.css         # Tailwind CSS directives & global resets
│       ├── setupTests.ts     # Vitest DOM matchers setup (@testing-library/jest-dom)
│       ├── api/              # Axios HTTP client & API abstraction layers
│       │   ├── client.ts     # Configured Axios instance with auth interceptor & URL normalizer
│       │   ├── analytics.ts  # Admin KPI & distribution API endpoints
│       │   ├── applications.ts# Application submission, tracking & withdrawal APIs
│       │   ├── listings.ts   # Placement drive CRUD & applicant query APIs
│       │   ├── notifications.ts# In-app notification polling & read-marker APIs
│       │   ├── profile.ts    # Student academic profile retrieval & mutation APIs
│       │   └── resumes.ts    # Multipart resume upload & streaming download APIs
│       ├── components/       # Reusable UI component library
│       │   ├── Navbar.tsx    # Responsive navigation bar with role badges & logout controls
│       │   ├── NotificationBell.tsx # Dropdown notification panel with unread badge counter
│       │   └── ProtectedRoute.tsx # Route guard enforcing authentication & allowed roles
│       ├── context/          # React Context state management
│       │   └── AuthContext.tsx # Centralized authentication state machine (user, token, login, logout)
│       └── pages/            # View components corresponding to browser routes
│           ├── HomePage.tsx  # Public landing page with portal features & action links
│           ├── LoginPage.tsx # Split-screen authentication login form with error alerts
│           ├── RegisterPage.tsx # Student registration form with real-time validation
│           ├── DashboardPage.tsx # Dual-persona dashboard (Admin Analytics vs Student Actions)
│           ├── ProfilePage.tsx # 10-field academic profile manager & PDF resume uploader
│           ├── ListingsPage.tsx# Opportunity board with search, filters, modals & admin CRUD
│           └── ApplicationsPage.tsx # Student application tracker with withdrawal modal
│
└── server/                   # Backend Workspace (Node.js + Express + TypeScript + MongoDB/Mongoose)
    ├── package.json          # Backend dependencies & compilation scripts
    ├── tsconfig.json         # Strict TypeScript configuration (Node 20+ target, CommonJS modules)
    ├── .env.example          # Clean configuration template with documented variables
    ├── dist/                 # Compiled JavaScript output (generated by tsc for production)
    └── src/
        ├── server.ts         # Process entry point, graceful shutdown & server listener
        ├── app.ts            # Express application factory, security middleware & route mounting
        ├── config/           # Environment & connection management
        │   ├── env.ts        # Environment variable extraction & production security guard
        │   └── db.ts         # Mongoose connection manager with explicit dbName selection
        ├── controllers/      # Request handlers (HTTP request parsing & response dispatching)
        │   ├── analytics.controller.ts   # Placement metrics & pipeline KPI handlers
        │   ├── application.controller.ts # Drive submission, student listing & status mutation
        │   ├── auth.controller.ts        # Registration, login & profile verification handlers
        │   ├── health.controller.ts      # Uptime, memory, database readyState diagnostic handler
        │   ├── listing.controller.ts     # Opportunity drive creation, search & lifecycle handlers
        │   ├── notification.controller.ts# Notification retrieval & read state mutators
        │   ├── profile.controller.ts     # Student profile retrieval & completeness calculation
        │   └── resume.controller.ts      # Multipart resume parsing & GridFS streaming handlers
        ├── middlewares/      # Express pipeline middleware
        │   ├── auth.middleware.ts        # JWT verification (requireAuth) & role guard (requireRole)
        │   ├── errorHandler.ts           # Centralized exception handler & error response envelope
        │   ├── notFoundHandler.ts        # 404 Route handler generating standard AppError
        │   ├── rateLimiter.ts            # IP-based rate limiters (auth, upload, download protection)
        │   └── requestLogger.ts          # Morgan-based structured HTTP request logging
        ├── models/           # Mongoose Data Models & Schema Definitions
        │   ├── application.model.ts      # Applications collection with compound unique index
        │   ├── listing.model.ts          # Placement listings collection with compound text indexes
        │   ├── notification.model.ts     # Student notifications collection
        │   ├── profile.model.ts          # Student academic profiles collection (10 core fields)
        │   ├── resume.model.ts           # Resume metadata collection linked to GridFS files
        │   └── user.model.ts             # Users collection (students & admins) with unique emails
        ├── routes/           # Express Router endpoint definitions
        │   ├── index.ts                  # Central router aggregating all resource sub-routers
        │   ├── analytics.routes.ts       # /api/analytics endpoints (admin only)
        │   ├── application.routes.ts     # /api/applications endpoints (student & admin)
        │   ├── auth.routes.ts            # /api/auth endpoints (public & protected)
        │   ├── health.routes.ts          # /api/health diagnostics
        │   ├── listing.routes.ts         # /api/listings endpoints
        │   ├── notification.routes.ts    # /api/notifications endpoints
        │   ├── profile.routes.ts         # /api/profile endpoints
        │   ├── resume.routes.ts          # /api/resumes endpoints
        │   └── student.routes.ts         # /api/students endpoints (admin resume queries)
        ├── scripts/          # Administrative & Seeding utilities
        │   └── seedAdmin.ts  # Secure CLI tool to provision or promote administrator accounts
        ├── services/         # Encapsulated business & storage services
        │   ├── analytics.service.ts      # Aggregation pipelines, KPI calculations & deduplication
        │   └── storage/                  # Storage abstractions
        │       ├── storage.interface.ts  # Interface contract for document storage providers
        │       └── gridfs.storage.ts     # MongoDB GridFS streaming storage implementation
        ├── utils/            # Shared helper functions & primitives
        │   ├── apiResponse.ts            # Standard success & error response formatters
        │   ├── appError.ts               # Custom operational Error class with HTTP status codes
        │   ├── eligibility.ts            # Academic cutoff evaluation & department normalization
        │   ├── fileValidation.ts         # PDF magic bytes validation & filename sanitization
        │   ├── jwt.ts                    # JWT token signing & cryptographic verification
        │   └── password.ts               # Bcrypt password hashing (12 rounds) & comparison
        └── validators/       # Zod input validation schemas
            ├── application.validator.ts  # Application submission & query schema validation
            ├── auth.validator.ts         # Registration & login payload validation
            ├── listing.validator.ts      # Opportunity creation, update & filter validation
            ├── notification.validator.ts # Notification parameter validation
            ├── profile.validator.ts      # Academic profile update payload validation
            └── resume.validator.ts       # Resume metadata validation
```

---

### 4. Technology Stack Overview

| Layer | Technologies Used | Key Responsibilities & Capabilities |
|---|---|---|
| **Frontend Framework** | **React 18.3.1 + TypeScript 5.5** | Declarative component UI, typed props/state, single-page application routing. |
| **Build Tool & Bundler** | **Vite 6.4.5** | Instant hot module replacement (HMR), optimized Rollup production bundling, chunk minification. |
| **Styling & Icons** | **Tailwind CSS 3.4 + Lucide React** | Utility-first responsive styling, accessible color palettes, crisp SVG iconography. |
| **Routing** | **React Router DOM 6.22** | Browser-based client routing, route guards (`ProtectedRoute`), programmatic navigation. |
| **HTTP Client** | **Axios 1.7.9** | Promise-based HTTP client, automatic JWT Authorization header injection, unified error interceptor. |
| **Backend Runtime** | **Node.js (v20+ / v22 LTS)** | Asynchronous, non-blocking I/O event-driven server runtime. |
| **Web Server Framework** | **Express 4.21.2 + TypeScript** | HTTP routing, ordered middleware chain, JSON body parsing, error handling. |
| **Database & ODM** | **MongoDB Atlas + Mongoose 8.9.5** | Cloud replica set document database, strict object-data modeling, indexing, aggregation pipelines. |
| **Binary Storage** | **MongoDB GridFS (`mongoose.mongo.GridFSBucket`)** | Chunked binary storage for large PDF documents directly within the database replica set. |
| **Data Validation** | **Zod 3.24.1** | Schema validation, type inference, runtime input sanitization, error messages. |
| **Security & Auth** | **JWT (`jsonwebtoken` 9.0) + Bcrypt (`bcryptjs` 2.4) + Helmet + CORS** | Stateless token auth, 12-round salted password hashing, HTTP headers hardening, origin filtering. |
| **Testing Suites** | **Jest 29.7 (Server) + Vitest 2.1 (Client) + Supertest 7.0** | Comprehensive unit & integration testing across backend APIs and React components. |
| **Deployment Cloud** | **Vercel (Frontend) + Render (Backend) + MongoDB Atlas (Database)** | Globally distributed CDN edge hosting, containerized web service with health checks, managed cloud database. |

---

### 5. Local Development vs. Production Architecture

The application is engineered to operate seamlessly across both local development machines and deployed production cloud environments through environment variables and build configurations:

```
┌────────────────────────────────────────────────────────────────────────┐
│               Development vs Production Environment Matrix             │
├───────────────────────┬──────────────────────┬─────────────────────────┤
│ Architectural Aspect  │ Local Development    │ Production Environment  │
├───────────────────────┼──────────────────────┼─────────────────────────┤
│ Frontend Server       │ Vite Dev Server      │ Vercel Edge CDN         │
│ Base URL              │ http://localhost:5173│ https://campusync-orcin.vercel.app│
│ Backend API Server    │ Node.js via tsx watch│ Node.js via dist/server.js (Render)│
│ API Port & Protocol   │ Port 5001 (HTTP)     │ Port 10000 / 443 (HTTPS)│
│ API Base URL          │ /api (Vite Proxy)    │ https://campusync-api.onrender.com/api│
│ Database              │ MongoDB / Atlas      │ MongoDB Atlas (Replica) │
│ Database Name         │ placement_portal     │ placement_portal (Explicit)|
│ CORS Origin           │ Localhost permitted  │ Strict exact Vercel URL │
│ JWT Secret            │ Development fallback │ Strict 32+ char secret  │
│ Static Assets         │ Memory / HMR         │ Gzip / Brotli CDN cache │
│ TypeScript Execution  │ Direct via tsx       │ Pre-compiled via tsc    │
└───────────────────────┴──────────────────────┴─────────────────────────┘
```

1. **API Routing & Reverse Proxying**:
   - In **development**, the frontend Vite server forwards `/api` requests to `http://localhost:5001` using Vite proxy rules, avoiding browser CORS restrictions.
   - In **production**, `vercel.json` provides an edge rewrite rule (`/api/:match*` $\to$ `https://campusync-api.onrender.com/api/:match*`) as well as direct fallback configuration in [`client/src/api/client.ts`](../../client/src/api/client.ts#L10-L21).
2. **CORS Security**:
   - In **development**, `server/src/app.ts` dynamically permits all `http://localhost:*` loopback origins.
   - In **production**, `server/src/app.ts` rejects arbitrary origins with HTTP 403, allowing only the exact normalized origin configured in `CORS_ORIGIN` (`https://campusync-orcin.vercel.app`).
3. **TypeScript Compilation**:
   - In **development**, `tsx watch src/server.ts` interprets TypeScript in-memory with live-reloading.
   - In **production**, `npm run build` runs `tsc`, compiling pure JavaScript into `server/dist/` executed by standard Node.js without development overhead.
4. **JWT Security Invariants**:
   - In **production**, [`server/src/config/env.ts`](../../server/src/config/env.ts#L44-L53) halts server startup immediately if `JWT_SECRET` is missing, empty, or equals the known development default string.

---

### 6. Implemented vs. Unimplemented Features Audit

To ensure presentation honesty and defend the project accurately during reviews, here is the exact feature status based strictly on the codebase:

#### Implemented & Live Capabilities
- [x] **Stateless JWT Authentication**: Secure user registration, login, token verification, session persistence, and logout.
- [x] **Dual Role-Based Access Control**: Strict segregation between `student` and `admin` routes and UI components.
- [x] **10-Field Academic Profile Engine**: Complete student profile management with dynamic percentage calculation and department branch selection.
- [x] **Secure Resume Pipeline**: Multipart form handling, PDF magic bytes validation (`%PDF-`), 5MB size limit, filename path traversal sanitization, and GridFS chunked storage.
- [x] **Placement Drive Management**: Full CRUD operations for recruitment opportunities with compensation, eligibility cutoffs, and deadlines.
- [x] **Automated Eligibility Engine**: Real-time evaluation of CGPA cutoffs, department normalization, and graduation years with detailed feedback.
- [x] **Application Tracking System (ATS)**: Student application submissions, duplicate prevention via compound unique indexes, and student withdrawal capabilities.
- [x] **Lifecycle Stage Machine**: 7 valid application statuses (`submitted`, `under_review`, `shortlisted`, `interview_scheduled`, `selected`, `rejected`, `withdrawn`) with transition constraints.
- [x] **In-App Notification Center**: Automated notification generation upon status changes, unread badge counters, mark-as-read, and mark-all-read actions.
- [x] **Executive Placement Analytics**: Real-time calculations of placement rates, selection rates, status distributions, top hiring companies, and recent activity.
- [x] **Production Hardening**: Reverse proxy trust, rate limiters, exact CORS allowlisting, production JWT validation, and secure CLI admin provisioning.

#### Unimplemented / Future Roadmap Items (Do Not Claim as Implemented)
- [ ] **Email & SMS Delivery**: Notifications are currently **in-app only**. There is no SendGrid, Nodemailer, or Twilio integration for external delivery.
- [ ] **Multi-Company Recruiter Accounts**: There is no distinct `recruiter` role. All corporate listings are authored and managed by university placement officers (`admin` role).
- [ ] **Automated Online Assessments / Coding Tests**: CampuSync tracks assessment stages (`shortlisted`, `interview_scheduled`) but does not host an in-browser code runner or quiz engine.
- [ ] **Direct Chat / Messaging**: Communication is handled through application status updates and notification banners rather than real-time chat websockets.
- [ ] **Automated Offer Letter Generation**: The system records `selected` / offered statuses but does not dynamically generate signed PDF offer letter documents.
