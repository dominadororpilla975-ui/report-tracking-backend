# Modern Dashboard - Implementation Guide

## Quick Start

### 1. View the Demo

Navigate to: `http://localhost:3000/modern-dashboard`

### 2. Copy to Your Dashboard Pages

Update your existing dashboard pages (AdminDashboard, ClientDashboard, StaffDashboard, DepartmentDashboard) to use the modern design.

---

## Example: Converting AdminDashboard to Modern Design

### Before (Current Bootstrap-based):

```javascript
// Current AdminDashboard.js uses React-Bootstrap
import { Container, Row, Col } from "react-bootstrap";

export default function AdminDashboard() {
  return (
    <>
      <AppNavbar role="admin" />
      <Container fluid>
        <Row>
          <Col md={2}>
            <Sidebar role="admin" />
          </Col>
          <Col md={10}>{/* Admin content */}</Col>
        </Row>
      </Container>
    </>
  );
}
```

### After (Modern Design):

```javascript
import ModernSidebar from "../components/ModernSidebar";
import ModernNavbar from "../components/ModernNavbar";
import DashboardCard from "../components/DashboardCard";
import DataTable from "../components/DataTable";
import "../styles/ModernDashboard.css";

export default function AdminDashboard() {
  return (
    <div className="dashboard-container">
      <ModernSidebar />
      <div className="dashboard-wrapper">
        <ModernNavbar />
        <main className="page-content">
          {/* Admin-specific content here */}
        </main>
      </div>
    </div>
  );
}
```

---

## Component Integration Examples

### Example 1: Admin Dashboard with User Management

```javascript
import React, { useState, useEffect } from "react";
import ModernSidebar from "../components/ModernSidebar";
import ModernNavbar from "../components/ModernNavbar";
import DashboardCard from "../components/DashboardCard";
import DataTable from "../components/DataTable";
import API from "../services/api";
import "../styles/ModernDashboard.css";

export default function AdminDashboard() {
  const [admins, setAdmins] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch admin stats and users
      const statsRes = await API.get("/admin/stats");
      const adminsRes = await API.get("/admin/users");
      setStats(statsRes.data);
      setAdmins(adminsRes.data);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = (action, user) => {
    switch (action) {
      case "view":
        console.log("View user:", user);
        break;
      case "edit":
        console.log("Edit user:", user);
        break;
      case "delete":
        if (window.confirm(`Delete ${user.name}?`)) {
          // Delete logic
        }
        break;
      default:
        break;
    }
  };

  return (
    <div className="dashboard-container">
      <ModernSidebar />
      <div className="dashboard-wrapper">
        <ModernNavbar />
        <main className="page-content">
          {/* Stats Cards */}
          <div className="dashboard-grid">
            <DashboardCard
              title="Total Admins"
              value={stats?.totalAdmins || "0"}
              subtitle="Active administrators"
              icon="👑"
              change="3 new"
              changeType="positive"
            />
            <DashboardCard
              title="Total Users"
              value={stats?.totalUsers || "0"}
              subtitle="All registered users"
              icon="👥"
              change={stats?.userGrowth || "0%"}
              changeType="positive"
            />
            <DashboardCard
              title="Total Reports"
              value={stats?.totalReports || "0"}
              subtitle="System wide"
              icon="📄"
              change={stats?.reportChange || "0%"}
              changeType="positive"
            />
            <DashboardCard
              title="Active Sessions"
              value={stats?.activeSessions || "0"}
              subtitle="Currently online"
              icon="🟢"
              change="5 users"
              changeType="positive"
            />
          </div>

          {/* Users Table */}
          {!loading && (
            <DataTable
              title="System Users"
              columns={[
                { key: "id", label: "ID" },
                { key: "name", label: "Name" },
                { key: "email", label: "Email" },
                { key: "role", label: "Role" },
                {
                  key: "status",
                  label: "Status",
                  render: (status) => (
                    <span
                      className={`table-badge ${status === "active" ? "badge-success" : "badge-danger"}`}
                    >
                      {status}
                    </span>
                  ),
                },
                { key: "joinDate", label: "Join Date" },
              ]}
              data={admins}
              actions={[
                { id: "view", label: "View" },
                { id: "edit", label: "Edit" },
                { id: "delete", label: "Delete" },
              ]}
              onAction={handleUserAction}
            />
          )}
        </main>
      </div>
    </div>
  );
}
```

---

### Example 2: Client Dashboard with Reports

```javascript
import React, { useState, useEffect } from "react";
import ModernSidebar from "../components/ModernSidebar";
import ModernNavbar from "../components/ModernNavbar";
import DashboardCard from "../components/DashboardCard";
import "../styles/ModernDashboard.css";

export default function ClientDashboard() {
  const [reports, setReports] = useState([]);
  const userId = localStorage.getItem("userId");

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      // Fetch client's reports
      const res = await API.get(`/client/${userId}/reports`);
      setReports(res.data);
    } catch (err) {
      console.error("Error:", err);
    }
  };

  return (
    <div className="dashboard-container">
      <ModernSidebar />
      <div className="dashboard-wrapper">
        <ModernNavbar />
        <main className="page-content">
          {/* Dashboard Cards */}
          <div className="dashboard-grid">
            <DashboardCard
              title="Active Reports"
              value={reports.filter((r) => r.status === "active").length}
              subtitle="Reports in progress"
              icon="📊"
              change={reports.length}
              changeType="positive"
            />
            <DashboardCard
              title="Completed"
              value={reports.filter((r) => r.status === "completed").length}
              subtitle="Finished reports"
              icon="✅"
              change="100%"
              changeType="positive"
            />
            <DashboardCard
              title="Pending"
              value={reports.filter((r) => r.status === "pending").length}
              subtitle="Awaiting review"
              icon="⏳"
              change="3 reports"
              changeType="negative"
            />
            <DashboardCard
              title="Total Submissions"
              value={reports.length}
              subtitle="All time"
              icon="📁"
              change="12 this month"
              changeType="positive"
            />
          </div>

          {/* Create Report Section */}
          <div className="section-header" style={{ marginBottom: "24px" }}>
            <h2 className="section-title">Submit New Report</h2>
          </div>

          <div
            style={{
              background: "#f8f9fa",
              padding: "32px",
              borderRadius: "12px",
              marginBottom: "32px",
            }}
          >
            <form onSubmit={handleCreateReport}>
              <div className="form-group">
                <label className="form-label">Report Title</label>
                <input type="text" className="form-input" required />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" required></textarea>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <button type="submit" className="btn btn-primary">
                  Submit Report
                </button>
                <button type="reset" className="btn btn-secondary">
                  Clear
                </button>
              </div>
            </form>
          </div>

          {/* Recent Reports List */}
          <div className="section-header">
            <h2 className="section-title">Your Latest Reports</h2>
          </div>

          <div className="modern-table-wrapper">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.slice(0, 5).map((report) => (
                  <tr key={report.id}>
                    <td>{report.title}</td>
                    <td>{new Date(report.date).toLocaleDateString()}</td>
                    <td>
                      <span className={`table-badge badge-${report.status}`}>
                        {report.status}
                      </span>
                    </td>
                    <td>
                      <button className="table-action-btn">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}
```

---

### Example 3: Staff Dashboard with Task Assignment

```javascript
import React, { useState } from "react";
import ModernSidebar from "../components/ModernSidebar";
import ModernNavbar from "../components/ModernNavbar";
import DashboardCard from "../components/DashboardCard";
import DataTable from "../components/DataTable";
import "../styles/ModernDashboard.css";

export default function StaffDashboard() {
  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: "Review Report #101",
      priority: "high",
      status: "in-progress",
      dueDate: "2024-01-25",
    },
    {
      id: 2,
      title: "Process Submission #205",
      priority: "medium",
      status: "pending",
      dueDate: "2024-01-26",
    },
    {
      id: 3,
      title: "Update Database",
      priority: "low",
      status: "pending",
      dueDate: "2024-01-28",
    },
  ]);

  return (
    <div className="dashboard-container">
      <ModernSidebar />
      <div className="dashboard-wrapper">
        <ModernNavbar />
        <main className="page-content">
          {/* Dashboard Metrics */}
          <div className="dashboard-grid">
            <DashboardCard
              title="Assigned Tasks"
              value="7"
              subtitle="Tasks to complete"
              icon="📋"
              change="2 new"
              changeType="positive"
            />
            <DashboardCard
              title="In Progress"
              value="3"
              subtitle="Currently working"
              icon="⚙️"
              change="1 completed today"
              changeType="positive"
            />
            <DashboardCard
              title="Completed"
              value="24"
              subtitle="This month"
              icon="✅"
              change="95%"
              changeType="positive"
            />
            <DashboardCard
              title="Pending Review"
              value="2"
              subtitle="Awaiting approval"
              icon="👀"
              change="0 overdue"
              changeType="positive"
            />
          </div>

          {/* Tasks Table */}
          <DataTable
            title="Your Tasks"
            columns={[
              { key: "id", label: "ID" },
              { key: "title", label: "Task Title" },
              {
                key: "priority",
                label: "Priority",
                render: (priority) => (
                  <span
                    className={`table-badge ${
                      priority === "high"
                        ? "badge-danger"
                        : priority === "medium"
                          ? "badge-warning"
                          : "badge-info"
                    }`}
                  >
                    {priority}
                  </span>
                ),
              },
              {
                key: "status",
                label: "Status",
                render: (status) => (
                  <span
                    className={`table-badge ${
                      status === "completed"
                        ? "badge-success"
                        : status === "in-progress"
                          ? "badge-info"
                          : "badge-warning"
                    }`}
                  >
                    {status}
                  </span>
                ),
              },
              { key: "dueDate", label: "Due Date" },
            ]}
            data={tasks}
            actions={[
              { id: "start", label: "Start" },
              { id: "complete", label: "Complete" },
            ]}
            onAction={(action, task) => console.log(`${action}:`, task)}
          />
        </main>
      </div>
    </div>
  );
}
```

---

## Styling Tips

### 1. Custom Card Styling

```javascript
<DashboardCard title="Custom Metric" value="999" icon="📊" />
```

### 2. Custom Badge Colors

Add to your CSS:

```css
.badge-custom {
  background-color: #e7f3ff;
  color: #0066cc;
}
```

### 3. Form Integration

```javascript
<div className="form-group">
  <label className="form-label">Field Label</label>
  <input type="text" className="form-input" />
</div>
```

### 4. Button Variations

```javascript
<button className="btn btn-primary">Primary</button>
<button className="btn btn-secondary">Secondary</button>
<button className="btn btn-outline">Outline</button>
<button className="btn btn-sm">Small</button>
<button className="btn btn-lg">Large</button>
```

---

## Navigation Structure

The ModernSidebar includes these default navigation items:

- Dashboard (📊)
- Users (👥)
- Reports (📄)
- Analytics (📈)
- Settings (⚙️)

### Customize Navigation Items

Edit `ModernSidebar.js` to add/remove items:

```javascript
const navigationItems = [
  { id: "dashboard", label: "Dashboard", icon: "📊", path: "/dashboard" },
  { id: "custom", label: "Custom Page", icon: "🎯", path: "/custom" },
  // Add more items...
];
```

---

## Advanced Usage

### 1. Loading State

```javascript
{
  loading ? (
    <div className="flex-center" style={{ minHeight: "200px" }}>
      Loading...
    </div>
  ) : (
    <DataTable {...props} />
  );
}
```

### 2. Error Handling

```javascript
try {
  // Fetch data
} catch (err) {
  return (
    <div style={{ padding: "20px", color: "#d32f2f" }}>Error loading data</div>
  );
}
```

### 3. Conditional Rendering

```javascript
{
  role === "admin" && (
    <DashboardCard title="Admin Stats" value="123" icon="👑" />
  );
}
```

### 4. API Integration

```javascript
useEffect(() => {
  fetchData();
}, []);

const fetchData = async () => {
  try {
    const res = await API.get("/endpoint");
    setData(res.data);
  } catch (err) {
    console.error("Error:", err);
  }
};
```

---

## Responsive Testing Checklist

- [ ] Desktop view (1024px+)
- [ ] Tablet view (768px - 1024px)
- [ ] Mobile view (480px - 768px)
- [ ] Small mobile (< 480px)
- [ ] Sidebar hamburger menu works
- [ ] Tables scroll properly on mobile
- [ ] Buttons are clickable on touch
- [ ] Search input is functional
- [ ] Navigation links work
- [ ] Profile dropdown is accessible

---

## Performance Tips

1. **Memoize Components**

   ```javascript
   export default React.memo(DashboardCard);
   ```

2. **Lazy Load Images**

   ```javascript
   <img loading="lazy" src="image.png" />
   ```

3. **Use useCallback for Functions**

   ```javascript
   const handleAction = useCallback((action, row) => {
     // handler
   }, []);
   ```

4. **Optimize Data Table Rendering**
   ```javascript
   // Only render visible rows
   const visibleRows = data.slice(0, 10);
   ```

---

## Troubleshooting

### Issue: Sidebar overlaps content on mobile

**Solution:** Ensure `display: flex` on hamburger button in media queries

### Issue: Search input disappears

**Solution:** It's hidden on tablet by default. In `ModernNavbar.js`, remove `d-none` class on smaller screens

### Issue: Table colors not showing

**Solution:** Check React/JSX className rendering. Use `className` not `class`

### Issue: Scrollbar shows on page

**Solution:** Adjust padding/height constraints or use `overflow: hidden` on body

---

## File Checklist

- [x] `ModernDashboard.css` - Complete styling
- [x] `ModernSidebar.js` - Sidebar component
- [x] `ModernNavbar.js` - Navbar component
- [x] `DashboardCard.js` - Card component
- [x] `DataTable.js` - Table component
- [x] `ModernDashboard.js` - Demo page
- [x] Updated `App.js` with new route

---

## Next Steps

1. Replace your existing dashboard pages with modern components
2. Update color palette if needed
3. Add real data from your API
4. Test on multiple devices
5. Customize icons/logos
6. Implement search functionality
7. Add form validation
8. Set up error handling

---

**For questions or customization, refer to `MODERN_DASHBOARD_GUIDE.md`**
