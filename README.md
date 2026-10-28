# Student Placement & Internship Management Portal (CampuSync)

A web development college project designed to automate and streamline the campus recruitment and internship lifecycle for students, recruiters, and the training & placement office (TPO).

---

## 🏗️ Project Architecture (Phase 1)

This project is built using a modern decoupled client-server architecture:

```
placement-portal/
├── client/                     # Frontend Application
│   ├── src/
│   │   ├── App.tsx             # Responsive Portal Homepage & Diagnostics
│   │   ├── App.test.tsx        # Vitest & React Testing Library tests
│   │   ├── index.css           # Tailwind CSS directives
│   │   └── main.tsx            # Entry point
│   ├── .env.example            # Sample client environment configuration
│   ├── tailwind.config.js      # Tailwind configuration
│   └── vite.config.ts          # Vite & Vitest configuration
├── server/                     # Backend API Server
│   ├── src/
│   │   ├── config/             # DB & Environment configuration
│   │   ├── controllers/        # Health controller
│   │   ├── middlewares/        # Helmet, CORS, Morgan, Error & 404 Handlers
│   │   ├── routes/             # Health routes & Router composition
│   │   ├── utils/              # AppError and standardized ApiResponse
│   │   ├── app.ts              # Express application setup
│   │   ├── server.ts           # Server bootstrap and graceful shutdown
│   │   └── __tests__/          # Jest & Supertest API tests
│   └── .env.example            # Sample server environment configuration
├── docs/
│   ├── ARCHITECTURE.md         # API architecture & middleware pipeline
│   └── DATABASE_DESIGN.md      # MongoDB & Mongoose schemas & ERD
├── package.json                # Root orchestration with npm workspaces
└── .gitignore                  # Global exclusion of node_modules, .env, dist
```

---

## 🚀 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React
- **Backend**: Node.js, Express, TypeScript, Helmet, CORS, Morgan, Dotenv
- **Database**: MongoDB with Mongoose ODM
- **Testing**:
  - Backend: Jest, Supertest, ts-jest
  - Frontend: Vitest, React Testing Library, jsdom

---

## ⚙️ Prerequisites

- **Node.js**: v18.0.0 or higher (v22+ recommended)
- **npm**: v8.0.0 or higher
- **MongoDB** (Optional for Phase 1; health check gracefully reports disconnected status when not running)

---

## 🛠️ Quickstart Installation

1. **Install all dependencies (root, server, and client)**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   ```

3. **Start both client and server concurrently**:
   ```bash
   npm run dev
   ```
   - Client will be available at: [http://localhost:5173](http://localhost:5173)
   - API will be available at: [http://localhost:5000](http://localhost:5000)
   - Health check endpoint: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🧪 Available Scripts

| Command | Action |
|---|---|
| `npm run dev` | Runs both client (Vite) and backend (tsx) concurrently |
| `npm run dev:server` | Starts the Express TypeScript backend in watch mode |
| `npm run dev:client` | Starts the Vite React frontend dev server |
| `npm run test` | Runs both Jest (server) and Vitest (client) test suites |
| `npm run test:server` | Executes backend tests using Jest & Supertest |
| `npm run test:client` | Executes frontend tests using Vitest & React Testing Library |
| `npm run build` | Builds both backend (tsc) and frontend (vite build) |
| `npm run lint` | Runs ESLint on both server and client source trees |
| `npm run type-check` | Performs strict TypeScript checks across both workspaces |

---

## 🔒 Security & Error Handling (Phase 1 Implemented)

- **Helmet**: Sets critical HTTP response headers (`X-Frame-Options`, `Strict-Transport-Security`, `X-Content-Type-Options`).
- **CORS**: Configurable cross-origin protection.
- **Centralized Error Handling**: Unhandled exceptions and operational errors are converted into standardized JSON structures without leaking stack traces in production.
- **Environment Isolation**: `.env` and local secrets are excluded from Git version control. `.env.example` templates are provided.

---

## 📄 Documentation

- [System & API Architecture](docs/ARCHITECTURE.md)
- [MongoDB Database Design & ERD](docs/DATABASE_DESIGN.md)
