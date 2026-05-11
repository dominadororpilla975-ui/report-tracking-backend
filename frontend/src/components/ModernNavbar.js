import React, { useState } from "react";
import "../styles/ModernDashboard.css";

export default function ModernNavbar() {
  const [searchQuery, setSearchQuery] = useState("");
  const userName = localStorage.getItem("userName") || "User";

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log("Search for:", searchQuery);
      // Add your search logic here
    }
  };

  return (
    <header className="modern-navbar">
      {/* Left side */}
      <div className="navbar-left">
        <button
          className="hamburger-btn"
          id="hamburger-btn"
          onClick={() => {
            const sidebar = document.querySelector(".modern-sidebar");
            sidebar?.classList.toggle("active");
          }}
        >
          ☰
        </button>
        <h1 className="navbar-title">Dashboard</h1>
      </div>

      {/* Right side */}
      <div className="navbar-right">
        {/* Search Bar */}
        <form className="navbar-search" onSubmit={handleSearch}>
          <span className="navbar-search-icon">🔍</span>
          <input
            name="search"
            type="text"
            className="navbar-search-input"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

        {/* Profile */}
        <div className="navbar-profile">
          <div className="navbar-avatar">👤</div>
          <div>
            <div className="navbar-profile-name">{userName}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
