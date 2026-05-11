import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Badge,
  Alert,
  Row,
  Col,
} from "react-bootstrap";
import DepartmentSelect from "../DepartmentSelect";
import PasswordInput from "../PasswordInput";
import API from "../../services/api";

const UsersManager = ({ departments, onUserCreated }) => {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "staff",
    department_id: "",
  });
  const currentUserId = localStorage.getItem("userId");

  const fetchUsers = async () => {
    try {
      const res = await API.get("/admin/users");
      setUsers(res.data || []);
    } catch (err) {
      setError("Failed to fetch users");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError("Name, email, password required");
      return;
    }

    if (form.role === "department" && !form.department_id) {
      setError("Please select a department for department head accounts.");
      return;
    }

    setLoading(true);
    try {
      await API.post("/admin/create-user", {
        ...form,
        department_id: form.department_id || null,
      });
      setSuccess("User created + Gmail sent!");
      setError("");
      setForm({
        name: "",
        email: "",
        password: "",
        role: "staff",
        department_id: "",
      });
      fetchUsers();
      if (onUserCreated) onUserCreated();
      setTimeout(() => setShowModal(false), 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Create failed");
      setSuccess("");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (user) => {
    if (String(user.id) === currentUserId)
      return setError("Cannot delete self");
    if (!window.confirm(`Delete ${user.name}?`)) return;

    API.delete(`/admin/user/${user.id}`)
      .then(() => {
        fetchUsers();
        setSuccess("User deleted");
      })
      .catch(() => setError("Delete failed"));
  };

  const getRoleBadge = (role) => {
    const variants = {
      admin: "danger",
      department: "warning",
      client: "success",
      staff: "info",
    };
    return <Badge bg={variants[role] || "secondary"}>{role}</Badge>;
  };

  const roleChange = (role) => {
    if (role === "client") setForm({ ...form, department_id: "" });
    setForm({ ...form, role });
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Users Management</h4>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          + Create User
        </Button>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      <Table striped bordered hover responsive className="modern-table">
        <thead className="table-dark">
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Department</th>
            <th>Temp Password</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>#{user.id}</td>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{getRoleBadge(user.role)}</td>
              <td>{user.department_name || "-"}</td>
              <td>
                {user.role === "client" ? user.temp_password || "N/A" : "-"}
              </td>
              <td>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleDelete(user)}
                  disabled={String(user.id) === currentUserId}
                >
                  {String(user.id) === currentUserId ? "Current" : "Delete"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Modern Create User Modal */}
      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        size="md"
        centered
      >
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>Create User Account</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreate}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Full Name *</Form.Label>
                  <Form.Control
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="John Doe"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Email *</Form.Label>
                  <Form.Control
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    placeholder="client@gmail.com"
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Role *</Form.Label>
                  <Form.Select
                    value={form.role}
                    onChange={(e) => roleChange(e.target.value)}
                  >
                    <option value="staff">Staff Member</option>
                    <option value="department">Department Head</option>
                    <option value="client">Client</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Department</Form.Label>
                  <DepartmentSelect
                    departments={departments}
                    value={form.department_id}
                    onChange={(e) =>
                      setForm({ ...form, department_id: e.target.value })
                    }
                    placeholder="Select (optional)"
                    includeAllOption
                    allOptionLabel="No Department"
                  />
                  {form.role === "department" && (
                    <Form.Text className="text-muted">
                      Required for department head accounts.
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">
                Password * (12+ chars)
              </Form.Label>
              <PasswordInput
                id="createUserPassword"
                name="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Secure password"
                disabled={loading}
                minLength={6}
                autoComplete="new-password"
                className=""
              />
              <small className="text-muted">
                Auto-sent to email + system login link
              </small>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="success" type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create & Send Email"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
};

export default UsersManager;
