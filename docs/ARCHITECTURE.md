# System & API Architecture Specification

## 1. Overview
The **Student Placement & Internship Management Portal (CampuSync)** is designed as a decoupled, multi-tiered client-server web application. The platform streamlines placement drives, company onboarding, student registrations, eligibility filtering, and interview management.

---

## 2. Architectural Layers

```
┌────────────────────────────────────────────────────────┐
│                   Frontend Client                      │
│      React 18 + TypeScript + Vite + Tailwind CSS      │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / REST (JSON)
┌───────────────────────────▼────────────────────────────┐
│                    API Gateway / App                   │
│          Express + TypeScript + Security Stack         │
│  - Helmet (HTTP Header Protection)                     │
│  - CORS (Cross-Origin Resource Policy)                 │
│  - Morgan (HTTP Request Logging)                       │
│  - Express.json / urlencoded (Body parsing)            │
│  - Centralized Error & 404 Handlers                    │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
┌──────────────▼─────────────┐   ┌────────▼──────────────┐
│       Core Services        │   │    MongoDB Database   │
│ - Authentication (Phase 2) │   │    Mongoose ODM       │
│ - Drives & Jobs (Phase 3)  │   │  - Students           │
│ - Applications (Phase 4)   │   │  - Companies & Drives │
│ - Analytics (Phase 5)      │   │  - Applications       │
└────────────────────────────┘   └───────────────────────┘
```

---

## 3. Security & Middleware Pipeline

Every incoming request passes through an ordered middleware chain:
1. **Security Headers (`helmet`)**: Sets X-Content-Type-Options, Strict-Transport-Security, X-Frame-Options, etc.
2. **CORS Policy (`cors`)**: Restricts access to authorized origin URLs (e.g. `http://localhost:5173` in development).
3. **Payload Sanitization & Limits**: Request body size is capped at 1MB to mitigate payload-based Denial of Service.
4. **Structured Request Logging (`morgan`)**: Captures HTTP verb, path, status, and latency.
5. **Route Dispatching**: Directs requests to sub-routers (`/api/health`, `/api/auth`, `/api/drives`, etc.).
6. **Not Found Handler (`notFoundHandler`)**: Unmatched routes bubble up as 404 `AppError`.
7. **Centralized Error Handler (`errorHandler`)**: Normalizes all thrown errors into a standard API response structure, hiding internal stack traces in production.

---

## 4. Standard Response Envelope

All API endpoints return JSON conforming to the standard API response structure:

### Success Response Format:
```json
{
  "success": true,
  "message": "Operation description",
  "data": { ... },
  "timestamp": "2026-10-28T13:45:00.000Z"
}
```

### Error Response Format:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Descriptive error message",
  "details": { ... },
  "timestamp": "2026-10-28T13:45:00.000Z"
}
```

---

## 5. Proposed REST API Endpoints (Phased Roadmap)

### Phase 1: Diagnostics (Implemented)
- `GET /` — API root ping
- `GET /api/health` — System uptime, runtime environment, MongoDB connection state

### Phase 2: Authentication & Authorization (Upcoming)
- `POST /api/auth/register` — Register new Student or Recruiter
- `POST /api/auth/login` — Authenticate and issue JWT token
- `POST /api/auth/logout` — Invalidate session/token
- `GET /api/auth/me` — Retrieve current authenticated session

### Phase 3: Drives & Job Postings (Upcoming)
- `GET /api/drives` — List active placement and internship drives (with filter/pagination)
- `POST /api/drives` — Create new drive (Recruiter/TPO)
- `GET /api/drives/:id` — Detailed drive requirements, eligibility criteria, CTC/stipend
- `PUT /api/drives/:id` — Update drive details
- `DELETE /api/drives/:id` — Archive/cancel drive

### Phase 4: Applications & Shortlisting (Upcoming)
- `POST /api/applications` — Submit application for an active drive
- `GET /api/applications/my` — Student view of submitted applications
- `GET /api/applications/drive/:driveId` — Recruiter view of candidates for a drive
- `PATCH /api/applications/:id/status` — Update stage (`applied`, `shortlisted`, `interview_scheduled`, `offered`, `rejected`)

### Phase 5: Administration & Analytics (Upcoming)
- `GET /api/admin/metrics` — Aggregate stats: total placements, highest CTC, average CTC, branch-wise percentages
- `GET /api/admin/reports/export` — Generate CSV/PDF placement compliance report

