# CampuSync Technical Documentation & Study Guide
## Module 3: Frontend Architecture, Component Implementation & Testing

---

### 1. Application Entry Point & React Root Mounting

The client is a Single Page Application (SPA) built with **React 18** and **TypeScript**, bundled by **Vite**.

#### The Bootstrap Sequence
1. **[`client/index.html`](../../client/index.html)**:
   The browser downloads the static HTML shell containing a single container element: `<div id="root"></div>`. It includes `<script type="module" src="/src/main.tsx"></script>`.
2. **[`client/src/main.tsx`](../../client/src/main.tsx)**:
   ```tsx
   import React from 'react';
   import ReactDOM from 'react-dom/client';
   import App from './App';
   import './index.css';

   ReactDOM.createRoot(document.getElementById('root')!).render(
     <React.StrictMode>
       <App />
     </React.StrictMode>
   );
   ```
   - **`ReactDOM.createRoot`**: Initializes React 18's Concurrent Root API.
   - **`document.getElementById('root')!`**: The non-null assertion operator (`!`) tells TypeScript that the `#root` DOM node is guaranteed to exist.
   - **`<React.StrictMode>`**: Development-only wrapper that intentionally double-invokes lifecycle hooks (like `useEffect`) to detect unintended side effects and deprecated patterns.

---

### 2. Layout, Routing & Route Guarding

In [`client/src/App.tsx`](../../client/src/App.tsx#L15-L77), the entire component tree is wrapped by two providers:
- **`<Router>`** (`BrowserRouter`): Enables HTML5 History API routing without full page reloads.
- **`<AuthProvider>`**: Exposes global authentication state and user identity to all nested components.

#### Route Structure:
```tsx
<Routes>
  {/* Public Routes */}
  <Route path="/" element={<HomePage />} />
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />

  {/* Authenticated Protected Routes */}
  <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
  <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
  <Route path="/listings" element={<ProtectedRoute><ListingsPage /></ProtectedRoute>} />
  <Route path="/applications" element={<ProtectedRoute><ApplicationsPage /></ProtectedRoute>} />

  {/* Catch-All Redirection */}
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
```

#### How `<ProtectedRoute>` Works ([`client/src/components/ProtectedRoute.tsx`](../../client/src/components/ProtectedRoute.tsx)):
1. Consumes `useAuth()`.
2. If `isLoading === true`: Renders a full-screen loading spinner while verifying the JWT token with `/api/auth/me`.
3. If `!isAuthenticated || !user`: Redirects the user to `/login`, storing the attempted route in React Router state (`state={{ from: location }}`) so the user can be redirected back after successful login.
4. If `allowedRoles` is passed (e.g. `['admin']`) and the user's role does not match: Renders a friendly "Access Restricted" alert with a return button, preventing unauthorized page viewing.

---

### 3. State Management & Authentication Flow

Rather than introducing bulky third-party libraries (Redux, MobX), CampuSync implements a clean **React Context + Hooks Pattern** in [`client/src/context/AuthContext.tsx`](../../client/src/context/AuthContext.tsx).

#### The Authentication State Machine:
```ts
interface AuthContextType {
  user: User | null;           // Holds id, name, email, role ('student' | 'admin')
  token: string | null;        // Raw JWT bearer string
  isLoading: boolean;          // True while checking token on mount
  isAuthenticated: boolean;    // Computed as Boolean(user && token)
  login: (email, pass) => Promise<void>;
  register: (name, email, pass) => Promise<void>;
  logout: () => void;
  updateUser: (updated) => void;
}
```

#### Mounting & Session Rehydration (Lines 40–67):
```tsx
useEffect(() => {
  const initializeAuth = async () => {
    const storedToken = localStorage.getItem('campasync_auth_token');
    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    try {
      // Validate token against backend
      const response = await apiClient.get('/auth/me');
      if (response.data?.success && response.data?.data?.user) {
        setUser(response.data.data.user);
        setToken(storedToken);
      }
    } catch (err) {
      // If token expired or invalid, clear stale storage
      localStorage.removeItem('campasync_auth_token');
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  initializeAuth();
}, []);
```
- When the user refreshes the browser, `initializeAuth()` runs once.
- It calls `GET /api/auth/me`. If the token is still valid, the user state is restored with zero flicker.
- If the token has expired, `localStorage` is cleared and `user` resets to `null`.

#### Logout Behavior:
`logout()` removes the token from `localStorage` and resets `token` and `user` state to `null`. React re-renders `<Navbar />` and `<ProtectedRoute>`, immediately redirecting to `/login`.

---

### 4. Detailed Walkthrough of Major Pages & Components

---

#### Page 1: Navigation Bar & Notification Bell
- **Files**: [`client/src/components/Navbar.tsx`](../../client/src/components/Navbar.tsx), [`client/src/components/NotificationBell.tsx`](../../client/src/components/NotificationBell.tsx)
- **What the user sees**:
  - Sticky top header with CampuSync logo.
  - Active page links (Dashboard, Opportunities, Applications, Profile).
  - Role pill badge (e.g. green `Admin` badge or blue `Student` badge).
  - Dynamic notification bell with a red badge showing unread notifications count.
  - Dropdown menu to view notifications, mark single items as read, or "Mark all as read".
  - Logout button.
- **Key Implementation Details**:
  - `NotificationBell` polls `/api/notifications/unread-count` on mount and after interactions.
  - Clicking a notification navigates directly to `/applications` where the student can inspect the status.
  - Uses `useRef` to detect clicks outside the notification dropdown and close it automatically.

---

#### Page 2: Dashboard Page (`/dashboard`)
- **File**: [`client/src/pages/DashboardPage.tsx`](../../client/src/pages/DashboardPage.tsx)
- **Dual-Persona Implementation**:
  - **For Students (`user.role === 'student'`)**:
    - Displays quick-action cards: "Academic Profile" (with link to complete profile), "Placement Drives" (browse and apply), and "My Applications" (track interview stages).
    - Quick summary cards directing them to pending actions.
  - **For Administrators (`user.role === 'admin'`)**:
    - **KPI Metrics Grid**: Total Students, Active Placement Drives, Total Submissions, Selected Students, Gross Offers, Placement Rate (%), and Selection Rate (%).
    - **Status Distribution Panel**: Visual progress bars representing all 7 lifecycle stages (`submitted`, `under_review`, `shortlisted`, `interview_scheduled`, `selected`, `rejected`, `withdrawn`) with counts and percentages.
    - **Top Hiring Companies List**: Ranked list of corporations by application volume.
    - **Recent Applications Stream**: Chronological feed of recent candidate submissions with applicant names, company names, and status tags.
    - **Live Refresh Control**: "Refresh Data" button with an animated spinner calling `getDashboardAnalytics()`.

---

#### Page 3: Opportunities & Placement Listings (`/listings`)
- **File**: [`client/src/pages/ListingsPage.tsx`](../../client/src/pages/ListingsPage.tsx)
- **Features**:
  - **Filtering & Search**: Live text search (by title and company), filter dropdowns for Opportunity Type (`Full-Time`, `Internship`, `FTE + Internship`), Work Arrangement (`On-Site`, `Hybrid`, `Remote`), and sort order (Deadline, Min CGPA, Date Created).
  - **Student View & Eligibility Engine**:
    - Each drive card renders a real-time eligibility badge:
      - Green `Eligible to Apply` (CGPA, Branch, and Grad Year match).
      - Amber `Incomplete Profile` (links to profile page).
      - Red `Ineligible` (details which criteria failed).
    - Clicking an opportunity opens the **Drive Detail Modal** showing comprehensive job responsibilities, skills tags, compensation, location, and application deadline countdown.
    - Clicking "Apply" opens the **Application Submission Modal** with a controlled `coverLetter` textarea and a confirmation prompt.
  - **Admin View & Management**:
    - "Post New Drive" button opening the **Listing Creator Modal** (with title, company, branches multi-select, CGPA slider, stipend/salary, dates, and skills input).
    - Edit and Delete listing modals with confirmation dialogs.
    - Status tabs (`All`, `Published`, `Draft`, `Closed`) allowing quick archival.
    - **"View Applicants" Modal**: Renders the complete roster of student candidates who applied to this listing, their CGPAs, cover letters, and status dropdown to advance candidates (`under_review` $\to$ `interview_scheduled` $\to$ `selected`).
    - One-click resume download button calling `downloadApplicantResume(applicationId)`.

---

#### Page 4: Student Applications Tracker (`/applications`)
- **File**: [`client/src/pages/ApplicationsPage.tsx`](../../client/src/pages/ApplicationsPage.tsx)
- **Features**:
  - Fetches the student's applications via `GET /api/applications/me`.
  - Filter pills to filter by status (`All`, `Under Review`, `Shortlisted`, `Selected`, `Rejected`, `Withdrawn`).
  - Search bar to find applications by company name or role.
  - Accordion toggle to expand and read the submitted cover letter.
  - **Withdrawal Modal**: If an application is in a withdrawable state (`submitted` or `under_review`), a "Withdraw" button opens a confirmation modal calling `PATCH /api/applications/:id/withdraw`. Terminal states (`selected`, `rejected`, `withdrawn`) disable withdrawal.

---

#### Page 5: Student Profile & Resume Manager (`/profile`)
- **File**: [`client/src/pages/ProfilePage.tsx`](../../client/src/pages/ProfilePage.tsx)
- **Features**:
  - **10-Field Academic Profile Form**: Controlled inputs for Full Name, Phone, Roll Number, Institution, Department (from the 10 engineering branches dropdown), Degree, Graduation Year, CGPA (0.0 to 10.0), Technical Skills tags, Biography, and Social links (LinkedIn, GitHub, Portfolio).
  - **Dynamic Completion Meter**: Real-time progress bar computing profile percentage towards 100% and displaying missing fields.
  - **Resume Upload Section**:
    - File input accepting PDF files.
    - Client-side validation enforcing PDF extension and `< 5MB` size limit before network transmission.
    - Displays active resume metadata: original filename, file size in KB/MB, and upload timestamp.
    - "Download Resume" button streaming the PDF into a blob and triggering a browser download.
    - "Delete Resume" button with a confirmation modal resetting status to `not_uploaded`.

---

### 5. Frontend Testing Architecture

Frontend tests are written using **Vitest** and **React Testing Library** in [`client/src/setupTests.ts`](../../client/src/setupTests.ts).

#### Key Test Suites (7 test suites, 70 passing tests):
1. **`client.test.ts`** (6 tests): Validates Axios base URL normalization, trailing slash removal, authorization header injection, and 401 token cleanup.
2. **`App.test.tsx`** (10 tests): Validates home page rendering, navigation links, client-side routing, and protected route redirection to `/login`.
3. **`NotificationBell.test.tsx`** (8 tests): Tests unread badge counters, dropdown opening, single mark-as-read, mark-all-read, and Escape key dismissal.
4. **`DashboardPage.test.tsx`** (9 tests): Validates that students see student quick action cards while administrators see placement analytics, KPI tiles, and distribution bars.
5. **`ListingsPage.test.tsx`** (10 tests): Tests listing search, branch filtering, eligibility evaluation pills, and application modal interactions.
6. **`ApplicationsPage.test.tsx`** (7 tests): Tests student application table rendering, status filter pills, cover letter accordions, and application withdrawal.
7. **`ProfilePage.test.tsx`** (20 tests): Validates 10 engineering branch selections, CGPA bounds checking, profile update submissions, PDF resume file validation, and upload/download buttons.
