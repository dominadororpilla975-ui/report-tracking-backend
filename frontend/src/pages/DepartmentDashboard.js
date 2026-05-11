import React, { useEffect, useState, useCallback } from "react";
import {
  Container,
  Tab,
  Badge,
  Table,
  Button,
  Modal,
  Row,
  Col,
  Card,
  Form,
} from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import ReportList from "../components/ReportList";
import WorkflowTracker from "../components/WorkflowTracker";
import ReceivingCopy from "../components/ReceivingCopy";
import DepartmentSelect from "../components/DepartmentSelect";
import API from "../services/api";

export default function DepartmentDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const initialTab = searchParams.get("tab") || "pending";
  const [activeTab, setActiveTab] = useState(initialTab);
  const departmentId = localStorage.getItem("departmentId");
  const departmentName = localStorage.getItem("departmentName");
  const userRole = localStorage.getItem("role");

  // Redirect if not logged in or not department user
  useEffect(() => {
    if (!departmentId || userRole !== "department") {
      navigate("/login");
    }
  }, [departmentId, userRole, navigate]);
  const [reports, setReports] = useState([]);
  const [pendingReports, setPendingReports] = useState([]);
  const [processingReports, setProcessingReports] = useState([]);
  const [completedReports, setCompletedReports] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [remarkText, setRemarkText] = useState("");
  const [remarkLoading, setRemarkLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signatureFile, setSignatureFile] = useState(null);
  const [signatureInfo, setSignatureInfo] = useState(null);
  const [signatureLoading, setSignatureLoading] = useState(false);
  const [signatureMessage, setSignatureMessage] = useState("");
  const [signatureError, setSignatureError] = useState("");

  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignReport, setReassignReport] = useState(null);
  const [reassignDept, setReassignDept] = useState("");

  // Approve/Reject modal states
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(""); // "approve" or "reject"
  const [actionReport, setActionReport] = useState(null);
  const [actionNotes, setActionNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // View Report Details Modal
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingReport, setViewingReport] = useState(null);

  const fetchReports = useCallback(async () => {
    try {
      if (departmentId) {
        const pending = await API.get(
          `/workflow/department/${departmentId}/pending`,
        );
        setPendingReports(pending.data || []);

        const processing = await API.get(
          `/workflow/department/${departmentId}/processing`,
        );
        setProcessingReports(processing.data || []);

        const completed = await API.get(
          `/workflow/department/${departmentId}/completed`,
        );
        setCompletedReports(completed.data || []);

        const res = await API.get(`/department/reports/${departmentId}`);
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

  const fetchDepartmentSignature = useCallback(async () => {
    if (!departmentId) return;

    try {
      const res = await API.get(`/department/${departmentId}/signature`);
      setSignatureInfo(res.data || null);
    } catch (err) {
      console.error("Error fetching department signature:", err);
    }
  }, [departmentId]);

  useEffect(() => {
    fetchDepartmentSignature();
  }, [fetchDepartmentSignature]);

  const handleSignatureUpload = async (e) => {
    e.preventDefault();
    setSignatureMessage("");
    setSignatureError("");

    if (!signatureFile) {
      setSignatureError("Please select a signature image.");
      return;
    }

    const formData = new FormData();
    formData.append("signature", signatureFile);

    setSignatureLoading(true);
    try {
      const res = await API.post(
        `/department/${departmentId}/signature`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      setSignatureInfo(res.data || null);
      setSignatureFile(null);
      setSignatureMessage("Department signature uploaded successfully.");
    } catch (err) {
      setSignatureError(
        err.response?.data?.message || "Failed to upload signature.",
      );
    } finally {
      setSignatureLoading(false);
    }
  };

  useEffect(() => {
    const fetchSelectedReport = async () => {
      if (!selectedReportId) {
        setSelectedReport(null);
        return;
      }

      try {
        const res = await API.get(`/department/report/${selectedReportId}`);
        setSelectedReport(res.data.report || null);
      } catch (err) {
        console.error("Error fetching selected report details:", err);
        setSelectedReport(null);
      }
    };

    fetchSelectedReport();
  }, [selectedReportId]);

  const handleSendRemark = async (e) => {
    e.preventDefault();
    if (!remarkText.trim() || !selectedReportId) return;

    setRemarkLoading(true);
    try {
      await API.post(`/department/report/${selectedReportId}/remark`, {
        remarks: remarkText.trim(),
        updated_by: localStorage.getItem("userId") || 1,
      });
      setRemarkText("");
      const res = await API.get(`/department/report/${selectedReportId}`);
      setSelectedReport(res.data.report || null);
      setRemarkLoading(false);
    } catch (err) {
      console.error("Error sending remark:", err);
      setRemarkLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await API.get("/department/departments");
      setDepartments(res.data || []);
    } catch (err) {
      console.error("Error fetching departments:", err);
    }
  };

  useEffect(() => {
    fetchDepartments();
    if (departmentId) {
      fetchReports();
    }
  }, [departmentId, fetchReports]);

  // Sync activeTab with URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [location.search, activeTab]);

  const handleReassign = async () => {
    if (!reassignDept) return;

    // Get reason from user
    const reason = window.prompt(
      reassignDept === "admin"
        ? "Enter reason for returning to Admin:"
        : "Enter reason for reassignment:",
    );

    if (reassignDept === "admin" && !reason) {
      alert("Reason is required when returning to Admin");
      return;
    }

    try {
      // If reassigning to admin, set department_id to null
      const deptId = reassignDept === "admin" ? null : reassignDept;

      // Use the workflow endpoint for proper logging
      await API.put(`/workflow/reassign-department/${reassignReport.id}`, {
        new_department_id: deptId,
        return_to_admin: reassignDept === "admin",
        reason: reason || "Reassigned by department",
        updated_by: localStorage.getItem("userId"),
      });

      setShowReassignModal(false);
      setReassignDept(null);
      fetchReports();
      alert(
        reassignDept === "admin"
          ? "Record returned to Admin successfully!"
          : "Record reassigned successfully!",
      );
    } catch (err) {
      console.error("Error reassigning", err);
      alert(err.response?.data?.message || "Error");
    }
  };

  // Handle Approve/Reject actions - sends to Admin
  const handleAction = async () => {
    if (actionType === "reject" && !actionNotes.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }

    setActionLoading(true);
    try {
      const userId = localStorage.getItem("userId");

      if (actionType === "approve") {
        // Approve current workflow step and move to next department
        await API.post(`/workflow/approve/${actionReport.id}`, {
          approver_id: userId,
          notes: actionNotes || "Approved by department",
        });
        alert("Record approved and moved to the next department (if any)!");
      } else {
        // Reject current workflow step
        await API.post(`/workflow/reject/${actionReport.id}`, {
          approver_id: userId,
          reason: actionNotes,
        });
        alert("Record rejected in the current workflow step!");
      }

      setShowActionModal(false);
      setActionNotes("");
      setActionReport(null);
      setActionType("");
      fetchReports();
    } catch (err) {
      console.error("Error processing action:", err);
      alert(err.response?.data?.message || "Error processing action");
    } finally {
      setActionLoading(false);
    }
  };

  const openActionModal = (report, type) => {
    setActionReport(report);
    setActionType(type);
    setActionNotes("");
    setShowActionModal(true);
  };

  const openReportDetails = (report) => {
    setViewingReport(report);
    setShowViewModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setViewingReport(null);
  };

  const ReportRow = ({ report }) => (
    <tr
      onClick={() => setSelectedReportId(report.id)}
      style={{ cursor: "pointer" }}
    >
      <td>#{report.id}</td>
      <td>{report.title}</td>
      <td>{report.client_name}</td>
      <td>
        <Badge
          bg={
            report.status === "Approved"
              ? "success"
              : report.status === "Rejected"
                ? "danger"
                : report.status === "In Progress"
                  ? "info"
                  : "warning"
          }
        >
          {report.status}
        </Badge>
      </td>
      <td>{report.budget ? `$${report.budget}` : "-"}</td>
      <td>Step {report.step_number}</td>
      <td>
        <Button
          size="sm"
          variant="info"
          className="me-1"
          onClick={(e) => {
            e.stopPropagation();
            openReportDetails(report);
          }}
          title="View details"
        >
          View
        </Button>
        <Button
          size="sm"
          variant="outline-success"
          className="me-1"
          onClick={(e) => {
            e.stopPropagation();
            openActionModal(report, "approve");
          }}
          title="Approval current workflow step"
        >
          Approval
        </Button>
        <Button
          size="sm"
          variant="outline-danger"
          className="me-1"
          onClick={(e) => {
            e.stopPropagation();
            openActionModal(report, "reject");
          }}
          title="Reject current workflow step"
        >
          ✗ Reject
        </Button>
        <Button
          size="sm"
          variant="outline-warning"
          onClick={(e) => {
            e.stopPropagation();
            setReassignReport(report);
            setShowReassignModal(true);
          }}
        >
          🔄 Reassign
        </Button>
      </td>
    </tr>
  );

  return (
    <>
      <div
        className="dashboard-shell"
        style={{
          backgroundColor: "#ffffff",
          color: "#000000",
          minHeight: "100vh",
        }}
      >
        <div className="d-flex">
          <Sidebar role="department" />
          <Container
            fluid
            className="p-3 p-lg-4"
            style={{
              backgroundColor: "#ffffff",
              color: "#000000",
              maxWidth: "1400px",
              marginTop: "50px",
              borderRadius: "10px",
            }}
          >
            <h2>
              🏛️ Department Dashboard{" "}
              {departmentName ? `— ${departmentName}` : ""}
            </h2>
            <p style={{ color: "#000000" }}>
              Manage records and workflows for your department
            </p>

            {/* Quick Stats */}
            <Row className="mb-4">
              <Col md={3}>
                <Card className="text-center h-100">
                  <Card.Body>
                    <h3 className="text-warning">{pendingReports.length}</h3>
                    <p className="text-muted mb-0">Pending</p>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="text-center h-100">
                  <Card.Body>
                    <h3 className="text-info">{processingReports.length}</h3>
                    <p className="text-muted mb-0">Processing</p>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="text-center h-100">
                  <Card.Body>
                    <h3 className="text-success">{completedReports.length}</h3>
                    <p className="text-muted mb-0">Completed</p>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="text-center h-100">
                  <Card.Body>
                    <h3 className="text-primary">{reports.length}</h3>
                    <p className="text-muted mb-0">Total</p>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Card className="mb-4">
              <Card.Body>
                <div className="d-flex flex-column flex-lg-row justify-content-between gap-3">
                  <div>
                    <h5 className="mb-1">Department Signature</h5>
                    <p className="text-muted mb-2">
                      Upload the signature image used on receiving copies.
                    </p>
                    {signatureInfo?.signature_url ? (
                      <div className="d-flex align-items-center gap-3">
                        <img
                          src={signatureInfo.signature_url}
                          alt="Department signature"
                          style={{
                            maxWidth: 180,
                            maxHeight: 70,
                            objectFit: "contain",
                            border: "1px solid #dee2e6",
                            borderRadius: 6,
                            padding: 8,
                            background: "#fff",
                          }}
                        />
                        <span className="text-success">
                          Signature active for receiving copies
                        </span>
                      </div>
                    ) : (
                      <div className="text-muted">
                        No signature uploaded yet.
                      </div>
                    )}
                  </div>
                  <Form
                    onSubmit={handleSignatureUpload}
                    style={{ minWidth: 300 }}
                  >
                    <Form.Group className="mb-2">
                      <Form.Label>Signature image</Form.Label>
                      <Form.Control
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) =>
                          setSignatureFile(e.target.files?.[0] || null)
                        }
                      />
                    </Form.Group>
                    {signatureMessage && (
                      <div className="alert alert-success py-2 mb-2">
                        {signatureMessage}
                      </div>
                    )}
                    {signatureError && (
                      <div className="alert alert-danger py-2 mb-2">
                        {signatureError}
                      </div>
                    )}
                    <Button
                      type="submit"
                      variant="dark"
                      disabled={signatureLoading}
                    >
                      {signatureLoading ? "Uploading..." : "Upload Signature"}
                    </Button>
                  </Form>
                </div>
              </Card.Body>
            </Card>

            <Tab.Container
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k)}
            >
              <Tab.Content>
                {/* Pending Reports Tab */}
                <Tab.Pane eventKey="pending">
                  {loading ? (
                    <p className="text-center mt-4">
                      Loading pending records...
                    </p>
                  ) : pendingReports.length === 0 ? (
                    <div className="alert alert-info">
                      No pending records for your department
                    </div>
                  ) : (
                    <>
                      <Table striped bordered hover responsive>
                        <thead className="table-dark">
                          <tr>
                            <th>ID</th>
                            <th>Title</th>
                            <th>Client</th>
                            <th>Status</th>
                            <th>Budget</th>
                            <th>Step</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingReports.map((report) => (
                            <ReportRow key={report.id} report={report} />
                          ))}
                        </tbody>
                      </Table>
                      {selectedReportId && (
                        <div className="mt-4">
                          <WorkflowTracker
                            reportId={selectedReportId}
                            onStatusUpdate={fetchReports}
                          />
                          {selectedReport?.attachment_url && (
                            <div className="mt-3 alert alert-secondary">
                              <strong>Attachment:</strong>{" "}
                              <a
                                href={selectedReport.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Download attached file
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </Tab.Pane>

                {/* Processing Reports Tab */}
                <Tab.Pane eventKey="processing">
                  {loading ? (
                    <p className="text-center mt-4">
                      Loading processing records...
                    </p>
                  ) : processingReports.length === 0 ? (
                    <div className="alert alert-info">
                      No records currently being processed
                    </div>
                  ) : (
                    <>
                      <Table striped bordered hover responsive>
                        <thead className="table-dark">
                          <tr>
                            <th>ID</th>
                            <th>Title</th>
                            <th>Client</th>
                            <th>Route Status</th>
                            <th>Budget</th>
                            <th>Step</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {processingReports.map((report) => (
                            <tr
                              key={report.id}
                              onClick={() => setSelectedReportId(report.id)}
                              style={{ cursor: "pointer" }}
                            >
                              <td>#{report.id}</td>
                              <td>{report.title}</td>
                              <td>{report.client_name}</td>
                              <td>
                                <Badge bg="info">{report.route_status}</Badge>
                              </td>
                              <td>
                                {report.budget ? `$${report.budget}` : "-"}
                              </td>
                              <td>Step {report.step_number}</td>
                              <td>
                                <Button
                                  size="sm"
                                  variant="outline-warning"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReassignReport(report);
                                    setShowReassignModal(true);
                                  }}
                                  title="Reassign to another department"
                                >
                                  🔄
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                      {selectedReportId && (
                        <div className="mt-4">
                          <WorkflowTracker
                            reportId={selectedReportId}
                            onStatusUpdate={fetchReports}
                          />
                          {selectedReport?.attachment_url && (
                            <div className="mt-3 alert alert-secondary">
                              <strong>Attachment:</strong>{" "}
                              <a
                                href={selectedReport.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Download attached file
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </Tab.Pane>

                {/* Completed Records Tab */}
                <Tab.Pane eventKey="completed">
                  {loading ? (
                    <p className="text-center mt-4">
                      Loading completed records...
                    </p>
                  ) : completedReports.length === 0 ? (
                    <div className="alert alert-info">
                      No completed records yet
                    </div>
                  ) : (
                    <Table striped bordered hover responsive>
                      <thead className="table-dark">
                        <tr>
                          <th>ID</th>
                          <th>Title</th>
                          <th>Client</th>
                          <th>Status</th>
                          <th>Budget</th>
                          <th>Approval Notes</th>
                          <th>Completed</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {completedReports.map((report) => (
                          <tr key={report.id}>
                            <td>#{report.id}</td>
                            <td>{report.title}</td>
                            <td>{report.client_name}</td>
                            <td>
                              <>
                                {report.requires_physical_pickup ? (
                                  <Badge
                                    bg="warning"
                                    style={{ marginRight: 6 }}
                                  >
                                    📄 Physical Pickup
                                  </Badge>
                                ) : null}
                                <Badge
                                  bg={
                                    report.status === "Approved"
                                      ? "success"
                                      : "danger"
                                  }
                                >
                                  {report.status}
                                </Badge>
                              </>
                            </td>
                            <td>{report.budget ? `$${report.budget}` : "-"}</td>
                            <td>{report.approver_notes}</td>
                            <td>
                              {new Date(
                                report.completed_date,
                              ).toLocaleDateString()}
                            </td>
                            <td>
                              <Button
                                size="sm"
                                variant="info"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openReportDetails(report);
                                }}
                                title="View details"
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

                {/* All Reports Tab */}
                <Tab.Pane eventKey="all">
                  {loading ? (
                    <p className="text-center mt-4">Loading reports...</p>
                  ) : (
                    <ReportList
                      reports={reports}
                      role="department"
                      refresh={fetchReports}
                      onReassign={(report) => {
                        setReassignReport(report);
                        setShowReassignModal(true);
                      }}
                      onView={openReportDetails}
                    />
                  )}
                </Tab.Pane>
              </Tab.Content>
            </Tab.Container>

            {selectedReport && (
              <div className="report-detail-panel mt-4">
                <h4>Record Details — #{selectedReport.id}</h4>
                <ReceivingCopy report={selectedReport} role="department" />
                <Row className="mb-3">
                  <Col md={6}>
                    <strong>Title:</strong>
                    <p>{selectedReport.title}</p>
                  </Col>
                  <Col md={6}>
                    <strong>Budget:</strong>
                    <p>
                      {selectedReport.budget
                        ? `$${selectedReport.budget}`
                        : "-"}
                    </p>
                  </Col>
                </Row>
                <Row className="mb-3">
                  <Col md={6}>
                    <strong>Client:</strong>
                    <p>{selectedReport.client_name || "N/A"}</p>
                  </Col>
                  <Col md={6}>
                    <strong>Department:</strong>
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
                <div className="conversation-panel">
                  <h5>Messages & Notes</h5>
                  {selectedReport.history &&
                  selectedReport.history.length > 0 ? (
                    selectedReport.history.map((log) => {
                      const isClient =
                        log.remarks?.toLowerCase().includes("client") ||
                        log.action?.toLowerCase().includes("client");
                      const isDepartment =
                        log.remarks?.toLowerCase().includes("department") ||
                        log.action?.toLowerCase().includes("dept");
                      const sender = isClient
                        ? "Client"
                        : isDepartment
                          ? "Department"
                          : log.updated_by_name || "System";
                      const bubbleClass = isClient
                        ? "message-client"
                        : isDepartment
                          ? "message-department"
                          : "message-admin";
                      return (
                        <div
                          key={log.id}
                          className={`message-bubble ${bubbleClass}`}
                        >
                          <div className="message-sender">{sender}</div>
                          <div className="message-text">
                            {log.remarks || "No message."}
                          </div>
                          <div className="message-time">
                            {new Date(
                              log.date_updated || log.created_at || Date.now(),
                            ).toLocaleString()}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-muted mb-0">No messages yet.</p>
                  )}
                </div>
                <Form onSubmit={handleSendRemark} className="mt-3">
                  <Form.Group controlId="departmentRemarkText">
                    <Form.Label>Send a message to Admin / Client</Form.Label>
                    <Form.Control
                      as="textarea"
                      name="departmentRemark"
                      rows={3}
                      value={remarkText}
                      onChange={(e) => setRemarkText(e.target.value)}
                      placeholder="Write your message here..."
                    />
                  </Form.Group>
                  <div className="text-end mt-2">
                    <Button
                      type="submit"
                      disabled={remarkLoading || !remarkText.trim()}
                    >
                      {remarkLoading ? "Sending..." : "Send Message"}
                    </Button>
                  </div>
                </Form>
              </div>
            )}

            {/* Reassign Modal */}
            <Modal
              show={showReassignModal}
              onHide={() => {
                setShowReassignModal(false);
                setReassignDept("");
              }}
            >
              <Modal.Header closeButton>
                <Modal.Title>🔄 Reassign Record</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                {reassignReport && (
                  <div className="mb-3 p-3 bg-light rounded">
                    <strong>Record:</strong> #{reassignReport.id} -{" "}
                    {reassignReport.title}
                  </div>
                )}
                <DepartmentSelect
                  departments={departments}
                  value={reassignDept}
                  onChange={(e) => setReassignDept(e.target.value)}
                  placeholder="Choose department to send to"
                  includeAdminOption={true}
                />
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowReassignModal(false);
                    setReassignDept(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant={reassignDept === "admin" ? "danger" : "primary"}
                  disabled={!reassignDept}
                  onClick={handleReassign}
                >
                  {reassignDept === "admin"
                    ? "Return to Admin"
                    : "Send to Department"}
                </Button>
              </Modal.Footer>
            </Modal>

            {/* Approve/Reject Modal */}
            <Modal
              show={showActionModal}
              onHide={() => {
                setShowActionModal(false);
                setActionNotes("");
                setActionReport(null);
                setActionType("");
              }}
              centered
            >
              <Modal.Header closeButton>
                <Modal.Title>
                  {actionType === "approve" ? "Approval" : "✗ Reject Record"}
                </Modal.Title>
              </Modal.Header>
              <Modal.Body>
                {actionReport && (
                  <div className="mb-3 p-3 bg-light rounded">
                    <strong>Record:</strong> #{actionReport.id} -{" "}
                    {actionReport.title}
                  </div>
                )}
                <p className="text-muted">
                  {actionType === "approve"
                    ? "This record will be approved for the current workflow step and moved to the next department if one exists."
                    : "This record will be rejected for the current workflow step."}
                </p>
                <div className="mb-3">
                  <label className="form-label">
                    {actionType === "reject"
                      ? "Rejection Reason (Required)"
                      : "Notes (Optional)"}
                  </label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    placeholder={
                      actionType === "reject"
                        ? "Enter reason for rejection..."
                        : "Enter any notes..."
                    }
                  />
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowActionModal(false);
                    setActionNotes("");
                    setActionReport(null);
                    setActionType("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant={actionType === "approve" ? "success" : "danger"}
                  onClick={handleAction}
                  disabled={
                    actionLoading ||
                    (actionType === "reject" && !actionNotes.trim())
                  }
                >
                  {actionLoading
                    ? "Processing..."
                    : actionType === "approve"
                      ? "✓ Approve Current Step"
                      : "✗ Reject Current Step"}
                </Button>
              </Modal.Footer>
            </Modal>

            {/* View Report Details Modal */}
            <Modal show={showViewModal} onHide={closeViewModal} size="lg">
              <Modal.Header closeButton>
                <Modal.Title>Record Details - #{viewingReport?.id}</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                {viewingReport && (
                  <>
                    <div className="report-detail-form">
                      <Row className="mb-3">
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="fw-bold">Title</Form.Label>
                            <Form.Control
                              type="text"
                              value={viewingReport.title || ""}
                              readOnly
                              plaintext
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="fw-bold">Status</Form.Label>
                            <div>
                              <Badge
                                bg={
                                  viewingReport.status === "Approved"
                                    ? "success"
                                    : viewingReport.status === "Rejected"
                                      ? "danger"
                                      : viewingReport.status === "Processing"
                                        ? "info"
                                        : "warning"
                                }
                              >
                                {viewingReport.status}
                              </Badge>
                            </div>
                          </Form.Group>
                        </Col>
                      </Row>
                      <Row className="mb-3">
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="fw-bold">Client</Form.Label>
                            <Form.Control
                              type="text"
                              value={viewingReport.client_name || "N/A"}
                              readOnly
                              plaintext
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="fw-bold">Budget</Form.Label>
                            <Form.Control
                              type="text"
                              value={
                                viewingReport.budget
                                  ? `$${viewingReport.budget}`
                                  : "N/A"
                              }
                              readOnly
                              plaintext
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                      <Row className="mb-3">
                        <Col md={12}>
                          <Form.Group>
                            <Form.Label className="fw-bold">
                              Description
                            </Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={3}
                              value={
                                viewingReport.description ||
                                "No description provided."
                              }
                              readOnly
                              plaintext
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                      {viewingReport.requires_physical_pickup && (
                        <Row className="mb-3">
                          <Col md={12}>
                            <Form.Group>
                              <Badge bg="warning" className="me-2">
                                📄 Physical Pickup Required
                              </Badge>
                              <span className="text-muted">
                                {viewingReport.physical_pickup_info ||
                                  "Pickup info not provided"}
                              </span>
                            </Form.Group>
                          </Col>
                        </Row>
                      )}
                      {viewingReport.attachment_url && (
                        <Row className="mb-3">
                          <Col md={12}>
                            <Form.Group>
                              <Form.Label className="fw-bold">
                                Attachment
                              </Form.Label>
                              <div>
                                <a
                                  href={viewingReport.attachment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Download attached file
                                </a>
                              </div>
                            </Form.Group>
                          </Col>
                        </Row>
                      )}
                      <Row className="mb-3">
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="fw-bold">
                              Submitted
                            </Form.Label>
                            <Form.Control
                              type="text"
                              value={
                                viewingReport.created_at
                                  ? new Date(
                                      viewingReport.created_at,
                                    ).toLocaleDateString()
                                  : "N/A"
                              }
                              readOnly
                              plaintext
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="fw-bold">
                              Completed
                            </Form.Label>
                            <Form.Control
                              type="text"
                              value={
                                viewingReport.completed_date
                                  ? new Date(
                                      viewingReport.completed_date,
                                    ).toLocaleDateString()
                                  : "N/A"
                              }
                              readOnly
                              plaintext
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    </div>

                    {/* Receiving Copy for this report */}
                    <div className="mt-4">
                      <ReceivingCopy report={viewingReport} role="department" />
                    </div>
                  </>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={closeViewModal}>
                  Close
                </Button>
              </Modal.Footer>
            </Modal>
          </Container>
        </div>
      </div>
    </>
  );
}
