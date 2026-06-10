# Database Inventory Report

## Overview
This report provides a comprehensive audit of the DGOS / InternalX backend database. 
*Note: The existing backend was discovered to be utilizing **MySQL** (via `mysql2`), not SQLite as initially presumed.*

## 1. Authentication & RBAC Module
**`ventures`**
- Purpose: Stores company ventures/subsidiaries.
- PK: `id` (SERIAL)
- Indexes/Unique: `slug` (UNIQUE)

**`access_levels`**
- Purpose: Defines system-wide access hierarchies (1=Super Admin, 9=Client).
- PK: `id` (SERIAL)
- Indexes/Unique: `level_number` (UNIQUE)

**`users`**
- Purpose: Core user authentication and profile data.
- PK: `id` (SERIAL)
- FKs: `access_level` -> access_levels(level_number), `venture_id` -> ventures(id)
- Indexes/Unique: `employee_id` (UNIQUE), `email` (UNIQUE)
- Key Fields: `password_hash`, `otp`, `reset_password_token`, `notification_preferences` (JSONB)

**`sessions`**
- Purpose: Stores active user sessions/tokens.
- PK: `id` (SERIAL)
- FKs: `user_id` -> users(id)

**`venture_roles`** & **`venture_role_assignments`**
- Purpose: Custom RBAC extension per venture.
- FKs: `venture_id`, `user_id`, `role_id`

## 2. Project Management Module
**`projects`**
- Purpose: Core projects container.
- PK: `id` (SERIAL)
- FKs: `venture_id` -> ventures, `created_by` -> users
- Key Fields: `status`, `priority`, `budget`, `tags` (JSONB)

**`project_members`**
- Purpose: Associates users to projects with roles.
- PK: `id` (SERIAL)
- FKs: `project_id` -> projects, `user_id` -> users
- Unique: `(project_id, user_id)`

**`project_milestones`**
- Purpose: Project roadmap milestones.
- FKs: `project_id` -> projects

## 3. Task & Time Management Module
**`tasks`**
- Purpose: Individual work items.
- PK: `id` (SERIAL)
- FKs: `assigned_to` -> users, `assigned_by` -> users, `venture_id` -> ventures, `project_id` -> projects, `parent_task_id` -> tasks
- Key Fields: `status`, `priority`, `due_date`

**`timesheets`**
- Purpose: User time logging against tasks/projects.
- PK: `id` (SERIAL)
- FKs: `user_id`, `task_id`, `project_id`, `venture_id`, `approved_by`

## 4. Learning Module
**`learning_checklist_items`**
- Purpose: Learning hub syllabus items.
- FK: `venture_id`

**`learning_intern_progress`**
- Purpose: Tracking user progress on checklists.
- FKs: `user_id`, `checklist_item_id`
- Unique: `(user_id, checklist_item_id)`

**`learning_resources`** & **`learning_feedback`**
- Purpose: Learning material and performance reviews.

## 5. Analytics & Strategy Module
**`okrs`**, **`key_results`**, **`strategic_risks`**
- Purpose: Organization objectives, tracking and risk management.
- FKs: `venture_id`, `okr_id`

## 6. Communication & Notifications Module
**`notifications`**
- Purpose: System and user notifications.
- FKs: `user_id` -> users

**`messages`**
- Purpose: Internal chat/messaging.
- FKs: `sender_id`, `receiver_id`, `venture_id`

**`announcements`**
- Purpose: Global or venture-wide announcements.

## 7. Documents Module
**`documents`**
- Purpose: File storage metadata.
- FKs: `venture_id`, `project_id`, `uploaded_by`

## 8. Audit Module
**`audit_logs`**
- Purpose: System activity logging.
- FKs: `user_id`
- Key Fields: `action_type`, `entity_type`, `entity_id`

## Data Volume Analysis
**Current State:** 
The platform is in the initial development/seeding stage. Row counts are extremely low (Seed data: 4 ventures, 9 access levels, 30+ dummy users).
**Expected Growth:**
For 30-50 users:
- `tasks`, `timesheets`, and `messages` will grow most rapidly. 
- Expected monthly generation: 1,500 tasks, 1,000 timesheets, 5,000+ messages.
- With SaaS scaling, horizontal partitioning on `messages` and `audit_logs` might become necessary. PostgreSQL handles millions of rows effortlessly with proper indexing.
