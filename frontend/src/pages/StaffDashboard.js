import React, { useEffect, useState, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import ReportList from "../components/ReportList";
import API from "../services/api";

export default function StaffDashboard() {
  const departmentId = localStorage.getItem("departmentId");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    try {
      if (departmentId) {
        const res = await API.get(`/staff/reports/${departmentId}`);
        setReports(res.data || []);
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    if (departmentId) {
      fetchReports();
    }
  }, [departmentId, fetchReports]);

  if (loading) {
    return <div className="p-3">Loading reports...</div>;
  }

  return (
    <div className="d-flex dashboard-shell">
      <Sidebar role="staff" />
      <div className="p-3 dashboard-panel" style={{ width: "100%" }}>
        <ReportList reports={reports} role="staff" refresh={fetchReports} />
      </div>
    </div>
  );
}
