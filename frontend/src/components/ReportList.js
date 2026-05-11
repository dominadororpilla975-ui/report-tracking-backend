import React from "react";
import { Table, Button, Badge } from "react-bootstrap";
import API from "../services/api";

export default function ReportList({
  reports,
  role,
  refresh,
  onReassign,
  onView,
}) {
  const updateStatus = async (reportId, status) => {
    try {
      let url = "";
      if (role === "staff") url = `/staff/report/${reportId}/status`;
      if (role === "department") url = `/department/report/${reportId}/status`;
      if (url) {
        await API.put(url, { status });
        refresh();
      }
    } catch (err) {
      console.error("Error updating report:", err);
      alert(err.response?.data?.message || "Error updating record");
    }
  };

  return (
    <Table striped bordered hover responsive>
      <thead>
        <tr>
          <th>ID</th>
          <th>Title</th>
          <th>Client</th>
          <th>Department</th>
          <th>Status</th>
          {role !== "client" && <th>Action</th>}
        </tr>
      </thead>
      <tbody>
        {reports && reports.length > 0 ? (
          reports.map((r) => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{r.title}</td>
              <td>{r.client_name || r.client_email || r.client_id || "N/A"}</td>
              <td>
                {r.department_name ? (
                  <Badge bg="info">{r.department_name}</Badge>
                ) : r.department_id ? (
                  <Badge bg="info">Dept {r.department_id}</Badge>
                ) : (
                  "Unassigned"
                )}
              </td>
              <td>
                <Badge bg="secondary">{r.status || "Pending"}</Badge>
              </td>
              {role !== "client" && (
                <td>
                  {role !== "department" && (
                    <Button
                      size="sm"
                      onClick={() => updateStatus(r.id, "Processing")}
                    >
                      Mark Processing
                    </Button>
                  )}
                  {role === "department" && (
                    <>
                      {onView && (
                        <Button
                          size="sm"
                          variant="info"
                          className="me-2"
                          onClick={() => onView(r)}
                          title="View record details"
                        >
                          View
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => updateStatus(r.id, "Approved")}
                        className="me-2"
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => updateStatus(r.id, "Rejected")}
                        className="me-2"
                      >
                        Reject
                      </Button>
                      {onReassign && (
                        <Button
                          size="sm"
                          variant="warning"
                          onClick={() => onReassign(r)}
                          title="Reassign to another department"
                        >
                          🔄 Reassign
                        </Button>
                      )}
                    </>
                  )}
                </td>
              )}
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan="6" className="text-center">
              No records found
            </td>
          </tr>
        )}
      </tbody>
    </Table>
  );
}
