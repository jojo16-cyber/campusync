# CampuSync Technical Documentation & Study Guide
## Module 2: Full-Stack Architecture & End-to-End Request Lifecycles

---

### 1. System Architecture Diagram

The diagram below illustrates the actual components and data flow implemented in the CampuSync codebase:

```mermaid
flowchart TD
    subgraph ClientBrowser["User Browser (Client Tier)"]
        User["Student / Placement Officer"]
        ReactApp["React 18 Single Page Application (SPA)\n[Vite 6 + TypeScript]"]
        AuthCtx["AuthContext State\n(User, Token, isAuthenticated)"]
        AxiosClient["Axios HTTP Client (client.ts)\n(Auth Bearer Interceptor)"]
        LocalStorage[("Browser localStorage\n['campasync_auth_token']")]
    end

    subgraph EdgeTier["Edge & Gateway Tier (Cloud Hosting)"]
        VercelEdge["Vercel CDN Edge Server\n(campusync-orcin.vercel.app)\nRewrites /api/* to Render"]
        RenderGateway["Render Cloud Web Service\n(campusync-api.onrender.com)\n[Node 22 LTS, Port 10000]"]
    end

    subgraph BackendApp["Express Backend Application (Server Tier)"]
        ServerEntry["Server Listener\n(server.ts)"]
        AppPipeline["Express Pipeline (app.ts)"]

        subgraph Middlewares["Ordered Middleware Chain"]
            ProxyGuard["app.set('trust proxy', 1)"]
            Helmet["helmet() Security Headers"]
            Cors["cors() Origin Whitelister"]
            RateLimiters["express-rate-limit Limiters\n(Auth, Resume Upload/Download)"]
            BodyParsers["express.json({ limit: '1mb' })"]
            Logger["requestLogger (Morgan)"]
            AuthGuard["requireAuth & requireRole\n(auth.middleware.ts)"]
        end

        subgraph Routing["Express Routers (/api)"]
            SubRouters["auth | profile | listings | applications | resumes | analytics | notifications"]
        end

        subgraph ValidationLayer["Validation Layer (Zod)"]
            ZodSchemas["Zod Schemas\n(auth.validator, listing.validator, etc.)"]
        end

        subgraph Controllers["Controller Tier"]
            Ctrl["Controllers (auth, listing, application, analytics, etc.)"]
        end

        subgraph BusinessServices["Business Services & Utilities"]
            EligibilityUtil["Eligibility Evaluator (eligibility.ts)"]
            FileValidator["PDF Magic Bytes Validator (fileValidation.ts)"]
            AnalyticsSvc["Analytics Aggregations (analytics.service.ts)"]
            GridFSSvc["GridFS Storage Service (gridfs.storage.ts)"]
            PasswordUtil["Bcrypt Salt Hashing (password.ts)"]
            JwtUtil["JWT Sign & Verify (jwt.ts)"]
        end

        subgraph ErrorHandling["Centralized Error Handling"]
            NotFound["notFoundHandler.ts"]
            GlobalError["errorHandler.ts (Standard JSON Envelope)"]
        end
    end

    subgraph DatabaseTier["Database Tier (MongoDB Atlas Replica Set)"]
        MongooseODM["Mongoose 8.9 ODM\n(Explicit dbName: 'placement_portal')"]

        subgraph MongoCollections["Database: placement_portal"]
            ColUsers[("users")]
            ColProfiles[("studentprofiles")]
            ColListings[("listings")]
            ColApplications[("applications")]
            ColNotifications[("notifications")]
            ColResumes[("resumes & resumes.files / chunks (GridFS)")]
        end
    end

    %% Interactions
    User -->|Interacts with UI| ReactApp
    ReactApp <-->|State Updates| AuthCtx
    AuthCtx <-->|Persists Token| LocalStorage
    ReactApp -->|Dispatches API Calls| AxiosClient
    AxiosClient -->|HTTPS Request + Bearer Token| VercelEdge
    VercelEdge -->|Edge Proxy / Direct Request| RenderGateway
    RenderGateway --> ServerEntry
    ServerEntry --> AppPipeline
    AppPipeline --> ProxyGuard --> Helmet --> Cors --> RateLimiters --> BodyParsers --> Logger --> AuthGuard --> SubRouters
    SubRouters --> ZodSchemas --> Ctrl
    Ctrl --> EligibilityUtil & FileValidator & AnalyticsSvc & GridFSSvc & PasswordUtil & JwtUtil
    Ctrl --> MongooseODM
    MongooseODM --> MongoCollections
    AppPipeline --> NotFound --> GlobalError
    GlobalError -->|JSON Error Response Envelope| AxiosClient
    Ctrl -->|JSON Success Response Envelope| AxiosClient
```

---

### 2. Architectural Layers & Communication Protocols

#### A. Client-Server Communication
- **RESTful JSON over HTTPS**: The client and server communicate strictly via JSON payloads over encrypted HTTPS connections.
- **Stateless Bearer Tokens**: Rather than maintaining memory-heavy server-side sessions, the server is completely stateless. Every authenticated request transmits a JSON Web Token in the `Authorization` HTTP header using the standard format:
  ```http
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```
- **Axios Interceptors** ([`client/src/api/client.ts`](../../client/src/api/client.ts#L32-L46)):
  The Axios instance attaches a request interceptor that retrieves `campasync_auth_token` from `localStorage` before every outgoing request and injects it into `config.headers.Authorization`. A response interceptor detects HTTP 401 Unauthorized responses and purges stale tokens if an authentication check fails.

#### B. Express Middleware Pipeline Execution Order
Every HTTP request hitting Express executes through an exact sequential middleware pipeline defined in [`server/src/app.ts`](../../server/src/app.ts#L10-L75):
1. `app.set('trust proxy', 1)`: Informs Express that it operates behind reverse proxies (Vercel edge routers and Render load balancers), ensuring `req.ip` reflects the true client IP for rate limiting rather than the load balancer's internal IP.
2. `helmet()`: Sets secure HTTP headers (e.g., `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `X-Frame-Options: SAMEORIGIN`, and restrictive Content Security Policies).
3. `cors(...)`: Inspects the `Origin` header. Rejects disallowed third-party origins with a CORS error and accepts exact production origins without wildcard vulnerabilities.
4. `express.json({ limit: '1mb' })`: Parses incoming `application/json` request bodies, enforcing a 1MB limit to protect against payload-based denial of service.
5. `express.urlencoded({ extended: true, limit: '1mb' })`: Parses URL-encoded data.
6. `requestLogger`: Uses `morgan` to log HTTP method, path, status code, and latency in terminal logs.
7. `app.use('/api', apiRoutes)`: Dispatches the request to the matching resource router in [`server/src/routes/index.ts`](../../server/src/routes/index.ts).
8. `notFoundHandler`: If no route matches, catches the request and forwards an operational 404 `AppError`.
9. `errorHandler`: The centralized error handling middleware catches all thrown errors, sanitizes error messages, formats standard JSON envelopes, and hides internal stack traces in production.

#### C. Database Storage & Retrieval via Mongoose
- **Explicit Connection Configuration** ([`server/src/config/db.ts`](../../server/src/config/db.ts#L6-L9)):
  Connects via `mongoose.connect(env.MONGODB_URI, { dbName: 'placement_portal', serverSelectionTimeoutMS: 5000 })`. This forces Mongoose to use the dedicated `placement_portal` database regardless of cluster URL defaults.
- **ODM Modeling & Validation**:
  Mongoose schemas define strict property types, required fields, custom regex validations (e.g., email format), min/max constraints (e.g., CGPA $0.0 \le \text{cgpa} \le 10.0$), default values, and compound unique indexes.
- **GridFS Chunking**:
  Large binary documents (student PDF resumes) are not stored as bulky BSON documents in standard collections. Instead, [`server/src/services/storage/gridfs.storage.ts`](../../server/src/services/storage/gridfs.storage.ts) uses `GridFSBucket`, splitting the file stream into 255KB chunks stored across `resumes.chunks` and metadata across `resumes.files`.

---

### 3. Detailed Request Lifecycle Traces

To prepare you for line-by-line technical defense, here are the step-by-step traces of three major application workflows through the actual codebase.

---

#### Lifecycle 1: Student Login

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student (Browser)
    participant LoginPage as LoginPage.tsx
    participant AuthContext as AuthContext.tsx
    participant AxiosClient as client.ts (Axios)
    participant ExpressApp as app.ts / routes
    participant RateLimiter as rateLimiter.ts
    participant AuthCtrl as auth.controller.ts
    participant ZodSchema as auth.validator.ts
    participant UserModel as user.model.ts (User)
    participant PasswordUtil as password.ts (Bcrypt)
    participant JwtUtil as jwt.ts (JSONWebToken)
    participant MongoAtlas as MongoDB Atlas

    Student->>LoginPage: Submits email & password form
    LoginPage->>AuthContext: calls login(email, password)
    AuthContext->>AxiosClient: apiClient.post('/auth/login', { email, password })
    AxiosClient->>ExpressApp: POST https://campusync-api.onrender.com/api/auth/login
    ExpressApp->>RateLimiter: authLimiter (checks 15-min IP window)
    RateLimiter->>AuthCtrl: calls login(req, res, next)
    AuthCtrl->>ZodSchema: loginSchema.parse(req.body)
    ZodSchema-->>AuthCtrl: validatedData { email, password }
    AuthCtrl->>UserModel: User.findOne({ email })
    UserModel->>MongoAtlas: queries users collection (indexed email)
    MongoAtlas-->>UserModel: returns user document (with passwordHash)
    AuthCtrl->>PasswordUtil: comparePassword(password, user.passwordHash)
    PasswordUtil-->>AuthCtrl: returns true (Bcrypt salted verification)
    AuthCtrl->>JwtUtil: signToken({ userId, email, role })
    JwtUtil-->>AuthCtrl: returns signed JWT string (7d expiry)
    AuthCtrl-->>ExpressApp: res.status(200).json(successResponse(..., { user, token }))
    ExpressApp-->>AxiosClient: HTTP 200 OK + JSON Envelope
    AxiosClient-->>AuthContext: response.data.data
    AuthContext->>AuthContext: localStorage.setItem('campasync_auth_token', token)
    AuthContext->>AuthContext: setUser(userData), setToken(token)
    AuthContext-->>LoginPage: Promise resolved
    LoginPage->>Student: navigate('/dashboard') (React Router)
```

##### Line-by-Line Code Reference:
1. **Form Submission** ([`client/src/pages/LoginPage.tsx`](../../client/src/pages/LoginPage.tsx#L32-L47)):
   `handleSubmit` validates non-empty inputs and executes `await login(email.trim(), password)`.
2. **Context Dispatch** ([`client/src/context/AuthContext.tsx`](../../client/src/context/AuthContext.tsx#L69-L79)):
   `login()` calls `apiClient.post('/auth/login', { email, password })`.
3. **Route Match & Rate Limiting** ([`server/src/routes/auth.routes.ts`](../../server/src/routes/auth.routes.ts#L11)):
   `router.post('/login', authLimiter, login)`. The `authLimiter` restricts IP bursts to 10 attempts per 15-minute window.
4. **Input Validation** ([`server/src/controllers/auth.controller.ts`](../../server/src/controllers/auth.controller.ts#L57)):
   `loginSchema.parse(req.body)` trims and lowercases the email and enforces non-empty password strings.
5. **Database Lookup** ([`server/src/controllers/auth.controller.ts`](../../server/src/controllers/auth.controller.ts#L59-L64)):
   `const user = await User.findOne({ email: validatedData.email });`. If null, throws `AppError('Invalid email or password', 401)` (generic error message prevents user enumeration attacks).
6. **Password Verification** ([`server/src/utils/password.ts`](../../server/src/utils/password.ts#L9-L11)):
   `bcrypt.compare(password, user.passwordHash)` extracts the embedded salt from the hash and computes whether the candidate password matches.
7. **Token Issuance** ([`server/src/utils/jwt.ts`](../../server/src/utils/jwt.ts#L10-L16)):
   `signToken({ userId, email, role })` signs the payload using HMAC-SHA256 with `JWT_SECRET` and `expiresIn: '7d'`.
8. **Client Persistence** ([`client/src/context/AuthContext.tsx`](../../client/src/context/AuthContext.tsx#L73-L75)):
   `localStorage.setItem(TOKEN_STORAGE_KEY, authToken)`. Updates React state `user` and `token`. React Router navigates to `/dashboard`.

---

#### Lifecycle 2: Viewing Opportunities & Applying with Automated Eligibility Check

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student
    participant ListingsPage as ListingsPage.tsx
    participant AxiosClient as client.ts
    participant AppRouter as application.routes.ts
    participant AuthMiddleware as auth.middleware.ts
    participant AppCtrl as application.controller.ts
    participant ListingModel as listing.model.ts (Listing)
    participant ProfileModel as profile.model.ts (StudentProfile)
    participant EligibilityUtil as eligibility.ts (evaluateEligibility)
    participant AppModel as application.model.ts (Application)
    participant MongoAtlas as MongoDB Atlas

    Student->>ListingsPage: Opens Opportunity Detail Modal & Clicks "Submit Application"
    ListingsPage->>AxiosClient: submitApplication({ listingId, coverLetter })
    AxiosClient->>AppRouter: POST /api/applications + Header: Bearer <JWT>
    AppRouter->>AuthMiddleware: requireAuth
    AuthMiddleware->>AuthMiddleware: verifyToken(token) -> extracts userId & role
    AppRouter->>AuthMiddleware: requireRole('student')
    AuthMiddleware->>AppCtrl: submitApplication(req, res, next)
    AppCtrl->>ListingModel: Listing.findById(listingId)
    ListingModel-->>AppCtrl: returns listing document
    AppCtrl->>AppCtrl: Verifies listing.status === 'published' && !isExpired()
    AppCtrl->>AppModel: Application.findOne({ student: userId, listing: listingId })
    AppModel-->>AppCtrl: returns null (verifies no duplicate)
    AppCtrl->>ProfileModel: StudentProfile.findOne({ userId })
    ProfileModel-->>AppCtrl: returns student profile (CGPA, Department, GradYear)
    AppCtrl->>EligibilityUtil: evaluateEligibility(profile, listing)
    EligibilityUtil->>EligibilityUtil: checks CGPA >= minCgpa & Dept matches & GradYear
    EligibilityUtil-->>AppCtrl: returns { isEligible: true, criteria: [...] }
    AppCtrl->>AppModel: Application.create({ student, listing, coverLetter, status: 'submitted' })
    AppModel->>MongoAtlas: inserts document into applications collection
    MongoAtlas-->>AppModel: persisted document
    AppCtrl-->>AxiosClient: HTTP 201 Created + Standard JSON Envelope
    AxiosClient-->>ListingsPage: Success response
    ListingsPage->>Student: Displays success alert & updates listing button to "Applied"
```

##### Line-by-Line Code Reference:
1. **Eligibility Evaluation Engine** ([`server/src/utils/eligibility.ts`](../../server/src/utils/eligibility.ts#L56-L190)):
   `evaluateEligibility(profile, listing)` conducts a 3-point academic audit:
   - **Profile Completeness**: Checks that `cgpa`, `department`, and `graduationYear` are present and numeric. If any are missing, returns `status: 'incomplete_profile'` (lines 83-91).
   - **CGPA Cutoff**: Verifies `studentCgpa >= listing.eligibility.minCgpa` (lines 101-117).
   - **Department Matching**: Passes both student department and listing eligible branches through `normalizeDepartment()`, matching across acronyms (e.g. `CSE` vs `Computer Science and Engineering (CSE)`) and conjunction variants (lines 120-155).
   - **Graduation Year**: Confirms student graduation cohort is allowed by `eligibleGraduationYears` (lines 157-175).
2. **Server-Side Application Handler** ([`server/src/controllers/application.controller.ts`](../../server/src/controllers/application.controller.ts#L24-L95)):
   - Checks user role is strictly `student` (line 34).
   - Validates listing exists, is `published`, and deadline has not elapsed: `new Date() > new Date(listing.applicationDeadline)` throws HTTP 400 (lines 45-51).
   - Checks duplicate application: `Application.findOne({ student, listing })`. Throws HTTP 409 Conflict if found (lines 54-60).
   - Executes `evaluateEligibility(profile, listing)`. If ineligible, throws HTTP 400 with explicit missing fields and criteria evaluation metadata (lines 66-75).
   - Creates the application document with default `status: 'submitted'` (lines 79-84).

---

#### Lifecycle 3: Admin Reviewing Applications & Executive Analytics

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Placement Officer (Admin)
    participant DashboardPage as DashboardPage.tsx
    participant ListingsPage as ListingsPage.tsx
    participant AxiosClient as client.ts
    participant AnalyticsRouter as analytics.routes.ts
    participant AppRouter as application.routes.ts
    participant AuthMiddleware as auth.middleware.ts
    participant AnalyticsCtrl as analytics.controller.ts
    participant AnalyticsService as analytics.service.ts
    participant AppCtrl as application.controller.ts
    participant NotificationModel as notification.model.ts
    participant MongoAtlas as MongoDB Atlas

    Admin->>DashboardPage: Navigates to /dashboard
    DashboardPage->>AxiosClient: getDashboardAnalytics()
    AxiosClient->>AnalyticsRouter: GET /api/analytics/dashboard + Header: Bearer <JWT>
    AnalyticsRouter->>AuthMiddleware: requireAuth & requireRole('admin')
    AuthMiddleware-->>AnalyticsCtrl: authorized
    AnalyticsCtrl->>AnalyticsService: getKPIMetrics() & getStatusDistribution() & getCompanyApplicationCounts()
    AnalyticsService->>MongoAtlas: Parallel aggregation pipelines (distinct, counts, lookups)
    MongoAtlas-->>AnalyticsService: Raw aggregation results
    AnalyticsService->>AnalyticsService: Computes placement rate & deduplicates selected students
    AnalyticsService-->>AnalyticsCtrl: Complete DashboardAnalyticsPayload
    AnalyticsCtrl-->>DashboardPage: HTTP 200 OK + Analytics Data
    DashboardPage->>Admin: Renders KPI cards, distribution bars & charts

    Admin->>ListingsPage: Opens Applicants Modal & Updates Student to "selected"
    ListingsPage->>AxiosClient: updateCandidateStatus(appId, 'selected')
    AxiosClient->>AppRouter: PATCH /api/applications/:id/status { status: 'selected' }
    AppRouter->>AuthMiddleware: requireAuth & requireRole('admin')
    AuthMiddleware-->>AppCtrl: updateApplicationStatus
    AppCtrl->>AppCtrl: isValidStatusTransition(current, 'selected') -> checks transition table
    AppCtrl->>MongoAtlas: Application.findByIdAndUpdate(appId, { status: 'selected' })
    AppCtrl->>NotificationModel: Notification.create({ recipient: studentId, title, message, status })
    MongoAtlas-->>AppCtrl: Created notification
    AppCtrl-->>ListingsPage: HTTP 200 OK (Updated Application)
    ListingsPage->>Admin: UI reflects "Selected / Offered" badge
```

##### Line-by-Line Code Reference:
1. **Admin Authorization Guard** ([`server/src/middlewares/auth.middleware.ts`](../../server/src/middlewares/auth.middleware.ts#L37-L54)):
   `requireRole('admin')` validates that `req.user.role === 'admin'`. If a student attempts to call any `/api/analytics/*` route, it immediately aborts with HTTP 403 Forbidden: `Forbidden: Access denied. Required role: admin`.
2. **Deduplicated Placement KPI Calculations** ([`server/src/services/analytics.service.ts`](../../server/src/services/analytics.service.ts#L108-L151)):
   - Avoids inflated placement numbers when a high-performing student receives multiple offers:
     `Application.distinct('student', { status: 'selected' })` (line 124) extracts the unique student IDs who have received at least one offer.
   - Calculates the true institutional placement rate:
     `placementRate = Number(((selectedStudentsCount / totalStudents) * 100).toFixed(1))` (line 134).
   - Zero-division safeguard: If `totalStudents === 0`, returns `0` rather than `NaN`.
3. **Application Status State Machine** ([`server/src/models/application.model.ts`](../../server/src/models/application.model.ts#L31-L51)):
   `isValidStatusTransition(currentStatus, targetStatus)` enforces allowable transitions. For example, a terminal state (`selected`, `rejected`, `withdrawn`) has an empty transition array (`[]`), preventing further modifications.
4. **Automated Notification Dispatch** ([`server/src/controllers/application.controller.ts`](../../server/src/controllers/application.controller.ts#L508-L525)):
   Upon successful status transition, creates a `Notification` record for the applicant with formatted status descriptions, ensuring real-time visibility in the student's notification bell.
