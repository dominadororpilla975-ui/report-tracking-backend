import React from "react";
import { ProgressBar, Badge } from "react-bootstrap";

export default function ReportTracker({ report }) {
  /**
   * report = {
   *   status: "Assigned",
   *   department_id: 2
   * }
   */

  const statusSteps = [
    { status: "Pending", label: "Submitted" },
    { status: "Under Review", label: "Admin Review" },
    { status: "Assigned", label: "Assigned to Dept" },
    { status: "Processing", label: "Processing Dept" },
    { status: "Approved", label: "Approved" },
    { status: "Rejected", label: "Rejected" },
    { status: "Completed", label: "Completed" },
  ];

  const departmentNames = {
    1: "Budget",
    2: "Treasury",
    3: "Accounting",
  };

  const currentIndex = statusSteps.findIndex((s) => s.status === report.status);
  const percent = ((currentIndex + 1) / statusSteps.length) * 100;

  return (
    <div className="mb-3">
      <ProgressBar now={percent} label={report.status} />
      {report.department_id && (
        <div className="mt-1">
          <Badge bg="info">{departmentNames[report.department_id]}</Badge>
        </div>
      )}
    </div>
  );
}
