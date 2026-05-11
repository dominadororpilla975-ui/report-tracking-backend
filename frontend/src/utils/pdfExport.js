// jspdf & html2canvas required: cd frontend && npm i jspdf html2canvas
export const exportReportPDF = async (report, logs = []) => {
  try {
    const jsPDF = (await import("jspdf")).default;
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.text(report.title || "Record", 20, 30);

    // Status & info
    doc.setFontSize(14);
    doc.text(
      `Status: ${report.status_display || report.status || "N/A"}`,
      20,
      50,
    );
    doc.text(`Department: ${report.department_name || "N/A"}`, 20, 60);
    doc.text(`ID: ${report.id}`, 20, 70);
    doc.text(
      `Submitted: ${report.created_at ? new Date(report.created_at).toLocaleString() : "N/A"}`,
      20,
      80,
    );
    if (report.budget) {
      doc.text(
        `Budget: ₱${parseFloat(report.budget).toLocaleString()}`,
        20,
        90,
      );
    }

    // Timeline
    doc.setFontSize(12);
    doc.text("Timeline / History:", 20, 110);
    let y = 120;
    (logs || []).slice(0, 20).forEach((log) => {
      const action =
        log.action_display || log.action || log.remarks || "Update";
      const date = log.date_updated
        ? new Date(log.date_updated).toLocaleDateString()
        : "N/A";
      const line = `• ${action} (${date})`;
      doc.text(line, 25, y);
      y += 8;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    if (logs.length > 20) {
      doc.text(`... and ${logs.length - 20} more updates`, 25, y);
    }

    doc.save(`Record_${report.id || "unknown"}.pdf`);
  } catch (error) {
    console.error("PDF export failed:", error);
    alert("PDF export requires jspdf. Run: cd frontend && npm i jspdf");
  }
};
