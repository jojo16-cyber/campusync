# CampuSync Technical Documentation & Study Guide
## Module 4: Backend Architecture, Subsystems & API Endpoint Reference

---

### 1. Server Startup, Lifecycle & Graceful Shutdown

The backend runtime entry point is located in [`server/src/server.ts`](../../server/src/server.ts).

#### Startup Sequence:
```ts
const startServer = async () => {
  // 1. Enforce production security invariants
  validateProductionSecurity(env.NODE_ENV, env.JWT_SECRET);

  // 2. Connect to database before starting HTTP listener
  await connectDatabase();

  // 3. Bind HTTP listener
  const server = app.listen(env.PORT, () => {
    console.log(`[Server] Placement & Internship Portal API running on http://localhost:${env.PORT}`);
    console.log(`[Server] Health check endpoint available at http://localhost:${env.PORT}/api/health`);
    console.log(`[Server] Environment: ${env.NODE_ENV}`);
  });
  ...
};
```
- **Fail-Fast Invariant**: `validateProductionSecurity()` executes before opening socket listeners. If `NODE_ENV === 'production'` and `JWT_SECRET` is missing, empty, or equals the known default string, it throws an exception and halts immediately.
- **Ordered Connection**: `connectDatabase()` connects to MongoDB Atlas before `app.listen()` accepts incoming requests.
- **Graceful Shutdown**: Listens for `SIGINT` (Ctrl+C) and `SIGTERM` (Docker/Render container stop signal). When received, it stops accepting new HTTP connections, waits for ongoing requests to finish, disconnects Mongoose cleanly via `disconnectDatabase()`, and terminates with code 0 (with a 10s fallback timer).

---

### 2. Request Handling, Middleware Chain & Error Handling

#### Centralized Error Envelope ([`server/src/middlewares/errorHandler.ts`](../../server/src/middlewares/errorHandler.ts)):
When a controller throws an error or calls `next(err)`, Express invokes the 4-argument error middleware:
```ts
export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal server error';
  let details: unknown = undefined;

  // 1. Custom Operational AppErrors
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  }
  // 2. Zod Schema Validation Failures
  else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    details = err.errors.map(e => ({ path: e.path.join('.'), message: e.message }));
  }
  // 3. Database & Network Exceptions
  else if (err.name === 'MongoServerSelectionError') {
    statusCode = 503;
    message = 'Database service temporarily unavailable';
  }
  // 4. CORS Origin Violations
  else if (err.message && err.message.startsWith('CORS origin not allowed')) {
    statusCode = 403;
    message = 'Forbidden: Cross-Origin Resource Sharing (CORS) policy violation';
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    ...(details ? { details } : {}),
    timestamp: new Date().toISOString(),
  });
};
```
Every error produces a predictable JSON envelope, preventing server crashes and obscuring internal stack traces in production.

---

### 3. Rate Limiting Subsystem

Configured in [`server/src/middlewares/rateLimiter.ts`](../../server/src/middlewares/rateLimiter.ts) using `express-rate-limit`:
- **`authLimiter`**: 10 requests per 15-minute window for `/api/auth/register` and `/api/auth/login`. Prevents brute-force credential stuffing.
- **`resumeUploadLimiter`**: 10 upload requests per 15-minute window for `/api/resumes`. Prevents disk exhaustion on GridFS.
- **`resumeDownloadLimiter`**: 30 download requests per 15-minute window. Prevents bandwidth scraping.

---

### 4. Resume Management & GridFS Binary Streaming

Located in [`server/src/controllers/resume.controller.ts`](../../server/src/controllers/resume.controller.ts) and [`server/src/services/storage/gridfs.storage.ts`](../../server/src/services/storage/gridfs.storage.ts):
- **Formidable Multipart Parsing**: Handles multipart form-data without reading entire large payloads into server memory.
- **Binary Magic Bytes Inspection**: Reads the first 5 bytes from the temporary disk file. If the buffer does not equal `%PDF-` (`0x25 0x50 0x44 0x46 0x2d`), the file is immediately deleted from temp storage and rejected with HTTP 415 Unsupported Media Type.
- **GridFS Streaming**: Streams chunks into MongoDB's `resumes.chunks` and `resumes.files` collections.
- **Zero In-Memory Buffering on Download**: When an administrator or student downloads a resume, `bucket.openDownloadStream()` pipes bytes directly into `res.write()`, keeping Node.js memory footprint near zero even under concurrent downloads.

---

### 5. Comprehensive API Endpoint Reference Table

The table below documents all **26 verified endpoints** that exist in the Express backend, their authentication requirements, validation rules, and response payloads:

| Method | Endpoint Route | Description / Purpose | Auth | Role | Request Body / Params | Success Response (Data Payload) | Common Error Codes | Source File |
|---|---|---|---|---|---|---|---|---|
| **GET** | `/` | API Root Status & Ping | None | Any | None | `{ message, docs }` | None | `app.ts` |
| **GET** | `/api/health` | Diagnostic & DB status | None | Any | None | `{ status, uptimeSeconds, environment, services: { server, database } }` | 503 (DB down) | `health.controller.ts` |
| **POST** | `/api/auth/register` | Student Registration | None | Public | `{ name, email, password }` | `{ user: { id, name, email, role }, token }` | 400 (Zod), 409 (Email exists) | `auth.controller.ts` |
| **POST** | `/api/auth/login` | User Authentication | None | Public | `{ email, password }` | `{ user: { id, name, email, role }, token }` | 400 (Bad input), 401 (Invalid creds) | `auth.controller.ts` |
| **GET** | `/api/auth/me` | Fetch Current Session | JWT | Any | None | `{ user: { id, name, email, role, ... } }` | 401 (Invalid/expired token) | `auth.controller.ts` |
| **GET** | `/api/auth/admin-only` | Role Guard Diagnostic | JWT | `admin` | None | `{ adminUser }` | 401 (No auth), 403 (Not admin) | `auth.routes.ts` |
| **GET** | `/api/profile/me` | Student Profile & Completion | JWT | Any | None | `{ profile, completion: { percentage, isComplete, ... } }` | 401 (Unauthorized) | `profile.controller.ts` |
| **PUT** | `/api/profile/me` | Update Student Profile | JWT | Any | `{ phone, department, degree, cgpa, rollNumber, skills, ... }` | `{ profile, completion }` | 400 (Invalid CGPA/year), 401 | `profile.controller.ts` |
| **GET** | `/api/listings` | Search & Filter Drives | JWT | Any | Query: `?search=&type=&arrangement=&status=&page=&limit=` | `{ listings: [...], pagination: { total, page, limit, totalPages } }` | 401 (Unauthorized) | `listing.controller.ts` |
| **GET** | `/api/listings/:id` | Drive Details + Eligibility | JWT | Any | Path: `:id` | `{ listing, eligibility: { isEligible, status, criteria } }` | 401, 404 (Not found) | `listing.controller.ts` |
| **POST** | `/api/listings` | Author New Placement Drive | JWT | `admin` | `{ companyName, title, description, opportunityType, location, compensation, skillsRequired, eligibility, applicationDeadline }` | `{ listing }` | 400 (Validation), 403 (Not admin) | `listing.controller.ts` |
| **PUT** | `/api/listings/:id` | Edit Placement Drive | JWT | `admin` | Path: `:id`, Body: Complete listing fields | `{ listing }` | 400, 403, 404 | `listing.controller.ts` |
| **PATCH**| `/api/listings/:id/status`| Update Drive Status | JWT | `admin` | Path: `:id`, Body: `{ status: 'draft'\|'published'\|'closed' }` | `{ listing }` | 400 (Invalid enum), 403, 404 | `listing.controller.ts` |
| **DELETE**| `/api/listings/:id` | Delete / Archive Drive | JWT | `admin` | Path: `:id` | `{ message: 'Listing deleted successfully' }` | 403, 404 | `listing.controller.ts` |
| **GET** | `/api/listings/:listingId/applications` | Query Drive Applicants | JWT | `admin` | Path: `:listingId`, Query: `?status=&page=&limit=` | `{ listing, applications: [...], pagination }` | 403, 404 | `application.controller.ts` |
| **POST** | `/api/applications` | Apply for Placement Drive | JWT | `student`| Body: `{ listingId, coverLetter? }` | `{ application }` | 400 (Ineligible/expired), 409 (Duplicate) | `application.controller.ts` |
| **GET** | `/api/applications/me` | Student's Submissions | JWT | `student`| None | `{ applications: [...] }` | 401, 403 (Not student) | `application.controller.ts` |
| **GET** | `/api/applications/me/:id` | Submission Detail | JWT | `student`| Path: `:id` | `{ application }` | 403, 404 | `application.controller.ts` |
| **PATCH**| `/api/applications/:id/withdraw` | Withdraw Application | JWT | `student`| Path: `:id` | `{ application }` | 400 (Cannot withdraw terminal state), 404 | `application.controller.ts` |
| **GET** | `/api/applications/:id` | Admin View Application | JWT | `admin` | Path: `:id` | `{ application }` | 403, 404 | `application.controller.ts` |
| **PATCH**| `/api/applications/:id/status` | Update Stage Status | JWT | `admin` | Path: `:id`, Body: `{ status: 'shortlisted'\|'interview_scheduled'\|... }` | `{ application }` | 400 (Invalid transition), 403, 404 | `application.controller.ts` |
| **GET** | `/api/applications/:id/resume` | Admin Download Applicant Resume | JWT | `admin` | Path: `:id` | Binary PDF Stream (`application/pdf`) | 403, 404 (No resume) | `resume.controller.ts` |
| **POST** | `/api/resumes` | Upload Student PDF Resume | JWT | `student`| Multipart form (`file` binary, max 5MB) | `{ resume: { id, originalName, fileSize, uploadedAt } }` | 400 (No file), 415 (Not PDF), 413 (>5MB) | `resume.controller.ts` |
| **GET** | `/api/resumes/me` | Student Resume Metadata | JWT | `student`| None | `{ resume }` | 401, 404 (Not uploaded) | `resume.controller.ts` |
| **GET** | `/api/resumes/me/download` | Student Resume Download | JWT | `student`| None | Binary PDF Stream (`application/pdf`) | 401, 404 | `resume.controller.ts` |
| **DELETE**| `/api/resumes/me` | Delete Student Resume | JWT | `student`| None | `{ message: 'Resume deleted successfully' }` | 401, 404 | `resume.controller.ts` |
| **GET** | `/api/students/:studentId/resume` | Admin Get Student Resume | JWT | `admin` | Path: `:studentId`, Query: `?metadata=true` | PDF Stream OR JSON metadata | 403, 404 | `resume.controller.ts` |
| **GET** | `/api/notifications` | User's In-App Notifications | JWT | Any | Query: `?unreadOnly=true&limit=20` | `{ notifications: [...], unreadCount }` | 401 | `notification.controller.ts` |
| **GET** | `/api/notifications/unread-count` | Polling Unread Count | JWT | Any | None | `{ unreadCount: number }` | 401 | `notification.controller.ts` |
| **PATCH**| `/api/notifications/:id/read` | Mark Notification Read | JWT | Any | Path: `:id` | `{ notification }` | 401, 404 | `notification.controller.ts` |
| **PATCH**| `/api/notifications/read-all` | Mark All Read | JWT | Any | None | `{ modifiedCount: number }` | 401 | `notification.controller.ts` |
| **GET** | `/api/analytics/dashboard`| Full Executive KPI Payload | JWT | `admin` | None | `{ kpis, statusDistribution, companyApplications, recentApplications, activitySummary }` | 403 (Forbidden for students) | `analytics.controller.ts` |
| **GET** | `/api/analytics/kpis` | KPI Metrics Cards | JWT | `admin` | None | `{ totalStudents, activeOpportunities, totalApplications, selectedStudents, placementRate, ... }` | 403 | `analytics.controller.ts` |
| **GET** | `/api/analytics/status-distribution` | 7-Stage Bar Data | JWT | `admin` | None | `[ { status, label, count, percentage }, ... ]` | 403 | `analytics.controller.ts` |
| **GET** | `/api/analytics/company-applications` | Top Companies Ranked | JWT | `admin` | None | `[ { companyName, applicationCount, percentage }, ... ]` | 403 | `analytics.controller.ts` |
| **GET** | `/api/analytics/recent-applications` | Chronological Feed | JWT | `admin` | None | `[ { id, student, listing, status, submittedAt }, ... ]` | 403 | `analytics.controller.ts` |
