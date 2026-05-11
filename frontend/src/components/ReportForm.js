import React, { useState, useEffect } from "react";
import { Form, Button, Alert, Row, Col } from "react-bootstrap";
import Select from "react-select";
import API from "../services/api";

export default function ReportForm({ clientId, refresh }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [budget, setBudget] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [deptOptions, setDeptOptions] = useState([]);

  useEffect(() => {
    const loadDepts = async () => {
      try {
        const res = await API.get("/admin/departments");
        const options = (res.data || []).map((d) => ({
          value: d.id,
          label: d.name,
        }));
        setDeptOptions(options);
      } catch (err) {
        console.error("Error fetching departments", err);
      }
    };
    loadDepts();
  }, []);

  const [files, setFiles] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      if (clientEmail) {
        formData.append("client_email", clientEmail);
        formData.append("client_name", clientName);
      } else if (clientId) {
        formData.append("client_id", clientId);
      }
      formData.append("budget", parseFloat(budget) || 0);
      if (selectedDepartments.length > 0) {
        formData.append(
          "departments",
          JSON.stringify(selectedDepartments.map((d) => d.value)),
        );
      }
      files.forEach((file) => {
        formData.append("attachments", file);
      });

      await API.post("/client/report", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setTitle("");
      setDescription("");
      setBudget("");
      setSelectedDepartments([]);
      setFiles([]);
      refresh();
    } catch (err) {
      setError(err.response?.data?.message || "Error submitting record");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error && (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      )}
      <Form onSubmit={handleSubmit} className="mb-4">
        <Row>
          <Col md={6}>
            <Form.Group className="mb-2">
              <Form.Label>Client Name *</Form.Label>
              <Form.Control
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Client full name"
                required
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-2">
              <Form.Label>Client Email *</Form.Label>
              <Form.Control
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@example.com"
                required
              />
            </Form.Group>
          </Col>
        </Row>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-2">
              <Form.Control
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Record title"
                required
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-2">
              <Form.Control
                type="number"
                name="budget"
                placeholder="Budget amount (PHP)"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                min="0"
                step="0.01"
              />
            </Form.Group>
          </Col>
        </Row>
        <Form.Group className="mb-2">
          <Form.Control
            as="textarea"
            name="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Record description"
            required
          />
        </Form.Group>
        <Form.Group className="mb-2">
          <label htmlFor="attachments">📎 Attachments (optional)</label>
          <input
            id="attachments"
            type="file"
            name="attachments"
            className="form-control"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files))}
            accept=".pdf,.doc,.docx,.jpg,.png"
          />

          <small className="text-muted">{files.length} files selected</small>
        </Form.Group>
        <Form.Group className="mb-2">
          <Select
            isMulti
            options={deptOptions}
            value={selectedDepartments}
            onChange={setSelectedDepartments}
            placeholder="Select departments for workflow (optional)"
          />
        </Form.Group>
        <Button type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit Record"}
        </Button>
      </Form>
    </>
  );
}
