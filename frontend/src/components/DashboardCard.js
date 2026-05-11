import React from "react";
import "../styles/ModernDashboard.css";

export default function DashboardCard({
  title,
  value,
  subtitle,
  icon,
  change,
  changeType,
}) {
  return (
    <div className="dashboard-card animated">
      <div className="card-header">
        <h3 className="card-title">{title}</h3>
        <span className="card-icon">{icon}</span>
      </div>
      <div className="card-value">{value}</div>
      {subtitle && <div className="card-subtitle">{subtitle}</div>}
      {change && (
        <span className={`card-change ${changeType}`}>
          {changeType === "positive" ? "↑" : "↓"} {change}
        </span>
      )}
    </div>
  );
}
