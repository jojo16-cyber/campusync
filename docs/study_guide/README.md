# CampuSync — Complete Technical Study Guide & Viva Defense Suite

Welcome to the **CampuSync Master Technical Study Guide**. This comprehensive documentation suite has been engineered to provide an exhaustive, evidence-based understanding of the CampuSync codebase. It is designed to prepare you for college lecturer presentations, project viva examinations, and software engineering technical interviews.

---

## Guide Index & Module Directory

| Module | Document | Description |
|:---:|:---|:---|
| **01** | [**Project Overview, Objectives & Repository Architecture**](01_PROJECT_OVERVIEW.md) | Problem statement, user personas (Student vs Admin), user journeys, complete directory tree mapping, tech stack breakdown, development vs production matrix, and feature implementation audit. |
| **02** | [**Full-Stack Architecture & Request Lifecycle**](02_ARCHITECTURE_AND_LIFECYCLE.md) | Full-stack Mermaid architecture diagram, client-server communication, Express middleware pipeline, Mongoose ODM storage/retrieval, and three end-to-end request lifecycles with sequence diagrams. |
| **03** | [**Frontend Deep Dive & Testing**](03_FRONTEND_DEEP_DIVE.md) | React 18 bootstrap sequence, client routing, ProtectedRoute implementation, AuthContext state machine, Axios interceptors, detailed page walkthroughs, and Vitest component testing suite. |
| **04** | [**Backend Deep Dive & API Endpoint Reference**](04_BACKEND_DEEP_DIVE.md) | Server startup, fail-fast production environment validation, graceful shutdown handlers, centralized error handling, rate limiters, GridFS binary streaming, and a complete catalog of all 26 REST API endpoints. |
| **05** | [**Database Design, Mongoose Models & Schemas**](05_DATABASE_AND_MODELS.md) | Detailed Mongoose model walkthroughs, complete Mermaid Entity-Relationship (ER) diagram, unique and compound database indexes, document lifecycle hooks, and integrity enforcement matrix. |
| **06** | [**Security, Authentication & Authorization**](06_SECURITY_AND_AUTHENTICATION.md) | Authentication vs authorization, Bcrypt salted hashing with 12 rounds, stateless JWT signing and verification, public student lockdown, RBAC middleware, IDOR prevention, and user enumeration defenses. |
| **07** | [**Business Logic, Eligibility Algorithms & Analytics**](07_BUSINESS_LOGIC_AND_ALGORITHMS.md) | Deep dive into `evaluateEligibility()`, fuzzy department normalization, 10-field profile completion scorer, 7-stage recruitment state machine, automated notification triggers, and placement analytics deduplication. |
| **08** | [**College Viva Defense, Technical Q&A & Interview Guide**](08_VIVA_AND_INTERVIEW_PREP.md) | 10–15 minute presentation roadmap and script, architectural decision defenses (MERN vs Django, MongoDB vs PostgreSQL, JWT vs Cookies, GridFS vs S3), and top 30 technical viva and interview questions with model answers. |

---

## Key Project Facts at a Glance

- **Product Name**: CampuSync
- **Category**: Student Placement and Internship Management Portal
- **Stack**: React 18, TypeScript, Vite, Tailwind CSS, Node.js, Express, MongoDB Atlas, Mongoose ODM, GridFS, JWT, Zod
- **Frontend Deployment**: Vercel (`https://campusync-orcin.vercel.app`)
- **Backend Deployment**: Render (`https://campusync-api.onrender.com`)
- **Active Database**: `placement_portal` on MongoDB Atlas
- **Test Suites**: 7 frontend suites (70 tests passing), backend Jest test suites passing
