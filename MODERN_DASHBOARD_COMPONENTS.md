# Modern Dashboard - Component Showcase & Style Reference

## Color System

### Primary Colors

```
Background: #ffffff (white)
Text Primary: #000000 (black)
Text Secondary: #555555 (dark gray)
Text Tertiary: #888888 (medium gray)
Border: #e0e0e0 (light gray)
Light Background: #f8f9fa (off-white)
```

### Status Colors

```
Success: #155724 (text) on #d4edda (bg)
Warning: #856404 (text) on #fff3cd (bg)
Danger: #721c24 (text) on #f8d7da (bg)
Info: #0c5460 (text) on #d1ecf1 (bg)
```

### Shadow System

```
Small:  0 2px 8px rgba(0, 0, 0, 0.08)
Medium: 0 4px 12px rgba(0, 0, 0, 0.1)
Large:  0 8px 24px rgba(0, 0, 0, 0.12)
```

---

## Typography

### Font Stack

```
-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue'
```

### Font Sizes

```
32px - Card Values (Large)
28px - Card Values (Tablet)
24px - Card Values (Mobile)
20px - Page Title
18px - Section Title
16px - Logo/Heading
15px - Button Large
14px - Body Text, Card Title
13px - Navbar Profile, Small Body
12px - Table Text, Labels, Badges
11px - Extra Small, Mobile Table
```

### Font Weights

```
400 - Regular
500 - Medium
600 - Semibold
700 - Bold
```

---

## Layout Dimensions

### Spacing

```
Base Unit: 4px
4px, 8px, 12px, 16px, 20px, 24px, 32px
```

### Sidebar

```
Width: 260px (Desktop)
Width: 220px (Tablet)
Width: 0 (Mobile - Hamburger)
Height: 100vh
```

### Navbar

```
Height: 70px (Desktop/Tablet)
Height: 60px (Mobile)
```

### Border Radius

```
6px  - Small (badges, inputs)
8px  - Medium (buttons, inputs)
10px - Default
12px - Large (cards, tables)
16px - Extra Large
50% - Circular (avatars)
```

---

## Components

### 1. Dashboard Card

**File:** `DashboardCard.js`

**Props:**

```javascript
{
  title: "Total Users",        // Required
  value: "2,543",             // Required
  subtitle: "Active users",   // Optional
  icon: "👥",               // Required
  change: "12.5%",           // Optional
  changeType: "positive"      // Optional: "positive" | "negative"
}
```

**Styles:**

- Padding: 24px (20px tablet)
- Border: 1px solid #e0e0e0
- Border Radius: 12px
- Box Shadow: small
- Hover: shadow-md + translateY(-2px)

**Example:**

```javascript
<DashboardCard
  title="Total Users"
  value="2,543"
  subtitle="Active users"
  icon="👥"
  change="12.5%"
  changeType="positive"
/>

<DashboardCard
  title="Errors"
  value="42"
  icon="❌"
  change="5.2%"
  changeType="negative"
/>
```

---

### 2. Data Table

**File:** `DataTable.js`

**Props:**

```javascript
{
  title: "Recent Users",      // Required
  columns: [                  // Required
    {
      key: "id",
      label: "ID"
    },
    {
      key: "name",
      label: "Name",
      render: (value) => <span>{value}</span>  // Optional custom render
    },
    {
      key: "status",
      label: "Status",
      render: (status) => (
        <span className="table-badge badge-success">{status}</span>
      )
    }
  ],
  data: [                     // Required
    { id: 1, name: "John", status: "Active" },
    { id: 2, name: "Jane", status: "Inactive" }
  ],
  actions: [                  // Optional
    { id: "view", label: "View" },
    { id: "edit", label: "Edit" },
    { id: "delete", label: "Delete" }
  ],
  onAction: (actionId, row) => {  // Optional
    console.log(actionId, row);
  }
}
```

**Styles:**

- Padding: 16px
- Border: 1px solid #e0e0e0
- Border Radius: 12px
- Row Hover: background #f8f9fa
- Header Background: #f8f9fa

**Example:**

```javascript
<DataTable
  title="Active Users"
  columns={[
    { key: "id", label: "ID" },
    { key: "email", label: "Email" },
    {
      key: "status",
      label: "Status",
      render: (status) => (
        <span className={`table-badge badge-${status}`}>{status}</span>
      ),
    },
  ]}
  data={users}
  actions={[
    { id: "view", label: "View" },
    { id: "edit", label: "Edit" },
  ]}
  onAction={handleAction}
/>
```

---

### 3. Modern Sidebar

**File:** `ModernSidebar.js`

**Features:**

- Logo section with icon
- Navigation items with hover/active states
- User info display
- Logout button
- Mobile hamburger menu
- Fixed positioning

**Navigation Item Structure:**

```javascript
{
  id: "dashboard",
  label: "Dashboard",
  icon: "📊",
  path: "/dashboard"
}
```

**Styles:**

- Width: 260px
- Background: #ffffff
- Border Right: 1px solid #e0e0e0
- Nav Item Padding: 12px 16px
- Active State: gray background + bold text + left border
- Logo Padding: 20px 16px

---

### 4. Modern Navbar

**File:** `ModernNavbar.js`

**Features:**

- Page title
- Search input (hidden on mobile)
- User profile section
- Hamburger menu button
- Responsive design

**Sections:**

```
[Left: Hamburger + Title] [Right: Search + Profile]
```

**Styles:**

- Height: 70px (60px mobile)
- Padding: 0 32px (0 16px mobile)
- Background: #ffffff
- Border Bottom: 1px solid #e0e0e0
- Box Shadow: small

---

## Button Styles

### Primary Button

```css
.btn-primary {
  background-color: #000000;
  color: #ffffff;
  border: none;
}

.btn-primary:hover {
  background-color: #333333;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
```

**Example:**

```javascript
<button className="btn btn-primary">
  ➕ Add User
</button>

<button className="btn btn-primary btn-sm">
  Save
</button>

<button className="btn btn-primary btn-lg">
  Create Report
</button>
```

### Secondary Button

```css
.btn-secondary {
  background-color: #f8f9fa;
  color: #000000;
  border: 1px solid #e0e0e0;
}

.btn-secondary:hover {
  background-color: #eeeeee;
  border-color: #555555;
}
```

**Example:**

```javascript
<button className="btn btn-secondary">Cancel</button>
```

### Outline Button

```css
.btn-outline {
  background-color: transparent;
  color: #000000;
  border: 1px solid #e0e0e0;
}

.btn-outline:hover {
  background-color: #f8f9fa;
  border-color: #000000;
}
```

**Example:**

```javascript
<button className="btn btn-outline">Learn More</button>
```

### Button Sizes

```javascript
<button className="btn btn-primary btn-sm">Small</button>      // 6px 12px
<button className="btn btn-primary">Normal</button>             // 10px 16px
<button className="btn btn-primary btn-lg">Large</button>       // 12px 20px
```

---

## Status Badges

### Badge Styles

```
.badge-success  → Green (#d4edda bg, #155724 text)
.badge-warning  → Yellow (#fff3cd bg, #856404 text)
.badge-danger   → Red (#f8d7da bg, #721c24 text)
.badge-info     → Blue (#d1ecf1 bg, #0c5460 text)
```

**Examples:**

```html
<span class="table-badge badge-success">Active</span>
<span class="table-badge badge-warning">Pending</span>
<span class="table-badge badge-danger">Inactive</span>
<span class="table-badge badge-info">Processing</span>
```

---

## Form Elements

### Form Group

```javascript
<div className="form-group">
  <label className="form-label">Field Label</label>
  <input type="text" className="form-input" />
</div>
```

**Styles:**

- Label: 14px, 500 weight, margin-bottom 6px
- Input Padding: 10px 12px
- Input Border: 1px solid #e0e0e0
- Input Border Radius: 8px
- Focus: border-color #000000, box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.05)

### Input Types

```javascript
<input type="text" className="form-input" placeholder="Text input" />
<input type="email" className="form-input" placeholder="Email" />
<input type="password" className="form-input" placeholder="Password" />
<select className="form-select">
  <option>Select an option</option>
</select>
<textarea className="form-textarea" placeholder="Message"></textarea>
```

---

## Layout Classes

### Container Classes

```javascript
<div className="dashboard-container">
  {" "}
  {/* Main layout */}
  <div className="dashboard-wrapper">
    {" "}
    {/* Sidebar + Content */}
    <div className="page-content"> {/* Scrollable content */}</div>
  </div>
</div>
```

### Grid Layouts

```javascript
// Dashboard Cards Grid
<div className="dashboard-grid">
  <DashboardCard ... />
  <DashboardCard ... />
</div>

// Custom Grid
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "24px" }}>
  {/* Items */}
</div>
```

### Section Header

```javascript
<div className="section-header">
  <h2 className="section-title">Section Title</h2>
  <div className="section-actions">
    <button className="btn btn-primary">Action</button>
  </div>
</div>
```

---

## Utility Classes

### Spacing

```
.mb-16  → margin-bottom: 16px
.mb-24  → margin-bottom: 24px
.mb-32  → margin-bottom: 32px
.mt-16  → margin-top: 16px
.mt-24  → margin-top: 24px
```

### Gaps

```
.gap-12  → gap: 12px
.gap-16  → gap: 16px
.gap-24  → gap: 24px
```

### Flexbox

```
.flex-center    → display: flex; align-items: center; justify-content: center;
.flex-between   → display: flex; align-items: center; justify-content: space-between;
```

### Text Colors

```
.text-primary    → color: #000000
.text-secondary  → color: #555555
.text-tertiary   → color: #888888
```

### Border Radius

```
.rounded-8   → border-radius: 8px
.rounded-12  → border-radius: 12px
```

### Shadows

```
.shadow-sm  → box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08)
.shadow-md  → box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1)
.shadow-lg  → box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12)
```

### Background

```
.bg-light  → background-color: #f8f9fa
```

---

## Responsive Breakpoints

### Desktop (1024px and above)

- Sidebar: 260px fixed
- Navbar: Full width
- Cards Grid: 4 columns
- Table: Full width
- Search: Visible

### Tablet (768px - 1024px)

- Sidebar: 220px fixed
- Navbar: Full width
- Cards Grid: Auto-fit (min 200px)
- Table: Scrollable
- Search: Visible (but smaller)
- Padding: Reduced

### Mobile (480px - 768px)

- Sidebar: Hamburger menu
- Navbar: Simple
- Cards Grid: 1 column
- Table: Reduced padding
- Search: Hidden
- Buttons: Full width in forms

### Small Mobile (< 480px)

- Sidebar: Hamburger menu
- Font Sizes: Reduced
- Padding: Minimal
- Cards: Stacked
- Profile Name: Hidden
- Table: Very compact

---

## Animation & Transitions

### Default Transition

```
--transition: all 0.3s ease
```

**Applied to:**

- Sidebar navigation items hover
- Dashboard cards hover
- Buttons hover
- Form inputs focus

### Hover Effects

```
Card Hover:       Shadow increase + translateY(-2px)
Nav Item Hover:   Background color change
Button Hover:     Shadow + color change
```

### Animation

```
.animated {
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## Accessibility Features

### Keyboard Navigation

- Tab through interactive elements
- Enter to activate buttons
- Escape to close modals
- Arrow keys for dropdowns

### WCAG Compliance

- WCAG AA contrast ratio (black on white: 21:1)
- Semantic HTML structure
- Proper heading hierarchy
- Alt text for images
- Form labels for inputs
- Focus indicators (border/shadow)

### Screen Reader Support

- Semantic HTML tags
- ARIA labels where needed
- Descriptive button text
- Table headers properly marked

---

## Code Examples

### Complete Dashboard Page

```javascript
import React, { useState, useEffect } from "react";
import ModernSidebar from "../components/ModernSidebar";
import ModernNavbar from "../components/ModernNavbar";
import DashboardCard from "../components/DashboardCard";
import DataTable from "../components/DataTable";
import "../styles/ModernDashboard.css";

export default function MyDashboard() {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/data");
      const result = await response.json();
      setData(result.data);
      setStats(result.stats);
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
          {/* Cards */}
          <div className="dashboard-grid">
            {Object.entries(stats || {}).map(([key, value]) => (
              <DashboardCard
                key={key}
                title={key.replace(/([A-Z])/g, " $1").toUpperCase()}
                value={value}
                icon="📊"
              />
            ))}
          </div>

          {/* Table */}
          <DataTable
            title="Data Table"
            columns={[
              { key: "id", label: "ID" },
              { key: "name", label: "Name" },
              { key: "email", label: "Email" },
            ]}
            data={data}
            actions={[
              { id: "view", label: "View" },
              { id: "edit", label: "Edit" },
            ]}
            onAction={(action, row) => console.log(action, row)}
          />
        </main>
      </div>
    </div>
  );
}
```

---

## Best Practices

1. **Always import CSS**

   ```javascript
   import "../styles/ModernDashboard.css";
   ```

2. **Use semantic HTML**

   ```jsx
   <header className="modern-navbar">
   <nav className="sidebar-nav">
   <main className="page-content">
   ```

3. **Leverage CSS variables**

   ```css
   color: var(--text-primary);
   box-shadow: var(--shadow-md);
   ```

4. **Use proper button types**

   ```jsx
   <button type="submit" className="btn btn-primary">
   <button type="reset" className="btn btn-secondary">
   <button type="button" className="btn btn-outline">
   ```

5. **Handle loading states**

   ```jsx
   {loading ? <LoadingSpinner /> : <DataTable ... />}
   ```

6. **Provide feedback**
   ```jsx
   {
     error && <div style={{ color: "#d32f2f" }}>Error message</div>;
   }
   {
     success && <div style={{ color: "#388e3c" }}>Success message</div>;
   }
   ```

---

## Performance Tips

1. Use `React.memo()` for expensive components
2. Debounce search inputs
3. Virtualize large tables
4. Lazy load images
5. Use `useCallback` for event handlers
6. Minimize CSS (production)
7. Use CSS custom properties for theming

---

## Customization Checklist

- [ ] Update color variables in `:root`
- [ ] Customize sidebar navigation items
- [ ] Replace emoji icons with proper icon library
- [ ] Add your logo
- [ ] Update company name
- [ ] Modify form fields
- [ ] Add API endpoints
- [ ] Test responsive design
- [ ] Set up error handling
- [ ] Add loading states

---

**Reference Version:** 1.0
**Last Updated:** April 2024
**Components:** 4 Main + CSS Framework
**Lines of Code:** 700+ CSS + 400+ React Components
