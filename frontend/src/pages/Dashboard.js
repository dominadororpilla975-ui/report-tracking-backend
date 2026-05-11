import React, { useState, useEffect, useCallback } from "react";
import AppNavbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import ReportForm from "../components/ReportForm";
import ReportList from "../components/ReportList";
import API from "../services/api";
import { Container, Row, Col } from "react-bootstrap";

function Dashboard() {
  const role = localStorage.getItem("role");
  const userId =
    localStorage.getItem("userId") || localStorage.getItem("email");
  const [reports, setReports] = useState([]);

  const fetchReports = useCallback(async () => {
    try {
      const res =
        role === "admin"
          ? await API.get("/all-reports")
          : await API.get(
              role === "client"
                ? `/my-reports/${userId}`
                : "/department-reports",
            );
      setReports(res.data);
    } catch (err) {
      console.log(err);
    }
  }, [role, userId]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return (
    <>
      <AppNavbar role={role} />
      <Container fluid className="dashboard-shell">
        <Row>
          <Col md={2} className="p-0">
            <Sidebar role={role} />
          </Col>
          <Col md={10} className="p-4">
            {role === "client" && <ReportForm refresh={fetchReports} />}
            <ReportList reports={reports} role={role} refresh={fetchReports} />
          </Col>
        </Row>
      </Container>
    </>
  );
}

export default Dashboard;
