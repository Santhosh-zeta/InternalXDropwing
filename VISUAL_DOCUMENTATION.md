# 📸 InternalX — Visual Documentation & UI Wireframes

Welcome to the definitive visual guide for **InternalX**. This document serves as the official product manual, detailing the role-specific dashboards, workflows, and the underlying React components that power them.

Our design philosophy embraces **Glassmorphism**, a **Premium Dark Theme**, and **Venture-Aware Accents** to provide an enterprise-grade experience.

---

## 📑 Table of Contents

- [Authentication](#-authentication)
- [The 9-Tier Access Dashboard Gallery](#-the-9-tier-access-dashboard-gallery)
  - [Level 1: Super Admin](#level-1-super-admin)
  - [Level 2: Managing Director](#level-2-managing-director)
  - [Level 3: Admin](#level-3-admin)
  - [Level 4: CXO](#level-4-cxo)
  - [Level 5: Manager](#level-5-manager)
  - [Level 6: Executive Staff](#level-6-executive-staff)
  - [Level 7: Staff](#level-7-staff)
  - [Level 8: Intern](#level-8-intern)
  - [Level 9: Client](#level-9-client)

---

## 🔒 Authentication

The entry point to InternalX features secure, multi-tenant authentication with Two-Factor Authentication (OTP).

### Login Screen
**Purpose:** Secure entry for all 9 access levels across 4 ventures.
- **Code Mapping:** `app/page.tsx`, `components/auth/LoginForm.tsx`
- **Key Elements:** 
  - **Quick Access Grid**: Allows testing all roles quickly (represented by colored dots matching venture brands: Purple, Cyan, Amber, Green).
  - **Glassmorphism Form**: Floating glass panel on a deep dark background.
  - **Interaction**: A radial gradient spotlight follows the user's cursor.

<div align="center">
  <img src="docs/images/1.%20login%20screen.png" alt="Login Screen" width="80%" />
</div>

---

## 📊 The 9-Tier Access Dashboard Gallery

InternalX utilizes a highly dynamic Role-Based Access Control (RBAC) system. The dashboard dynamically renders different UI components, navigation items, and data aggregates depending on the user's Access Level (L1 - L9).

### Level 1: Super Admin
**Purpose:** Ultimate global oversight across all 4 ventures.
- **Code Mapping:** `app/dashboard/OverviewView.tsx`, `components/charts/CrossVentureChart.tsx`
- **UI Wireframe Details:**
  - **Sidebar:** Full access to all modules including **Access Control**, **Audit Logs**, and **Database**.
  - **Main View:** High-level metrics showing total active users, system health, and cross-venture performance.
  - **Theme:** Uses the global system accent (Violet `#8B5CF6`).

<div align="center">
  <img src="docs/images/2.%20Super%20Admin%20-%20Dashboard.png" alt="Super Admin Dashboard" width="90%" />
</div>

---

### Level 2: Managing Director
**Purpose:** Strategic oversight and financial tracking for Dropwing Groups.
- **Code Mapping:** `app/dashboard/StrategyView.tsx`, `app/dashboard/BudgetView.tsx`
- **UI Wireframe Details:**
  - **Sidebar:** Focuses on **Strategy**, **HR Overview**, and **Budget / Financials**.
  - **Main View:** Aggregates revenue, burn rates, and department KPIs across all ventures.

<div align="center">
  <img src="docs/images/3.%20Managing%20Director%20-%20Dashboard.png" alt="Managing Director Dashboard" width="90%" />
</div>

---

### Level 3: Admin
**Purpose:** Full operational control scoped to a *single* venture.
- **Code Mapping:** `app/dashboard/UserManagementView.tsx`, `app/dashboard/ProjectsView.tsx`
- **UI Wireframe Details:**
  - **Sidebar:** Includes **User Management** and **Invoices**, scoped to their specific venture.
  - **Main View:** Venture-specific metrics, team onboarding, and active client projects.
  - **Theme:** Adapts to venture color (e.g., Cyan for Fenixa Solutions, Amber for PerSyniX).

<div align="center">
  <img src="docs/images/4.%20Admin%20-%20Dashboard.png" alt="Admin Dashboard" width="90%" />
</div>

---

### Level 4: CXO
**Purpose:** C-Suite dashboard for department KPIs and team management.
- **Code Mapping:** `app/dashboard/DepartmentKPIsView.tsx`, `components/kpis/OKRTracker.tsx`
- **UI Wireframe Details:**
  - **Sidebar:** Highlights **Department KPIs**, **Team Management**, and **Budget**.
  - **Main View:** OKR tracking, headcount stats, and team velocity charts.

<div align="center">
  <img src="docs/images/5.%20CXO%20-%20Dashboard.png" alt="CXO Dashboard" width="90%" />
</div>

---

### Level 5: Manager
**Purpose:** Tactical team and project management within a venture.
- **Code Mapping:** `app/dashboard/TasksView.tsx`, `components/tasks/KanbanBoard.tsx`
- **UI Wireframe Details:**
  - **Sidebar:** Focuses on **Projects**, **Tasks**, and **Reports**.
  - **Main View:** Interactive Kanban boards, task completion rates, and upcoming deadlines for their team.

<div align="center">
  <img src="docs/images/6.%20Manager%20-%20Dashboard.png" alt="Manager Dashboard" width="90%" />
</div>

---

### Level 6: Executive Staff
**Purpose:** Advanced execution, handling critical projects and timesheets.
- **Code Mapping:** `app/dashboard/TimesheetsView.tsx`, `components/documents/VaultBrowser.tsx`
- **UI Wireframe Details:**
  - **Sidebar:** Access to **Timesheets**, **Documents (Vault)**, and **Tasks**.
  - **Main View:** Personal task queue, document uploads, and weekly timesheet grid.

<div align="center">
  <img src="docs/images/7.%20Executive%20staff%20-%20Dashboard.png" alt="Executive Staff Dashboard" width="90%" />
</div>

---

### Level 7: Staff
**Purpose:** Standard task execution and team collaboration.
- **Code Mapping:** `app/dashboard/TasksView.tsx`, `app/dashboard/ChatView.tsx`
- **UI Wireframe Details:**
  - **Sidebar:** Streamlined view showing **My Tasks**, **Messages (Team Chat)**, and **Timesheets**.
  - **Main View:** Daily to-do lists, assigned tickets, and real-time WebSocket chat.

<div align="center">
  <img src="docs/images/8.%20Staff%20-%20Dashboard.png" alt="Staff Dashboard" width="90%" />
</div>

---

### Level 8: Intern
**Purpose:** Focused onboarding, learning, and basic task execution.
- **Code Mapping:** `app/dashboard/LearningHubView.tsx`, `components/learning/Checklist.tsx`
- **UI Wireframe Details:**
  - **Sidebar:** Dedicated **Learning Hub**, restricted access to broader projects.
  - **Main View:** Interactive onboarding checklists, resource library, and manager feedback cards.

<div align="center">
  <img src="docs/images/9.%20Intern%20-%20Dashboard.png" alt="Intern Dashboard" width="90%" />
</div>

---

### Level 9: Client
**Purpose:** Read-only portal for external stakeholders to track their deliverables.
- **Code Mapping:** `app/dashboard/ClientPortalView.tsx`, `components/invoices/InvoiceList.tsx`
- **UI Wireframe Details:**
  - **Sidebar:** Minimalist menu: **Client Portal**, **Invoices**, and **Messages**.
  - **Main View:** Project timelines, downloadable deliverables, and invoice payment statuses. Absolutely no access to internal HR or financial data.

<div align="center">
  <img src="docs/images/10.%20Client%20-%20Dashboard.png" alt="Client Dashboard" width="90%" />
</div>

---

*This document maps the visual architecture of the 9-tier system. For underlying API documentation and database schemas, refer to the [README.md](./README.md).*
