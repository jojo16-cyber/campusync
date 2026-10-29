# CampuSync Technical Documentation & Study Guide
## Module 6: Authentication, Authorization & Security Architecture

---

### 1. Conceptual Distinction: Authentication vs. Authorization

A fundamental concept professors and interviewers test is the distinction between these two concepts:
- **Authentication ("Who are you?")**: The process of verifying identity. In CampuSync, a user proves who they are by supplying their unique email and secret password. The server validates this against the salted bcrypt hash and issues a signed JSON Web Token (JWT).
- **Authorization ("What are you allowed to do?")**: The process of verifying permissions. Once authenticated, the server inspects the user's role (`student` or `admin`) and context (e.g. whether student $A$ is the owner of application $X$) before granting access to specific endpoints or records.

```
Incoming Request
       │
       ▼
[requireAuth Middleware]   ──────► Authentication: Is the JWT valid and unexpired?
       │                                           Who is the caller (req.user)?
       ▼
[requireRole Middleware]   ──────► Authorization: Does req.user.role have permission
       │                                          (e.g., 'admin' only)?
       ▼
[Controller Business Logic]─────► Data Isolation / Ownership: Is the student accessing
       │                                                      their own resume / application?
       ▼
Execute Action
```

---

### 2. Password Security & Cryptographic Hashing

#### Why Plaintext Passwords Must Never Be Stored
If a database storing plaintext passwords is breached (via SQL/NoSQL injection, unauthorized dump, or compromised credentials), attackers obtain instant access to all user accounts. Furthermore, because users frequently reuse passwords across platforms, a breach compromises their accounts across external services.

#### How Bcrypt Works in CampuSync ([`server/src/utils/password.ts`](../../server/src/utils/password.ts)):
```ts
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};
```
- **Salt Generation**: Bcrypt automatically generates a unique 16-byte cryptographically secure random salt for every password before hashing. This ensures that two users with identical passwords (e.g., `Password123!`) will have completely different hashes, neutralizing **Rainbow Table attacks** (precomputed hash lookup tables).
- **Adaptive Cost Factor (`SALT_ROUNDS = 12`)**: Salt rounds define the work factor as $2^{12} = 4096$ iterations. This intentional computational delay (~250–300ms per check) makes offline brute-force attacks and dictionary attacks computationally prohibitive for attackers using GPUs.
- **Embedded Hash Format**: The resulting hash string incorporates algorithm identifiers, cost factor, salt, and hash in a single modular string:
  ```text
  $2a$12$e8x...[22 salt characters]...[31 hash characters]
  ```

---

### 3. Stateless Token Management: JSON Web Tokens (JWT)

#### Token Architecture ([`server/src/utils/jwt.ts`](../../server/src/utils/jwt.ts)):
CampuSync uses HMAC-SHA256 (`HS256`) to sign tokens:
```ts
export interface TokenPayload {
  userId: string;
  email: string;
  role: 'student' | 'admin';
}
```

```
┌─────────────────────────────────────────────────────────────┐
│                       JWT Anatomy                           │
├─────────────────────────────────────────────────────────────┤
│ 1. Header:    {"alg": "HS256", "typ": "JWT"}                │
│ 2. Payload:   {"userId": "...", "email": "...", "role": ...}│
│ 3. Signature: HMACSHA256(Base64(Header) + "." +             │
│                          Base64(Payload), JWT_SECRET)       │
└─────────────────────────────────────────────────────────────┘
```

#### Token Lifecycle:
1. **Creation**: Upon successful registration or login, `signToken(payload)` executes `jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' })`.
2. **Transmission**: Stored in `localStorage` by the React client and transmitted in the HTTP request header:
   ```http
   Authorization: Bearer <token>
   ```
3. **Verification**: In [`server/src/middlewares/auth.middleware.ts`](../../server/src/middlewares/auth.middleware.ts), `requireAuth` extracts the token, verifies cryptographic integrity using `jwt.verify(token, env.JWT_SECRET)`, loads the user from MongoDB via `User.findById(decoded.userId)`, and attaches the document to `req.user`.

---

### 4. Role Governance & Tenant Data Isolation

#### A. Public Registration Lockdown
In [`server/src/controllers/auth.controller.ts`](../../server/src/controllers/auth.controller.ts#L24-L30):
```ts
// SECURITY: Public registration is strictly restricted to student accounts
const user = await User.create({
  name: validatedData.name,
  email: validatedData.email,
  passwordHash,
  role: 'student', // HARDCODED ROLE
});
```
Even if an attacker sends `{ "role": "admin" }` in the POST `/api/auth/register` payload, the controller deliberately ignores it and hardcodes `role: 'student'`. Admin accounts can only be provisioned through secure out-of-band CLI scripts ([`seedAdmin.ts`](../../server/src/scripts/seedAdmin.ts)).

#### B. Administrator-Only Route Guard
```ts
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new AppError(`Forbidden: Access denied. Required role: ${allowedRoles.join(' or ')}`, 403));
    }
    next();
  };
};
```
Used on endpoints such as `POST /api/listings`, `PATCH /api/applications/:id/status`, and all `/api/analytics/*` routes.

#### C. Student-to-Student Data Isolation (Preventing IDOR)
An **Insecure Direct Object Reference (IDOR)** occurs when user $A$ accesses user $B$'s records simply by changing an ID in the URL.
CampuSync prevents IDOR across all student endpoints:
- In `GET /api/applications/me`, the query is scoped strictly to `Application.find({ student: req.user._id })`. Students cannot query applications belonging to other user IDs.
- In `GET /api/resumes/me/download`, the query fetches `Resume.findOne({ student: req.user._id })`. A student has zero programmatic path to download another student's resume.
- Only administrators possess the authorization (`requireRole('admin')`) to query resumes across other student IDs (`GET /api/students/:studentId/resume`).

---

### 5. Code Walkthrough: Successful vs. Failed Login

#### Scenario A: Successful Login
1. Client POSTs `{ "email": "student.aarav@campusync.edu", "password": "ValidPassword123!" }` to `/api/auth/login`.
2. `authLimiter` verifies that the client's IP has not exceeded 10 requests within the last 15 minutes.
3. `loginSchema.parse()` validates formatting.
4. `User.findOne({ email })` retrieves the user record from MongoDB Atlas.
5. `bcrypt.compare()` hashes the submitted password with the user's stored salt and confirms equality (`true`).
6. `signToken()` signs a JWT containing the user's `userId`, `email`, and `role`.
7. Server responds with HTTP 200 OK:
   ```json
   {
     "success": true,
     "message": "Login successful",
     "data": {
       "user": { "id": "...", "name": "[Demo] Aarav Sharma", "email": "...", "role": "student" },
       "token": "eyJhbGciOi..."
     }
   }
   ```

#### Scenario B: Failed Login (Wrong Password or Unregistered Email)
1. Client POSTs invalid credentials.
2. If email does not exist: Controller immediately throws `AppError('Invalid email or password', 401)`.
3. If password does not match: `bcrypt.compare()` returns `false`, throwing the identical `AppError('Invalid email or password', 401)`.
4. **User Enumeration Defense**: The server returns the exact same HTTP status (401) and message for both missing emails and wrong passwords. This prevents attackers from guessing which email addresses are registered with the institution.

---

### 6. Secrets Management & Production Safeguards

- **No Secrets in Source Code**: Database URIs, JWT secrets, and admin passwords are never committed to Git. Both `.gitignore` files (`/server/.gitignore` and `/.gitignore`) explicitly exclude `.env`, `.env.local`, and `dist/`.
- **Fail-Fast Production Validation** ([`server/src/config/env.ts`](../../server/src/config/env.ts#L44-L53)):
  During startup, `validateProductionSecurity()` asserts that if `NODE_ENV === 'production'`, `JWT_SECRET` must be set and must not equal the known development fallback string. If violated, it prints `[Fatal Security Error]` and aborts without printing the secret itself.
- **Log Sanitization**: In [`server/src/config/db.ts`](../../server/src/config/db.ts#L9-L10), the connection URI is sanitized with a regex replacement (`//***:***@`) before writing to console logs, ensuring database credentials never leak into Render or terminal logs.

---

### 7. Security Strengths vs. Recommended Improvements

| Implemented Security Capabilities | Recommended Production Enhancements (For Defense Discussion) |
|---|---|
| **Bcrypt Salted Hashing (12 Rounds)**: Industry standard resistance against brute-force attacks. | **Multi-Factor Authentication (MFA)**: Adding TOTP (Google Authenticator) for placement officer accounts. |
| **Strict Role Guarding**: Students cannot access admin routes or alter administrative statuses. | **Refresh Token Rotation in HttpOnly Cookies**: Storing access tokens in memory and refresh tokens in secure HttpOnly cookies to mitigate XSS-based `localStorage` extraction. |
| **PDF Magic Bytes Validation**: Binary inspection preventing disguised malicious files. | **Virus/Malware Scanning Pipeline**: Integrating ClamAV or AWS GuardDuty to scan uploaded PDF resumes. |
| **Exact CORS Whitelisting**: Blocks unauthorized web origins and wildcard credential exploits. | **Account Lockout Policies**: Temporarily locking accounts after 5 failed consecutive password attempts. |
| **Automated Rate Limiting**: Shields auth routes and resume downloads from credential stuffing and DoS. | **Audit Log Archival**: Exporting admin status mutations to a tamper-proof append-only logging bucket. |
