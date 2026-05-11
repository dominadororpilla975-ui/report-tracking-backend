import React, { useEffect, useRef, useState } from "react";
import { Button, Badge } from "react-bootstrap";
import API from "../services/api";
import "../styles/ReceivingCopy.css";

const getStampLabel = (status) => {
  if (status === "Approved" || status === "Completed") return "RECEIVED";
  if (status === "Rejected") return "REJECTED";
  if (status === "In Progress" || status === "In Review") return "IN REVIEW";
  return "PENDING";
};

const getStampClass = (status) => {
  if (status === "Approved" || status === "Completed") return "approved";
  if (status === "Rejected") return "rejected";
  if (status === "In Progress" || status === "In Review") return "review";
  return "pending";
};

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString();
};

function ReceivingCopy({ report, role = "client" }) {
  const logoLeftSrc = "/logo.jpg"; // Municipality logo
  const logoRightSrc = "/bagongpilipinas.jpg"; // Bagong Pilipinas logo
  const [workflowSteps, setWorkflowSteps] = useState([]);
  const [loading, setLoading] = useState(false);
  const copyRef = useRef(null);

  useEffect(() => {
    const fetchWorkflow = async () => {
      if (!report?.id) return;

      setLoading(true);
      try {
        const res = await API.get(`/workflow/${report.id}/history`);
        setWorkflowSteps(res.data.workflow_steps || []);
      } catch (err) {
        console.error("Error fetching receiving copy workflow:", err);
        setWorkflowSteps([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflow();
  }, [report?.id]);

  if (!report) return null;

  const handleDownloadPdf = async () => {
    if (!copyRef.current) return;

    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      const canvas = await html2canvas(copyRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
      });
      const imageData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imageWidth = pageWidth - 20;
      const imageHeight = (canvas.height * imageWidth) / canvas.width;
      let remainingHeight = imageHeight;
      let position = 10;

      pdf.addImage(imageData, "PNG", 10, position, imageWidth, imageHeight);
      remainingHeight -= pageHeight - 20;

      while (remainingHeight > 0) {
        position = remainingHeight - imageHeight + 10;
        pdf.addPage();
        pdf.addImage(imageData, "PNG", 10, position, imageWidth, imageHeight);
        remainingHeight -= pageHeight - 20;
      }

      pdf.save(`Receiving_Copy_${report.id}.pdf`);
    } catch (err) {
      console.error("Receiving copy PDF export failed:", err);
      alert("Unable to download receiving copy PDF.");
    }
  };

  const handlePrint = () => {
    if (!copyRef.current) return;

    const printWindow = window.open("", "_blank", "width=1000,height=800");
    if (!printWindow) return;

    const styles = Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          return Array.from(sheet.cssRules)
            .map((rule) => rule.cssText)
            .join("\n");
        } catch {
          return "";
        }
      })
      .join("\n");

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Receiving Copy #${report.id}</title>
          <style>
            @page {
              margin: 0.5in;
              size: letter;
            }
            
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            
            body {
              margin: 0;
              padding: 0;
              font-family: "Times New Roman", serif;
              color: #000;
              background: #fff;
            }
            
            ${styles}
          </style>
        </head>
        <body>
          ${copyRef.current.outerHTML}
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  };

  return (
    <div className="receiving-copy-panel">
      <div className="receiving-copy-actions">
        <div>
          <h5 className="mb-1">Receiving Copy</h5>
          <p className="text-muted mb-0">
            {role === "admin"
              ? "Admin copy with department stamps."
              : role === "department"
                ? "Department copy with workflow stamps."
                : "Client copy with department stamps."}
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button size="sm" variant="outline-dark" onClick={handlePrint}>
            Print Receiving Copy
          </Button>
          <Button size="sm" variant="dark" onClick={handleDownloadPdf}>
            Download PDF
          </Button>
        </div>
      </div>

      <div className="receiving-copy-document" ref={copyRef}>
        <div className="receiving-copy-official-header">
          <div className="receiving-copy-logo-slot receiving-copy-logo-slot-left">
            <img
              src={logoLeftSrc}
              alt="Bayan ng Carranglan logo"
              className="receiving-copy-logo"
            />
          </div>
          <div className="receiving-copy-heading-text">
            <div className="receiving-copy-kicker">
              Republic of the Philippines
            </div>
            <div className="receiving-copy-subtitle">
              Province of Nueva Ecija
            </div>
            <div className="receiving-copy-title-main">
              Municipality of Carranglan
            </div>
            <div className="receiving-copy-subtitle small">
              Report Tracking System
            </div>
            <div className="receiving-copy-office-line">
              Office of Records Receiving and Routing
            </div>
          </div>
          <div className="receiving-copy-logo-slot receiving-copy-logo-slot-right">
            <img
              src={logoRightSrc}
              alt="Bagong Pilipinas logo"
              className="receiving-copy-logo"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/logo192.png";
              }}
            />
          </div>
        </div>

        <div className="receiving-copy-title-section">
          <h2 className="receiving-copy-main-title">RECEIVING COPY</h2>
        </div>

        <div className="receiving-copy-certificate-body">
          <p>
            This is to certify that the document entitled{" "}
            <strong>{report.title || "Untitled Record"}</strong>, filed by{" "}
            <strong>
              {report.client_name || report.client_email || "Client"}
            </strong>
            , was received and recorded under Reference No.{" "}
            <strong>
              RTS-{report.id}-{new Date().getFullYear()}
            </strong>
            .
          </p>
          <p>
            The said document is currently marked as{" "}
            <strong>
              {report.status_display || report.status || "Pending"}
            </strong>
            {report.department_name
              ? ` and is routed through ${report.department_name}.`
              : " and is awaiting department routing."}
          </p>
          <p>
            Description / purpose:{" "}
            <strong>{report.description || "No description provided."}</strong>
          </p>
          <p>
            Given this {new Date().getDate()} day of{" "}
            {new Date().toLocaleDateString("en-US", { month: "long" })},{" "}
            {new Date().getFullYear()} at Carranglan, Nueva Ecija, Philippines.
          </p>
        </div>

        <div className="receiving-copy-stamps">
          <div className="receiving-copy-section-title">
            Department Stamps and Signatures
          </div>

          {loading ? (
            <p className="text-muted mb-0">Loading receiving route...</p>
          ) : workflowSteps.length > 0 ? (
            workflowSteps.map((step, index) => {
              const stampClass = getStampClass(step.status);
              const stampLabel = getStampLabel(step.status);
              const isStamped = stampClass !== "pending";

              return (
                <div className="receiving-copy-stamp-row" key={step.id}>
                  <div className="receiving-copy-step">#{index + 1}</div>
                  <div className="receiving-copy-department">
                    <strong>{step.department_name}</strong>
                    <div>
                      <Badge bg="light" text="dark">
                        {step.status}
                      </Badge>
                    </div>
                    <small>Assigned: {formatDate(step.assigned_date)}</small>
                    {step.completed_date && (
                      <small>
                        Completed: {formatDate(step.completed_date)}
                      </small>
                    )}
                  </div>
                  <div className={`receiving-copy-stamp ${stampClass}`}>
                    <div className="stamp-label">{stampLabel}</div>
                    <div className="stamp-date">
                      {formatDate(step.completed_date || step.assigned_date)}
                    </div>
                  </div>
                  <div className="receiving-copy-signature">
                    <div className="signature-line">
                      {isStamped && step.signature_url ? (
                        <img
                          src={step.signature_url}
                          alt={
                            step.department_name
                              ? `${step.department_name} signature`
                              : "Department signature"
                          }
                        />
                      ) : isStamped ? (
                        step.user_name || step.department_name
                      ) : (
                        ""
                      )}
                    </div>
                    <span>
                      {isStamped
                        ? step.signature_url
                          ? "Department Signature"
                          : step.user_name || "Department Representative"
                        : "Pending Signature"}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-muted mb-0">
              No department route has been assigned yet.
            </p>
          )}
        </div>

        <div className="receiving-copy-footer">
          <p>
            This document serves as official proof of receipt and processing
            status for the referenced record.
          </p>
          <p>
            Generated by Report Tracking System - Bayan ng Carranglan, Nueva
            Ecija
          </p>
          <p className="receiving-copy-footer-note">
            This is a system-generated document and requires no signature.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ReceivingCopy;
