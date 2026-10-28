# Database Design Specification (MongoDB & Mongoose)

## 1. Overview
The **Student Placement & Internship Management Portal** uses **MongoDB** as its primary document store, accessed via the **Mongoose ODM**. This document outlines the proposed collection schemas, relationships, indexing strategies, and normalization patterns to be implemented in subsequent phases.

---

## 2. Entity Relationship Diagram (ERD)

```
┌─────────────────┐       1:1       ┌────────────────────────┐
│     User        ├─────────────────┤     StudentProfile     │
│ (Auth & Roles)  │                 │  (CGPA, Branch, Resume)│
└────────┬────────┘                 └────────────────────────┘
         │
         │ 1:1
         ▼
┌─────────────────┐
│ RecruiterProfile│
│(Company details)│
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐       1:N       ┌────────────────────────┐
│    JobDrive     ├─────────────────┤      Application       │
│ (Eligibility,   │                 │ (Status, Round Scores) │
│  CTC, Deadlines)│                 └───────────┬────────────┘
└─────────────────┘                             │
                                                │ N:1
                                                ▼
                                    ┌────────────────────────┐
                                    │      StudentProfile    │
                                    └────────────────────────┘
```

---

## 3. Proposed Collections & Schemas

### 3.1 `users` Collection
Stores authentication credentials, identity, and role assignment.
- `_id`: ObjectId (Primary Key)
- `email`: String (Unique, Indexed, Lowercase)
- `passwordHash`: String
- `role`: Enum (`'student'`, `'recruiter'`, `'tpo_admin'`)
- `isActive`: Boolean (Default: true)
- `createdAt`: Date
- `updatedAt`: Date

### 3.2 `student_profiles` Collection
Maintains academic records, contact info, and verification state.
- `_id`: ObjectId
- `userId`: ObjectId (Ref: `User`, Unique, Indexed)
- `rollNumber`: String (Unique, Indexed)
- `firstName`: String
- `lastName`: String
- `phone`: String
- `department`: Enum (`'CSE'`, `'ECE'`, `'MECH'`, `'CIVIL'`, `'IT'`, etc.)
- `degree`: Enum (`'B.Tech'`, `'M.Tech'`, `'MCA'`)
- `batchYear`: Number (e.g., 2026)
- `cgpa`: Number (Min: 0.0, Max: 10.0, Indexed)
- `activeBacklogs`: Number (Default: 0)
- `historyBacklogs`: Number (Default: 0)
- `resumeUrl`: String
- `skills`: Array of Strings
- `isVerifiedByTPO`: Boolean (Default: false)
- `placementStatus`: Enum (`'unplaced'`, `'placed'`, `'higher_studies'`, `'opted_out'`)

### 3.3 `recruiter_profiles` Collection
Maintains corporate recruiter metadata and company verification.
- `_id`: ObjectId
- `userId`: ObjectId (Ref: `User`, Unique)
- `companyName`: String (Indexed)
- `website`: String
- `industry`: String
- `headquarters`: String
- `contactPerson`: Object (`name`, `designation`, `phone`)
- `isApprovedByTPO`: Boolean (Default: false)

### 3.4 `job_drives` Collection
Placement and internship opportunities posted by recruiters or TPOs.
- `_id`: ObjectId
- `recruiterId`: ObjectId (Ref: `recruiter_profiles`, Indexed)
- `title`: String (e.g., "Software Development Engineer - 2026")
- `type`: Enum (`'full_time'`, `'internship'`, `'internship_plus_ppo'`)
- `description`: String
- `ctcOrStipend`: Object (`amount`: Number, `currency`: String, `breakup`: String)
- `location`: String
- `eligibilityCriteria`:
  - `allowedBranches`: Array of Strings
  - `minimumCgpa`: Number
  - `maxActiveBacklogs`: Number
  - `batchYear`: Number
- `applicationDeadline`: Date (Indexed)
- `driveDate`: Date
- `rounds`: Array of Objects (`roundNumber`: Number, `roundName`: String, `description`: String)
- `status`: Enum (`'draft'`, `'published'`, `'applications_closed'`, `'completed'`, `'cancelled'`)

### 3.5 `applications` Collection
Captures student applications to specific drives and tracking stages.
- `_id`: ObjectId
- `driveId`: ObjectId (Ref: `job_drives`, Compound Index with `studentId`)
- `studentId`: ObjectId (Ref: `student_profiles`, Compound Index with `driveId`)
- `status`: Enum (`'applied'`, `'shortlisted'`, `'in_interview'`, `'offered'`, `'accepted'`, `'rejected'`)
- `currentRound`: Number (Default: 1)
- `feedback`: String
- `appliedAt`: Date (Default: `Date.now`)

---

## 4. Indexing & Optimization Strategy

1. **Compound Unique Index on `applications`**:
   `{ driveId: 1, studentId: 1 }` with `{ unique: true }` prevents duplicate student submissions to the same drive.
2. **Eligibility Filtering Index on `student_profiles`**:
   `{ department: 1, cgpa: -1, activeBacklogs: 1 }` allows rapid evaluation and shortlisting of eligible candidates during drive broadcast.
3. **Deadline Index on `job_drives`**:
   `{ applicationDeadline: 1, status: 1 }` enables scheduled cron jobs to transition drives to `applications_closed`.
4. **Soft Deletes**:
   Critical entities utilize an `isDeleted: Boolean` flag combined with sparse partial filter indexes.
