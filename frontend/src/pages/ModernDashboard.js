import React, { useState } from "react";
import ModernSidebar from "../components/ModernSidebar";
import ModernNavbar from "../components/ModernNavbar";
import DashboardCard from "../components/DashboardCard";
import DataTable from "../components/DataTable";
import "../styles/ModernDashboard.css";

export default function ModernDashboard() {
  const [sampleData] = useState([
    {
      id: 1,
      name: "John Smith",
      email: "john@example.com",
      status: "active",
      date: "2024-01-15",
      amount: "$2,450",
    },
    {
      id: 2,
      name: "Sophia Davis",
      email: "sophia@example.com",
      status: "pending",
      date: "2024-01-16",
      amount: "$1,890",
    },
    {
      id: 3,
      name: "Michael Brown",
      email: "michael@example.com",
      status: "active",
      date: "2024-01-17",
      amount: "$3,210",
    },
    {
      id: 4,
      name: "Emily Wilson",
      email: "emily@example.com",
      status: "inactive",
      date: "2024-01-18",
      amount: "$1,540",
    },
    {
      id: 5,
      name: "David Anderson",
      email: "david@example.com",
      status: "active",
      date: "2024-01-19",
      amount: "$2,890",
    },
  ]);

  const handleTableAction = (action, row) => {
    console.log(`Action: ${action}, Row:`, row);
    // Add your action handlers here
  };

  const statusBadgeRender = (status) => {
    const badgeClass =
      status === "active"
        ? "badge-success"
        : status === "pending"
          ? "badge-warning"
          : "badge-danger";
    return <span className={`table-badge ${badgeClass}`}>{status}</span>;
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <ModernSidebar />

      {/* Main Content */}
      <div className="dashboard-wrapper">
        {/* Navbar */}
        <ModernNavbar />

        {/* Page Content */}
        <main className="page-content">
          {/* Dashboard Cards Section */}
          <div className="dashboard-grid">
            <DashboardCard
              title="Total Users"
              value="2,543"
              subtitle="Active users"
              icon="👥"
              change="12.5%"
              changeType="positive"
            />
            <DashboardCard
              title="Total Records"
              value="1,204"
              subtitle="This month"
              icon="📄"
              change="8.2%"
              changeType="positive"
            />
            <DashboardCard
              title="Revenue"
              value="$45,231"
              subtitle="Total earnings"
              icon="💰"
              change="5.1%"
              changeType="positive"
            />
            <DashboardCard
              title="Activity"
              value="3,842"
              subtitle="User interactions"
              icon="📈"
              change="2.3%"
              changeType="negative"
            />
          </div>

          {/* Data Table Section */}
          <DataTable
            title="Recent Users"
            columns={[
              { key: "id", label: "ID" },
              { key: "name", label: "Name" },
              { key: "email", label: "Email" },
              { key: "date", label: "Join Date" },
              {
                key: "status",
                label: "Status",
                render: statusBadgeRender,
              },
              { key: "amount", label: "Amount" },
            ]}
            data={sampleData}
            actions={[
              { id: "view", label: "View" },
              { id: "edit", label: "Edit" },
              { id: "delete", label: "Delete" },
            ]}
            onAction={handleTableAction}
          />

          {/* Additional Content Section */}
          <div style={{ marginTop: "32px" }}>
            <div className="section-header">
              <h2 className="section-title">Quick Actions</h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "16px",
              }}
            >
              <div
                className="modern-table-wrapper"
                style={{
                  padding: "20px",
                  textAlign: "center",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>➕</div>
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    margin: "0",
                    color: "var(--text-primary)",
                  }}
                >
                  Create Record
                </h3>
              </div>

              <div
                className="modern-table-wrapper"
                style={{
                  padding: "20px",
                  textAlign: "center",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>📊</div>
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    margin: "0",
                    color: "var(--text-primary)",
                  }}
                >
                  View Analytics
                </h3>
              </div>

              <div
                className="modern-table-wrapper"
                style={{
                  padding: "20px",
                  textAlign: "center",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>👥</div>
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    margin: "0",
                    color: "var(--text-primary)",
                  }}
                >
                  Manage Users
                </h3>
              </div>

              <div
                className="modern-table-wrapper"
                style={{
                  padding: "20px",
                  textAlign: "center",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>⚙️</div>
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    margin: "0",
                    color: "var(--text-primary)",
                  }}
                >
                  Settings
                </h3>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile menu toggle styles */}
      <style>{`
        @media (max-width: 768px) {
          #hamburger-btn {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
}
