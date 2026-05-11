# Respondents in Report Tracking System

## Overview

The Record Tracking System serves multiple user roles (respondents) in a municipal government workflow. Each role has specific dashboards, permissions, and workflow responsibilities. The system supports:

- **Clients**: Report submitters/trackers
- **Admins**: System managers and initial routers
- **Department Staff**: Office processors across 50+ departments

## 1. Clients

**Primary Role**: Submit reports and track progress through multi-department workflow.

**Key Features**:

- Submit reports with attachments
- Real-time tracking of report status
- View current handling department (e.g., \"Engineering Office\")
- Timeline of workflow steps (e.g., Step 4: Processing)
- Notifications for updates
- Dashboard: `ClientDashboard.js`

**Example Workflow View**:

```
Status: Processing
Handling Department: Engineering Office
Current Step: Step 4 - Being Processed
```

**API Access**: `/client/{userId}/reports`

## 2. Admins

**Primary Role**: Manage users, assign reports to workflow, monitor system-wide activity.

**Key Features**:

- Create/manage user accounts (staff, clients, departments)
- Assign reports to sequential department workflows
- View all reports across departments
- Stats: Total users, admins, growth
- User management (view/edit/delete)
- Dashboard: `AdminDashboard.js` with Sidebar, Navbar

**Example Stats Cards**:

```
👑 Active Admins: 5
👥 Total Users: 2,543
🟢 User Growth: +5%
```

**API Access**: `/admin/stats`, `/admin/users`, `/workflow/create`

## 3. Department Staff

**Primary Role**: Process reports assigned to their specific office/department.

**Key Features**:

- View pending reports for their department
- Mark as \"In Progress\", Approve, Reject, or Reassign
- See detailed workflow history
- Department-specific views: Pending/Processing/Completed
- 18 test staff accounts across 50 municipal departments (e.g., Budget Office, Accounting, Engineering)

**Example Departments**:

- Budget Office (ID:7)
- Accounting Office (ID:8)
- Treasurer Office (ID:5)
- Social Welfare Office

**API Access**:

- `GET /workflow/department/{id}/pending`
- `GET /workflow/department/{id}/processing`
- `PUT /workflow/approve/{route_id}`

## System Workflow

```
Client Submit → Admin Assign → Dept1 Process → Dept2 Review → ... → Completed
```

## User Roles Summary Table

| Role       | Dashboard       | Main Responsibility      | # Accounts (Test) |
| ---------- | --------------- | ------------------------ | ----------------- |
| Client     | ClientDashboard | Track own reports        | Multiple          |
| Admin      | AdminDashboard  | Assign & monitor         | Few               |
| Dept Staff | Dept/Staff Dash | Process assigned reports | 18 (50 Depts)     |

**Total Test Users**: 50+ departments, 18 staff, multiple clients/admins.

**Source**: Extracted from FLOWCHART.md, API_REFERENCE.md, IMPLEMENTATION_SUMMARY.md, MODERN_DASHBOARD_GUIDE.md, and route files.
