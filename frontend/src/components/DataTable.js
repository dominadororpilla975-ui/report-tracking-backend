import React from "react";
import "../styles/ModernDashboard.css";

export default function DataTable({
  title,
  columns,
  data,
  actions,
  onAction,
  filters,
  onFilterChange,
  loading,
}) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");

  React.useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange?.({
        search: searchTerm,
        status: statusFilter,
        date_from: dateFrom,
        date_to: dateTo,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter, dateFrom, dateTo, onFilterChange]);

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">{title}</h2>
        <div className="section-actions">
          <button className="btn btn-primary">➕ Add New</button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar mb-3 p-3 bg-light rounded">
        <div className="row g-2">
          <div className="col-md-3">
            <input
              name="search"
              className="form-control"
              placeholder="Search title/description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {filters?.includes("status") && (
            <div className="col-md-2">
              <select
                name="status"
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Assigned">Assigned</option>
                <option value="Processing">Processing</option>
                <option value="Completed">Completed</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          )}
          <div className="col-md-2">
            <input
              name="date_from"
              type="date"
              className="form-control"
              placeholder="From Date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="col-md-2">
            <input
              name="date_to"
              type="date"
              className="form-control"
              placeholder="To Date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <button
              className="btn btn-outline-secondary w-100"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("");
                setDateFrom("");
                setDateTo("");
              }}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      <div className="modern-table-wrapper">
        {loading ? (
          <div className="text-center p-5">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          <table className="modern-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className={col.sortable ? "sortable" : ""}>
                    {col.label}
                    {col.sortable && (
                      <span className="sort-icons">
                        <i
                          className="bi bi-arrow-up-short"
                          onClick={() =>
                            onFilterChange?.({ sort: col.key, dir: "ASC" })
                          }
                        />
                        <i
                          className="bi bi-arrow-down-short"
                          onClick={() =>
                            onFilterChange?.({ sort: col.key, dir: "DESC" })
                          }
                        />
                      </span>
                    )}
                  </th>
                ))}
                {actions && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (actions ? 1 : 0)}
                    className="text-center py-4"
                  >
                    No records found {searchTerm && "(try adjusting filters)"}
                  </td>
                </tr>
              ) : (
                data.map((row, idx) => (
                  <tr key={idx}>
                    {columns.map((col) => (
                      <td key={col.key}>
                        {col.render
                          ? col.render(row[col.key], row)
                          : row[col.key]}
                      </td>
                    ))}
                    {actions && (
                      <td>
                        <div className="table-actions">
                          {actions.map((action) => (
                            <button
                              key={action.label}
                              className="table-action-btn"
                              onClick={() => onAction?.(action.id, row)}
                            >
                              {action.label}
                            </button>
                          ))}
                          <button
                            className="table-action-btn btn-pdf"
                            onClick={() => {
                              import("../utils/pdfExport").then(
                                ({ exportReportPDF }) => {
                                  exportReportPDF(row, row.logs || []);
                                },
                              );
                            }}
                            title="Download PDF"
                          >
                            📄 PDF
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
