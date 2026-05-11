import React, { useState } from "react";
import { Nav, Button, Offcanvas, Navbar as BSNavbar } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

export default function Sidebar({ role }) {
  const navigate = useNavigate();
  const [showMobile, setShowMobile] = useState(false);
  const userName = localStorage.getItem("name") || "User";
  const userEmail = localStorage.getItem("email") || "";

  const effectiveRole =
    role ||
    localStorage.getItem("role") ||
    localStorage.getItem("userRole") ||
    "client";

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const navigateTo = (path, tab = null) => {
    if (tab) {
      navigate(`${path}?tab=${tab}`);
    } else {
      navigate(path);
    }
    setShowMobile(false);
  };

  const SidebarContent = ({ vertical = false }) => (
    <div className={`${vertical ? "" : "d-flex flex-column"} h-100`}>
      <BSNavbar.Brand className="fw-bold text-black mb-0">
        <span className="me-2">📋</span>
        Record Monitoring <br></br> and Tracking System
      </BSNavbar.Brand>

      {/* Role Display */}
      <div className="p-3 border-bottom bg-light">
        <h5 className="mb-0 text-primary">
          {effectiveRole === "admin" && "👑 Admin"}
          {effectiveRole === "department" && "🏛️ Department"}
          {effectiveRole === "staff" && "👤 Staff"}
          {effectiveRole === "client" && "👤 Client"}
        </h5>
        <div className="mt-2">
          <div className="fw-semibold text-dark">{userName}</div>
          {userEmail && <small className="text-muted">{userEmail}</small>}
        </div>
        {effectiveRole === "department" &&
          localStorage.getItem("departmentName") && (
            <small className="text-muted d-block">
              {localStorage.getItem("departmentName")}
            </small>
          )}
      </div>

      <Nav className={`flex-column ${vertical ? "" : "flex-grow-1"}`}>
        {/* Navigation links */}
        {/* ADMIN NAVIGATION */}
        {effectiveRole === "admin" && (
          <>
            <Nav.Link
              onClick={() => navigateTo("/admin-dashboard", "dashboard")}
              className="px-3 py-2"
            >
              📊 Dashboard
            </Nav.Link>
            <Nav.Link
              onClick={() => navigateTo("/admin-dashboard", "reports")}
              className="px-3 py-2"
            >
              📋 Records
            </Nav.Link>
            <Nav.Link
              onClick={() => navigateTo("/admin-dashboard", "departments")}
              className="px-3 py-2"
            >
              🏢 Departments
            </Nav.Link>
            <Nav.Link
              onClick={() => navigateTo("/admin-dashboard", "users")}
              className="px-3 py-2"
            >
              👥 Users
            </Nav.Link>
            <Nav.Link
              onClick={() => navigateTo("/admin-dashboard", "clients")}
              className="px-3 py-2"
            >
              👤 Clients
            </Nav.Link>
          </>
        )}

        {/* CLIENT NAVIGATION */}
        {effectiveRole === "client" && (
          <>
            <Nav.Link
              onClick={() => navigateTo("/client-dashboard", "dashboard")}
              className="px-3 py-2"
            >
              📊 Dashboard
            </Nav.Link>
            <Nav.Link
              onClick={() => navigateTo("/client-dashboard", "tracking")}
              className="px-3 py-2"
            >
              📍 View Records
            </Nav.Link>
            <Nav.Link
              onClick={() => navigateTo("/client-dashboard", "completed")}
              className="px-3 py-2"
            >
              ✅ Completed
            </Nav.Link>
          </>
        )}

        {/* DEPARTMENT NAVIGATION */}
        {effectiveRole === "department" && (
          <>
            <Nav.Link
              onClick={() => navigateTo("/department-dashboard", "pending")}
              className="px-3 py-2"
            >
              ⏳ Pending
            </Nav.Link>
            <Nav.Link
              onClick={() => navigateTo("/department-dashboard", "processing")}
              className="px-3 py-2"
            >
              🔄 Processing
            </Nav.Link>
            <Nav.Link
              onClick={() => navigateTo("/department-dashboard", "completed")}
              className="px-3 py-2"
            >
              ✅ Completed
            </Nav.Link>
            <Nav.Link
              onClick={() => navigateTo("/department-dashboard", "all")}
              className="px-3 py-2"
            >
              📋 All Records
            </Nav.Link>
          </>
        )}

        {/* STAFF NAVIGATION */}
        {effectiveRole === "staff" && (
          <Nav.Link
            onClick={() => navigate("/staff-dashboard")}
            className="px-3 py-2"
          >
            📋 Assigned Records
          </Nav.Link>
        )}

        <div className="mt-auto border-top">
          <Nav.Link
            onClick={() => {
              handleLogout();
              setShowMobile(false);
            }}
            className="px-3 py-2 text-danger mt-3"
          >
            🚪 Logout
          </Nav.Link>
        </div>
      </Nav>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle Button - visible only on small screens */}
      <div
        className="d-lg-none position-fixed"
        style={{ top: "10px", left: "10px", zIndex: 1040 }}
      >
        <Button
          variant="dark"
          onClick={() => setShowMobile(true)}
          style={{ borderRadius: "50%", width: "45px", height: "45px" }}
        >
          ☰
        </Button>
      </div>

      {/* Desktop Sidebar - always visible on large screens */}
      <div
        className="bg-white d-none d-lg-flex flex-column"
        style={{
          width: "220px",
          minHeight: "100vh",
          position: "sticky",
          top: 0,
          color: "#000000",
        }}
      >
        <SidebarContent />
      </div>

      {/* Mobile Offcanvas Sidebar */}
      <Offcanvas
        show={showMobile}
        onHide={() => setShowMobile(false)}
        className="d-lg-none"
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Menu</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <SidebarContent />
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}
