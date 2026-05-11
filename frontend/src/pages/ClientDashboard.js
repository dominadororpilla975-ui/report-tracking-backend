import React, { useEffect, useState, useCallback } from "react";
import {
  Container,
  Tab,
  Badge,
  Table,
  Modal,
  Button,
  Row,
  Col,
  Card,
} from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import PaperTracker from "../components/PaperTracker";
import ReceivingCopy from "../components/ReceivingCopy";
import ReassignModal from "../components/ReassignModal";
import API from "../services/api";

export default function ClientDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const initialTab = searchParams.get("tab") || "dashboard";
  const [activeTab, setActiveTab] = useState(initialTab);
  const userId = localStorage.getItem("userId");
  const userRole = localStorage.getItem("role");

  // Redirect if not logged in or not client user
  useEffect(() => {
    if (!userId || userRole !== "client") {
      navigate("/login");
    }
  }, [userId, userRole, navigate]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedReportHistory, setSelectedReportHistory] = useState([]);

  const fetchReports = useCallback(async () => {
    try {
      if (userId) {
        const res = await API.get(`/client/reports/${userId}`);
        setReports(res.data || []);
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
      setError("Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchReports();
    }
  }, [userId, fetchReports]);

  // Sync activeTab with URL params (needed so sidebar navigation works)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [location.search, activeTab]);

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "Completed":
        return "success";
      case "Processing":
        return "info";
      case "Assigned":
        return "primary";
      case "Pending":
        return "warning";
      case "Rejected":
        return "danger";
      default:
        return "secondary";
    }
  };

  const viewReportDetails = async (report) => {
    setSelectedReportId(report.id);
    try {
      const res = await API.get(`/client/report/${report.id}`);
      setSelectedReport(res.data.report || report);
      setSelectedReportHistory(res.data.updates || []);
    } catch (err) {
      console.error("Error fetching report details:", err);
      setSelectedReport(report);
      setSelectedReportHistory([]);
    } finally {
      setShowWorkflowModal(true);
    }
  };

  return (
    <div
      className="d-flex dashboard-shell"
      style={{
        backgroundColor: "#ffffff",
        color: "#000000",
        minHeight: "100vh",
      }}
    >
      <Sidebar role="client" />
      <Container
        className="p-4 dashboard-panel"
        style={{
          width: "100%",
          backgroundColor: "#ffffff",
          color: "#000000",
          borderRadius: "10px",
        }}
      >
        <h2 style={{ color: "#000000" }}>My Records Dashboard</h2>
        <p style={{ color: "#000000" }}>View and track your documents</p>

        {error && <div className="alert alert-danger">{error}</div>}

        <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
          <Tab.Content>
            {/* Dashboard Tab */}
            <Tab.Pane eventKey="dashboard">
              <Row className="mt-4">
                <Col md={3}>
                  <Card className="text-center h-100">
                    <Card.Body>
                      <h3 className="text-primary">{reports.length}</h3>
                      <p className="text-muted-black mb-0">Total Records</p>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="text-center h-100">
                    <Card.Body>
                      <h3 className="text-warning">
                        {reports.filter((r) => r.status === "Pending").length}
                      </h3>
                      <p className="textext-muted-black mb-0">Pending</p>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="text-center h-100">
                    <Card.Body>
                      <h3 className="text-info">
                        {
                          reports.filter(
                            (r) =>
                              r.status === "Processing" ||
                              r.status === "Assigned",
                          ).length
                        }
                      </h3>
                      <p className="ttext-muted-black mb-0">In Progress</p>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="text-center h-100">
                    <Card.Body>
                      <h3 className="text-success">
                        {reports.filter((r) => r.status === "Completed").length}
                      </h3>
                      <p className="text-muted-black mb-0">Completed</p>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Tab.Pane>

            {/* Tracking Tab */}
            <Tab.Pane eventKey="tracking">
              {loading ? (
                <p className="text-center mt-4">Loading records...</p>
              ) : reports.filter((r) => r.status !== "Completed").length ===
                0 ? (
                <div className="alert alert-info">No records in progress</div>
              ) : (
                <Table striped bordered hover responsive>
                  <thead className="table-dark">
                    <tr>
                      <th>Status</th>
                      <th>Title</th>
                      <th>Department</th>
                      <th>Budget</th>
                      <th>Submitted</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports
                      .filter((r) => r.status !== "Completed")
                      .map((report) => (
                        <tr key={report.id}>
                          <td>
                            <Badge bg={getStatusBadgeColor(report.status)}>
                              {report.status}
                            </Badge>
                          </td>
                          <td>
                            <strong>{report.title}</strong>
                          </td>
                          <td>{report.department_name || "Not assigned"}</td>
                          <td>
                            {report.budget > 0 ? (
                              <span className="text-success">
                                ₱{parseFloat(report.budget).toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            {new Date(report.created_at).toLocaleDateString()}
                          </td>
                          <td>
                            <Button
                              size="sm"
                              variant="outline-primary"
                              onClick={() => viewReportDetails(report)}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </Table>
              )}
            </Tab.Pane>

            {/* Completed Tab */}
            <Tab.Pane eventKey="completed">
              {reports.filter((r) => r.status === "Completed").length === 0 ? (
                <div className="alert alert-info">No completed records</div>
              ) : (
                <Table striped bordered hover responsive>
                  <thead className="table-dark">
                    <tr>
                      <th>Title</th>
                      <th>Department</th>
                      <th>Budget</th>
                      <th>Completed</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports
                      .filter((r) => r.status === "Completed")
                      .map((report) => (
                        <tr key={report.id}>
                          <td>
                            <strong>{report.title}</strong>
                          </td>
                          <td>{report.department_name || "N/A"}</td>
                          <td>
                            {report.budget > 0 ? (
                              <span className="text-success">
                                ₱{parseFloat(report.budget).toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            {new Date(report.created_at).toLocaleDateString()}
                          </td>
                          <td>
                            <Button
                              size="sm"
                              variant="outline-success"
                              onClick={() => viewReportDetails(report)}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </Table>
              )}
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>

        {/* Record Details Modal */}
        <Modal
          show={showWorkflowModal}
          onHide={() => {
            setShowWorkflowModal(false);
            setSelectedReport(null);
            setSelectedReportHistory([]);
          }}
          size="lg"
        >
          <Modal.Header closeButton>
            <Modal.Title>Record Details - #{selectedReport?.id}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedReport && (
              <>
                <Row className="mb-3">
                  <Col md={6}>
                    <strong>Title:</strong> <p>{selectedReport.title}</p>
                  </Col>
                  <Col md={6}>
                    <strong>Status:</strong>{" "}
                    <Badge bg={getStatusBadgeColor(selectedReport.status)}>
                      {selectedReport.status_display || selectedReport.status}
                    </Badge>
                  </Col>
                </Row>
                <Row className="mb-3">
                  <Col md={6}>
                    <strong>Client:</strong>{" "}
                    <p>{selectedReport.client_name || "You"}</p>
                  </Col>
                  <Col md={6}>
                    <strong>Department:</strong>{" "}
                    <p>{selectedReport.department_name || "Not Assigned"}</p>
                  </Col>
                </Row>
                <Row className="mb-3">
                  <Col md={12}>
                    <strong>Description:</strong>
                    <div className="p-3 bg-light rounded mt-2">
                      {selectedReport.description || "No description provided."}
                    </div>
                  </Col>
                </Row>
                {selectedReport.budget > 0 && (
                  <Row className="mb-3">
                    <Col md={12}>
                      <strong>Budget:</strong>{" "}
                      <p>
                        ₱{parseFloat(selectedReport.budget).toLocaleString()}
                      </p>
                    </Col>
                  </Row>
                )}
                {selectedReport.requires_physical_pickup && (
                  <Row className="mb-3">
                    <Col md={12}>
                      <strong>Physical Pickup:</strong>
                      <Badge bg="warning" className="ms-2">
                        Required
                      </Badge>
                      <p>
                        {selectedReport.physical_pickup_info ||
                          "No pickup info provided."}
                      </p>
                    </Col>
                  </Row>
                )}
                {selectedReport.attachment_url && (
                  <Row className="mb-3">
                    <Col md={12}>
                      <strong>Attachment:</strong>{" "}
                      <a
                        href={selectedReport.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Download attached file
                      </a>
                    </Col>
                  </Row>
                )}
                <Row className="mb-4">
                  <Col md={12}>
                    <h5>Conversation</h5>
                    <div className="border rounded p-3 mb-3 admin-chat-box">
                      {selectedReportHistory.length > 0 ? (
                        selectedReportHistory.map((log) => {
                          const isClient =
                            log.remarks?.startsWith("Client feedback:");
                          const isDept =
                            log.remarks?.toLowerCase().includes("department") ||
                            log.action?.includes("remark");
                          const sender = isClient
                            ? "Client"
                            : isDept
                              ? "Department"
                              : log.action === "admin_comment"
                                ? "Admin"
                                : log.updated_by_name || "System";
                          const badgeClass = isClient
                            ? "bg-light text-dark"
                            : isDept
                              ? "bg-info text-white"
                              : "bg-primary text-white";
                          const messageText = log.remarks || "No message";
                          return (
                            <div
                              key={log.id}
                              className={`rounded mb-3 p-3 ${badgeClass}`}
                            >
                              <div className="small text-muted mb-1">
                                {sender} ·{" "}
                                {new Date(
                                  log.date_updated ||
                                    log.created_at ||
                                    Date.now(),
                                ).toLocaleString()}
                              </div>
                              <div>{messageText}</div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-muted mb-0">
                          No conversation history yet.
                        </p>
                      )}
                    </div>
                  </Col>
                </Row>
                {selectedReportId && (
                  <Row>
                    <Col md={12}>
                      <h5>Workflow</h5>
                      <PaperTracker reportId={selectedReportId} role="client" />
                    </Col>
                  </Row>
                )}
                <Row className="mt-4">
                  <Col md={12}>
                    <ReceivingCopy report={selectedReport} role="client" />
                  </Col>
                </Row>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => {
                setShowWorkflowModal(false);
                setSelectedReport(null);
                setSelectedReportHistory([]);
              }}
            >
              Close
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Reassign Modal */}
        <ReassignModal
          show={showReassignModal}
          onHide={() => {
            setShowReassignModal(false);
            setSelectedReport(null);
          }}
          report={selectedReport}
          role="client"
          onReassign={() => {
            fetchReports();
          }}
        />
      </Container>
    </div>
  );
}
