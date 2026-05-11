import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ModernDashboard.css";

export default function ModernSidebar() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const role = localStorage.getItem("role") || "user";
  const userName = localStorage.getItem("name") || "User";
  const userEmail = localStorage.getItem("email") || "";

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const closeSidebar = () => {
    setIsOpen(false);
  };

  const navigationItems = [
    { id: "dashboard", label: "Dashboard", icon: "📊", path: "/dashboard" },
    { id: "users", label: "Users", icon: "👥", path: "/users" },
    { id: "reports", label: "Records", icon: "📄", path: "/reports" },
    { id: "analytics", label: "Analytics", icon: "📈", path: "/analytics" },
    { id: "settings", label: "Settings", icon: "⚙️", path: "/settings" },
  ];

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 998,
          }}
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`modern-sidebar ${isOpen ? "active" : ""}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">📊</span>
          <span className="sidebar-logo-text">Dashboard</span>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navigationItems.map((item) => (
            <li key={item.id} className="sidebar-nav-item">
              <a
                href={item.path}
                className="sidebar-nav-link"
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.path);
                  closeSidebar();
                }}
              >
                <span className="sidebar-nav-icon">{item.icon}</span>
                <span className="sidebar-nav-text">{item.label}</span>
              </a>
            </li>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user-info">
            <div className="sidebar-user-role">
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </div>
            <div className="sidebar-user-email">{userEmail || userName}</div>
          </div>
          <button className="sidebar-logout-btn" onClick={handleLogout}>
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Hamburger Button for Mobile */}
      <button
        className="hamburger-btn"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "fixed",
          left: "16px",
          top: "16px",
          zIndex: 1002,
          display: "none",
        }}
        id="hamburger-toggle"
      >
        {isOpen ? "✕" : "☰"}
      </button>
    </>
  );
}
