import React, { useEffect, useState } from "react";
import {
  Container,
  Button,
  Form,
  Alert,
  Table,
  Badge,
  Tab,
  Row,
  Col,
  Modal,
} from "react-bootstrap";
import { useSearchParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import DepartmentSelect from "../components/DepartmentSelect";
import AnalyticsCard from "../components/AnalyticsCard";
import PaperTracker from "../components/PaperTracker";
import ReceivingCopy from "../components/ReceivingCopy";
import API from "../services/api";
import "../styles/AdminDashboard.css";
import UsersManager from "../components/admin/UsersManager";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "dashboard";

  // Authentication check - redirect to landing if not logged in as admin
  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "admin") {
      navigate("/", { replace: true });
    }
  }, [navigate]);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [reports, setReports] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedReportHistory, setSelectedReportHistory] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [showReportDetailModal, setShowReportDetailModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [departmentSearchQuery, setDepartmentSearchQuery] = useState("");
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [departmentMessage, setDepartmentMessage] = useState("");
  const [departmentError, setDepartmentError] = useState("");
  const [restoreDepartmentsLoading, setRestoreDepartmentsLoading] =
    useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [createSuccess, setCreateSuccess] = useState("");
  const [createClientAccountInfo, setCreateClientAccountInfo] = useState(null);
  const [resendLoading, setResendLoading] = useState(false);

  // Create Record Modal - MULTI-DEPT WORKFLOW
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    departments: [], // Multi-dept for workflow path!
    client_name: "",
    client_email: "",
    attachments: [],
    requires_physical_pickup: false,
    physical_pickup_info: "",
    budget: 0,
  });
  const [createLoading, setCreateLoading] = useState(false);

  // Assign Department Modal - MULTI-DEPT
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignReport, setAssignReport] = useState(null);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await API.get("/admin/stats");
      setStats(res.data);
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await API.get("/admin/reports");
      setReports(res.data || []);
    } catch (err) {
      console.error("Error fetching reports:", err);
      setError("Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await API.get("/admin/departments");
      setDepartments(res.data || []);
    } catch (err) {
      console.error("Error fetching departments:", err);
    }
  };

  const createDepartment = async (e) => {
    e.preventDefault();
    setDepartmentMessage("");
    setDepartmentError("");
    const name = newDepartmentName.trim();
    if (!name) {
      setDepartmentError("Please enter department name.");
      return;
    }

    try {
      const res = await API.post("/admin/departments", { name });
      setDepartmentMessage(
        res.data.message || "Department created successfully.",
      );
      setNewDepartmentName("");
      fetchDepartments();
    } catch (err) {
      setDepartmentError(
        err.response?.data?.message || "Failed to create department.",
      );
    }
  };

  const restoreDefaultDepartments = async () => {
    setDepartmentMessage("");
    setDepartmentError("");
    setRestoreDepartmentsLoading(true);
    try {
      const res = await API.post("/admin/departments/restore-defaults");
      setDepartmentMessage(res.data.message || "Default departments restored.");
      fetchDepartments();
    } catch (err) {
      setDepartmentError(
        err.response?.data?.message || "Failed to restore departments.",
      );
    } finally {
      setRestoreDepartmentsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchReports();
    fetchDepartments();
  }, []);

  // Update activeTab when URL changes
  useEffect(() => {
    const tab = searchParams.get("tab") || "dashboard";
    setActiveTab(tab);
  }, [searchParams]);

  const handleApprove = async (id) => {
    try {
      await API.post(`/admin/reports/${id}/approve`, { status: "Approved" });
      fetchReports();
      fetchStats();
    } catch (err) {
      setError("Failed to approve record");
    }
  };

  const handleReject = async (id) => {
    try {
      await API.post(`/admin/reports/${id}/reject`, { status: "Rejected" });
      fetchReports();
      fetchStats();
    } catch (err) {
      setError("Failed to reject record");
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this record? This action cannot be undone.",
      )
    ) {
      return;
    }
    try {
      await API.delete(`/admin/report/${id}`);
      fetchReports();
      fetchStats();
      setError("");
    } catch (err) {
      setError("Failed to delete record");
    }
  };

  // Handle Create Record
  const handleCreateReport = async (e) => {
    e.preventDefault();
    if (!createForm.title || createForm.departments.length === 0) {
      setError("Title and at least 1 department required");
      return;
    }
    setCreateLoading(true);
    setCreateSuccess("");
    setCreateClientAccountInfo(null);
    setResendLoading(false);
    try {
      const formData = new FormData();
      formData.append("title", createForm.title);
      formData.append("description", createForm.description);
      formData.append("departments", createForm.departments.join(",")); // Backend handles comma-split
      formData.append("budget", createForm.budget || 0);
      formData.append(
        "requires_physical_pickup",
        createForm.requires_physical_pickup ? "true" : "false",
      );
      formData.append(
        "physical_pickup_info",
        createForm.physical_pickup_info || "",
      );
      formData.append("admin_id", localStorage.getItem("userId") || 1);

      if (createForm.client_email) {
        formData.append("client_email", createForm.client_email);
        formData.append("client_name", createForm.client_name);
      }

      createForm.attachments.forEach((file) => {
        formData.append("attachments", file);
      });

      const res = await API.post("/admin/submit-paper", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const responseData = res.data || {};
      setCreateSuccess(responseData.message || "Record created successfully");
      setCreateClientAccountInfo(responseData.client_account || null);

      setShowCreateModal(false);
      setCreateForm({
        title: "",
        description: "",
        departments: [],
        client_name: "",
        client_email: "",
        attachments: [],
        requires_physical_pickup: false,
        physical_pickup_info: "",
        budget: 0,
      });
      fetchReports();
      fetchStats();
      setError("");
    } catch (err) {
      setCreateSuccess("");
      setCreateClientAccountInfo(null);
      setError(err.response?.data?.message || "Failed to create record");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleResendClientEmail = async () => {
    if (!createClientAccountInfo?.email) {
      setError("Client email is required to resend the welcome email.");
      return;
    }
    setResendLoading(true);
    try {
      const payload = {
        client_email: createClientAccountInfo.email,
      };
      if (createClientAccountInfo.client_id) {
        payload.client_id = createClientAccountInfo.client_id;
      }
      const res = await API.post("/admin/resend-client-welcome", payload);
      const responseData = res.data || {};

      setCreateClientAccountInfo((prev) =>
        prev
          ? {
              ...prev,
              email_sent: responseData.email_sent,
              temp_password: responseData.temp_password || prev.temp_password,
            }
          : prev,
      );
      setCreateSuccess(
        responseData.message || "Welcome email resend requested",
      );
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend welcome email");
    } finally {
      setResendLoading(false);
    }
  };

  // Handle Assign Department
  const handleAssignDepartment = async (e) => {
    e.preventDefault();
    if (selectedDepartments.length === 0) {
      setError("Please select at least one department");
      return;
    }
    setAssignLoading(true);
    try {
      await API.put(`/admin/assign/${assignReport.id}`, {
        departments: selectedDepartments,
        updated_by: localStorage.getItem("userId") || 1,
      });
      setShowAssignModal(false);
      setAssignReport(null);
      setSelectedDepartments([]);
      fetchReports();
      fetchStats();
      setError("");
    } catch (err) {
      setError("Failed to assign department(s)");
    } finally {
      setAssignLoading(false);
    }
  };

  const openAssignModal = (report) => {
    setAssignReport(report);
    setSelectedDepartments(report.department_id ? [report.department_id] : []);
    setShowAssignModal(true);
  };

  // View Record Details - fetch full details from backend
  const viewReportDetails = async (report) => {
    try {
      const res = await API.get(`/admin/reports/${report.id}`);
      setSelectedReport(res.data.report || report);
      setSelectedReportHistory(res.data.history || []);
    } catch (err) {
      setError("Failed to load record details");
      setSelectedReport(report);
      setSelectedReportHistory([]);
    } finally {
      setCommentText("");
      setShowReportDetailModal(true);
    }
  };

  const handleSendAdminComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedReport) return;
    setCommentLoading(true);
    try {
      await API.post(`/admin/report/${selectedReport.id}/comment`, {
        comment: commentText.trim(),
        updated_by: localStorage.getItem("userId") || 1,
      });
      setCommentText("");
      await viewReportDetails(selectedReport);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send message");
    } finally {
      setCommentLoading(false);
    }
  };

  // Handle Create User
  // Removed: UsersManager handles create/delete

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

  const filteredReports = selectedDepartment
    ? reports.filter((r) => r.department_id === parseInt(selectedDepartment))
    : reports;
  const pendingCount = reports.filter((r) => r.status === "Pending").length;
  const assignedCount = reports.filter((r) => r.status === "Assigned").length;
  const processingCount = reports.filter(
    (r) => r.status === "Processing",
  ).length;
  const approvedReportsCount = reports.filter(
    (r) => r.status === "Approved",
  ).length;
  const completedCount = reports.filter((r) => r.status === "Completed").length;
  const rejectedCount = reports.filter((r) => r.status === "Rejected").length;
  const activeQueueCount = pendingCount + assignedCount + processingCount;
  const recentReports = [...reports]
    .sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime(),
    )
    .slice(0, 5);
  const displayedReports = filteredReports.filter((report) => {
    if (statusFilter === "All") return true;
    return report.status === statusFilter;
  });

  return (
    <div
      className="d-flex dashboard-shell admin-dashboard-shell"
      style={{ minHeight: "100vh", background: "#f8f9fa" }}
    >
      <Sidebar role="admin" />
      <Container className="p-4 dashboard-panel admin-dashboard-panel">
        <div className="admin-dashboard-header">
          <div>
            <div className="admin-dashboard-kicker">Records Command Center</div>
            <h2 className="admin-dashboard-title">
              Administrative Record Desk
            </h2>
            <p className="admin-dashboard-subtitle">
              Oversee intake, routing, approvals, and turnaround across every
              record in the system.
            </p>
          </div>
          <div className="admin-dashboard-actions">
            <div className="admin-dashboard-chip">Live: {activeQueueCount}</div>
          </div>
        </div>
        <div className="admin-hero-grid">
          <div
            className="admin-hero-card admin-hero-primary text-center"
            style={{
              minHeight: "170px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <span className="summary-label">Records Under Administration</span>
            <p className="summary-value">{reports.length}</p>
            <p className="summary-note">
              Includes pending intake, routed cases, and archived outcomes.
            </p>
          </div>
        </div>
        <div className="admin-summary-grid">
          <div className="card-summary">
            <span className="summary-label">Pending Review</span>
            <p className="summary-value">{pendingCount}</p>
          </div>
          <div className="card-summary">
            <span className="summary-label">Assigned</span>
            <p className="summary-value">{assignedCount}</p>
          </div>
          <div className="card-summary">
            <span className="summary-label">In Progress</span>
            <p className="summary-value">{processingCount}</p>
          </div>
          <div className="card-summary">
            <span className="summary-label">Approved</span>
            <p className="summary-value">{approvedReportsCount}</p>
          </div>
          <div className="card-summary">
            <span className="summary-label">Completed</span>
            <p className="summary-value">{completedCount}</p>
          </div>
          <div className="card-summary">
            <span className="summary-label">Rejected</span>
            <p className="summary-value">{rejectedCount}</p>
          </div>
        </div>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError("")}>
            {error}
          </Alert>
        )}
        {createSuccess && (
          <Alert
            variant="success"
            dismissible
            onClose={() => {
              setCreateSuccess("");
              setCreateClientAccountInfo(null);
            }}
          >
            <div>{createSuccess}</div>
            {createClientAccountInfo && (
              <div className="mt-2">
                {createClientAccountInfo.email_sent ? (
                  <div>
                    Client account was created and the welcome email was sent to
                    the client.
                  </div>
                ) : (
                  <div>
                    <div>
                      <strong>
                        Client account created, but email delivery failed.
                      </strong>
                    </div>
                    <div>Email: {createClientAccountInfo.email}</div>
                    <div>
                      Temporary password:{" "}
                      <code>{createClientAccountInfo.temp_password}</code>
                    </div>
                    <div>
                      Please share this temporary password with the client
                      manually.
                    </div>
                  </div>
                )}
                <div className="mt-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleResendClientEmail}
                    disabled={resendLoading}
                  >
                    {resendLoading ? "Resending..." : "Resend welcome email"}
                  </Button>
                </div>
              </div>
            )}
          </Alert>
        )}
        {/* Tab navigation is handled by Sidebar - tabs are hidden */}
        <Tab.Container activeKey={activeTab}>
          <Tab.Content>
            <Tab.Pane eventKey="dashboard">
              <Row className="mt-4 g-4">
                <Col xl={4}>
                  <div className="admin-focus-panel h-100">
                    <div className="admin-panel-head">
                      <div>
                        <div className="admin-panel-eyebrow">
                          Intake Snapshot
                        </div>
                        <h5 className="mb-1">Recent record submissions</h5>
                        <p className="text-muted mb-0">
                          Latest cases entering the workflow.
                        </p>
                      </div>
                    </div>
                    <div className="admin-recent-list">
                      {recentReports.length > 0 ? (
                        recentReports.map((report) => (
                          <button
                            key={report.id}
                            type="button"
                            className="admin-recent-item"
                            onClick={() => viewReportDetails(report)}
                          >
                            <div>
                              <div className="admin-recent-title">
                                #{report.id} {report.title}
                              </div>
                              <div className="admin-recent-meta">
                                {report.client_name ||
                                  "Walk-in / Unnamed client"}
                              </div>
                            </div>
                            <Badge bg={getStatusBadgeColor(report.status)}>
                              {report.status}
                            </Badge>
                          </button>
                        ))
                      ) : (
                        <p className="text-muted mb-0">
                          No record submissions yet.
                        </p>
                      )}
                    </div>
                  </div>
                </Col>
                <Col md={6}>
                  <AnalyticsCard
                    title="Status Distribution"
                    data={stats?.status_counts || []}
                    dataKey="count"
                    type="pie"
                  />
                </Col>
              </Row>
            </Tab.Pane>

            <Tab.Pane eventKey="reports">
              <div className="admin-records-panel">
                <div className="admin-records-header">
                  <div>
                    <div className="admin-panel-eyebrow">Records Registry</div>
                    <h4 className="mb-1">Master record list</h4>
                    <p className="text-muted mb-0">
                      Review, route, approve, and archive all submitted records.
                    </p>
                  </div>
                  <Button
                    variant="dark"
                    onClick={() => setShowCreateModal(true)}
                  >
                    + Create Record
                  </Button>
                </div>
                <div className="mb-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    <div className="admin-filter-label">Filter queue</div>
                    <DepartmentSelect
                      departments={departments}
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      placeholder="Filter by Department"
                      includeAllOption={true}
                      allOptionLabel="All Departments"
                    />
                    <Form.Select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      style={{ minWidth: 180 }}
                    >
                      <option value="All">All statuses</option>
                      <option value="Pending">Pending</option>
                      <option value="Assigned">Assigned</option>
                      <option value="Processing">Processing</option>
                      <option value="Completed">Completed</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </Form.Select>
                  </div>
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    <div className="badge bg-success py-2 px-3">
                      Approved Records: {approvedReportsCount}
                    </div>
                    <div className="badge bg-dark py-2 px-3">
                      Showing: {displayedReports.length}
                    </div>
                  </div>
                </div>
              </div>
              {loading ? (
                <p>Loading...</p>
              ) : (
                <div className="admin-table-shell">
                  <Table striped bordered hover responsive>
                    <thead className="table-dark">
                      <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Client</th>
                        <th>Department</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedReports.map((report) => (
                        <tr key={report.id}>
                          <td>#{report.id}</td>
                          <td>{report.title}</td>
                          <td>{report.client_name}</td>
                          <td>{report.department_name}</td>
                          <td>
                            <Badge bg={getStatusBadgeColor(report.status)}>
                              {report.status}
                            </Badge>
                          </td>
                          <td>
                            <Button
                              size="sm"
                              variant="info"
                              className="me-2"
                              onClick={() => viewReportDetails(report)}
                            >
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="warning"
                              className="me-2"
                              onClick={() => openAssignModal(report)}
                            >
                              Assign
                            </Button>
                            {report.status !== "Approved" &&
                              report.status !== "Completed" && (
                                <Button
                                  size="sm"
                                  variant="success"
                                  className="me-2"
                                  onClick={() => handleApprove(report.id)}
                                >
                                  Approve
                                </Button>
                              )}
                            {report.status === "Pending" && (
                              <Button
                                size="sm"
                                variant="danger"
                                className="me-2"
                                onClick={() => handleReject(report.id)}
                              >
                                Reject
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => handleDelete(report.id)}
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Tab.Pane>

            <Tab.Pane eventKey="departments">
              <div className="mb-4 d-flex flex-column flex-md-row gap-2 align-items-start">
                <Form className="d-flex gap-2 flex-wrap flex-md-nowrap w-100">
                  <Form.Control
                    type="text"
                    value={newDepartmentName}
                    onChange={(e) => setNewDepartmentName(e.target.value)}
                    placeholder="New department name"
                  />
                  <Button variant="success" onClick={createDepartment}>
                    Add Department
                  </Button>
                </Form>
                <Button
                  variant="outline-primary"
                  onClick={restoreDefaultDepartments}
                  disabled={restoreDepartmentsLoading}
                >
                  {restoreDepartmentsLoading
                    ? "Restoring..."
                    : "Restore Default Departments"}
                </Button>
              </div>
              {departmentMessage && (
                <Alert
                  variant="success"
                  onClose={() => setDepartmentMessage("")}
                  dismissible
                >
                  {departmentMessage}
                </Alert>
              )}
              {departmentError && (
                <Alert
                  variant="danger"
                  onClose={() => setDepartmentError("")}
                  dismissible
                >
                  {departmentError}
                </Alert>
              )}
              <div className="mb-3">
                <Form.Control
                  type="text"
                  name="departmentSearch"
                  placeholder="Search departments..."
                  value={departmentSearchQuery}
                  onChange={(e) => setDepartmentSearchQuery(e.target.value)}
                  className="admin-dashboard-search"
                />
              </div>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Users</th>
                    <th>Reports</th>
                    <th>Assigned</th>
                  </tr>
                </thead>
                <tbody>
                  {departments
                    .filter(
                      (dept) =>
                        dept.user_count > 0 &&
                        (dept.name
                          .toLowerCase()
                          .includes(departmentSearchQuery.toLowerCase()) ||
                          (dept.description &&
                            dept.description
                              .toLowerCase()
                              .includes(departmentSearchQuery.toLowerCase()))),
                    )
                    .map((dept) => (
                      <tr key={dept.id}>
                        <td>{dept.id}</td>
                        <td>{dept.name}</td>
                        <td>{dept.user_count ?? 0}</td>
                        <td>{dept.report_count ?? 0}</td>
                        <td>{dept.assigned_report_count ?? 0}</td>
                      </tr>
                    ))}
                </tbody>
              </Table>
              {departments.filter(
                (dept) =>
                  dept.user_count > 0 &&
                  (dept.name
                    .toLowerCase()
                    .includes(departmentSearchQuery.toLowerCase()) ||
                    (dept.description &&
                      dept.description
                        .toLowerCase()
                        .includes(departmentSearchQuery.toLowerCase()))),
              ).length === 0 && (
                <p className="text-muted text-center">No departments found.</p>
              )}
            </Tab.Pane>

            <Tab.Pane eventKey="users">
              <UsersManager departments={departments} />
            </Tab.Pane>

            <Tab.Pane eventKey="clients">
              <div className="admin-section">
                <h3>Client Reports</h3>
                {error && <Alert variant="danger">{error}</Alert>}
                {loading ? (
                  <div className="text-center">
                    <div className="spinner-border" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : (
                  <div className="admin-table-shell">
                    <Table striped bordered hover responsive>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Title</th>
                          <th>Client</th>
                          <th>Status</th>
                          <th>Department</th>
                          <th>Created</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports
                          .filter((report) => report.client_id) // Only show reports with clients
                          .map((report) => (
                            <tr key={report.id}>
                              <td>{report.id}</td>
                              <td>{report.title}</td>
                              <td>
                                {report.client_name ||
                                  report.client_email ||
                                  "N/A"}
                              </td>
                              <td>
                                <Badge
                                  bg={
                                    report.status === "Approved"
                                      ? "success"
                                      : report.status === "Rejected"
                                        ? "danger"
                                        : report.status === "Pending"
                                          ? "warning"
                                          : "secondary"
                                  }
                                >
                                  {report.status}
                                </Badge>
                              </td>
                              <td>{report.department_name || "Unassigned"}</td>
                              <td>
                                {new Date(
                                  report.created_at,
                                ).toLocaleDateString()}
                              </td>
                              <td>
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => viewReportDetails(report)}
                                  className="me-2"
                                >
                                  View
                                </Button>
                                {report.status === "Pending" && (
                                  <>
                                    <Button
                                      variant="outline-success"
                                      size="sm"
                                      onClick={() => handleApprove(report.id)}
                                      className="me-2"
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      variant="outline-danger"
                                      size="sm"
                                      onClick={() => handleReject(report.id)}
                                    >
                                      Reject
                                    </Button>
                                  </>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </Table>
                    {reports.filter((report) => report.client_id).length ===
                      0 && (
                      <p className="text-muted text-center">
                        No client reports found.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
        {/* Create Record Modal */}
        <Modal
          show={showCreateModal}
          onHide={() => setShowCreateModal(false)}
          size="lg"
        >
          <Modal.Header closeButton>
            <Modal.Title>Create New Record</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleCreateReport}>
            <Modal.Body>
              <Form.Group className="mb-3">
                <Form.Label>Title *</Form.Label>
                <Form.Control
                  type="text"
                  name="title"
                  value={createForm.title}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, title: e.target.value })
                  }
                  placeholder="Enter record title"
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Client Google Email</Form.Label>
                <Form.Control
                  type="email"
                  name="client_email"
                  value={createForm.client_email}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      client_email: e.target.value,
                    })
                  }
                  placeholder="client@gmail.com"
                />
                <Form.Text className="text-muted">
                  Enter the client&apos;s Google email so they can receive the
                  system link and sign in with Google.
                </Form.Text>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Client Name</Form.Label>
                <Form.Control
                  type="text"
                  name="client_name"
                  value={createForm.client_name}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      client_name: e.target.value,
                    })
                  }
                  placeholder="Client full name"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  name="description"
                  rows={3}
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Enter record description"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>
                  Workflow Departments * (Select path: e.g.
                  Budget→Engineering→Mayor)
                </Form.Label>
                <div
                  style={{
                    maxHeight: "200px",
                    overflowY: "auto",
                    border: "1px solid #dee2e6",
                    borderRadius: "4px",
                    padding: "10px",
                  }}
                >
                  {departments.map((dept) => (
                    <Form.Check
                      key={dept.id}
                      type="checkbox"
                      label={`${dept.name}`}
                      checked={createForm.departments.includes(dept.id)}
                      onChange={(e) => {
                        const id = dept.id;
                        setCreateForm((prev) => ({
                          ...prev,
                          departments: e.target.checked
                            ? [...prev.departments, id]
                            : prev.departments.filter((d) => d !== id),
                        }));
                      }}
                      className="mb-1"
                    />
                  ))}
                </div>
                <small className="text-muted mt-2 d-block">
                  Selected ({createForm.departments.length}):{" "}
                  {createForm.departments
                    .map(
                      (id) => departments.find((d) => d.id === id)?.name || id,
                    )
                    .join(", ")}
                </small>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Budget</Form.Label>
                <Form.Control
                  type="number"
                  name="budget"
                  value={createForm.budget}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, budget: e.target.value })
                  }
                  placeholder="Enter budget amount"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  name="requires_physical_pickup"
                  label="Requires Physical Pickup"
                  checked={createForm.requires_physical_pickup}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      requires_physical_pickup: e.target.checked,
                    })
                  }
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Attachments</Form.Label>
                <Form.Control
                  type="file"
                  multiple
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      attachments: Array.from(e.target.files),
                    })
                  }
                  accept=".pdf,.doc,.docx,.jpg,.png"
                />
                {createForm.attachments.length > 0 && (
                  <small className="text-muted">
                    {createForm.attachments.length} file(s) selected
                  </small>
                )}
              </Form.Group>
              {createForm.requires_physical_pickup && (
                <Form.Group className="mb-3">
                  <Form.Label>Pickup Information</Form.Label>
                  <Form.Control
                    type="text"
                    name="physical_pickup_info"
                    value={createForm.physical_pickup_info}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        physical_pickup_info: e.target.value,
                      })
                    }
                    placeholder="Enter pickup location/time"
                  />
                </Form.Group>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={createLoading}>
                {createLoading ? "Creating..." : "Create Record"}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
        {/* Assign Department Modal */}
        <Modal show={showAssignModal} onHide={() => setShowAssignModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Assign Department(s)</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleAssignDepartment}>
            <Modal.Body>
              {assignReport && (
                <div className="mb-3 p-3 bg-light rounded">
                  <strong>Record:</strong> #{assignReport.id} -{" "}
                  {assignReport.title}
                </div>
              )}
              <Form.Group>
                <Form.Label>Select Department(s)</Form.Label>
                <div
                  style={{
                    maxHeight: "300px",
                    overflowY: "auto",
                    border: "1px solid #dee2e6",
                    borderRadius: "4px",
                    padding: "10px",
                  }}
                >
                  {departments.map((dept) => (
                    <Form.Check
                      key={dept.id}
                      type="checkbox"
                      label={`${dept.name}`}
                      checked={selectedDepartments.includes(dept.id)}
                      onChange={(e) => {
                        const id = dept.id;
                        setSelectedDepartments((prev) =>
                          e.target.checked
                            ? [...prev, id]
                            : prev.filter((d) => d !== id),
                        );
                      }}
                      className="mb-2"
                    />
                  ))}
                </div>
                <small className="text-muted mt-2 d-block">
                  {selectedDepartments.length} selected:{" "}
                  {selectedDepartments
                    .map(
                      (id) => departments.find((d) => d.id === id)?.name || id,
                    )
                    .join(", ")}
                </small>
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                onClick={() => setShowAssignModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={assignLoading || selectedDepartments.length === 0}
              >
                {assignLoading
                  ? "Assigning..."
                  : `Assign ${selectedDepartments.length} Dept(s)`}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
        {/* UsersManager handles modal - removed */}
        {/* View Report Details Modal */}
        <Modal
          show={showReportDetailModal}
          onHide={() => setShowReportDetailModal(false)}
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
                      {selectedReport.status}
                    </Badge>
                  </Col>
                </Row>
                <Row className="mb-3">
                  <Col md={6}>
                    <strong>Client:</strong>{" "}
                    <p>{selectedReport.client_name || "N/A"}</p>
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
                      <strong>Budget:</strong> <p>${selectedReport.budget}</p>
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
                    <PaperTracker
                      reportId={selectedReport.id}
                      role="admin"
                      view="department-status"
                    />
                  </Col>
                </Row>
                <Row className="mb-4">
                  <Col md={12}>
                    <ReceivingCopy report={selectedReport} role="admin" />
                  </Col>
                </Row>
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
                    <Form onSubmit={handleSendAdminComment}>
                      <Form.Group controlId="adminCommentText">
                        <Form.Label>
                          Send a message to client/department
                        </Form.Label>
                        <Form.Control
                          as="textarea"
                          name="adminComment"
                          rows={3}
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Write your message here..."
                        />
                      </Form.Group>
                      <div className="text-end mt-2">
                        <Button
                          type="submit"
                          disabled={commentLoading || !commentText.trim()}
                        >
                          {commentLoading ? "Sending..." : "Send Message"}
                        </Button>
                      </div>
                    </Form>
                  </Col>
                </Row>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            {selectedReport &&
              selectedReport.status !== "Approved" &&
              selectedReport.status !== "Completed" && (
                <Button
                  variant="success"
                  className="me-2"
                  onClick={() => {
                    handleApprove(selectedReport.id);
                    setShowReportDetailModal(false);
                  }}
                >
                  Approve
                </Button>
              )}
            {selectedReport && selectedReport.status !== "Rejected" && (
              <Button
                variant="danger"
                className="me-2"
                onClick={() => {
                  handleReject(selectedReport.id);
                  setShowReportDetailModal(false);
                }}
              >
                Reject
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => setShowReportDetailModal(false)}
            >
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </div>
  );
}
