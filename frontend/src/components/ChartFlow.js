import React, { useEffect, useState } from "react";
import { Card, Row, Col, ProgressBar } from "react-bootstrap";

const ChartFlow = ({ stats, type = "admin" }) => {
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    if (stats) {
      setChartData(stats);
    }
  }, [stats]);

  if (!chartData) {
    return (
      <div className="text-center text-muted p-4">Loading chart data...</div>
    );
  }

  // Process status counts for pie chart simulation
  const statusCounts = chartData.status_counts || [];
  const totalRecords = statusCounts.reduce((sum, item) => sum + item.count, 0);

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      Pending: "warning",
      "Under Review": "info",
      Assigned: "primary",
      Processing: "secondary",
      Approved: "success",
      Rejected: "danger",
      Completed: "success",
    };
    return colors[status] || "secondary";
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return "₱0.00";
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  return (
    <div className="chart-flow-container">
      <Row className="g-3">
        {/* Status Distribution Card */}
        <Col md={6} lg={4}>
          <Card className="h-100 shadow-sm">
            <Card.Header className="bg-primary text-white">
              <h6 className="mb-0">📊 Record Status Distribution</h6>
            </Card.Header>
            <Card.Body>
              {statusCounts.length > 0 ? (
                <>
                  <div className="mb-3">
                    <strong>Total Records: {totalRecords}</strong>
                  </div>
                  {statusCounts.map((item, idx) => (
                    <div key={idx} className="mb-2">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span>
                          <span
                            className={`badge bg-${getStatusColor(item.status)} me-2`}
                          >
                            ●
                          </span>
                          {item.status}
                        </span>
                        <span className="fw-bold">{item.count}</span>
                      </div>
                      <ProgressBar
                        now={(item.count / totalRecords) * 100}
                        variant={getStatusColor(item.status)}
                        style={{ height: "6px" }}
                      />
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-muted text-center">No data available</p>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Department Workload Card */}
        <Col md={6} lg={4}>
          <Card className="h-100 shadow-sm">
            <Card.Header className="bg-info text-white">
              <h6 className="mb-0">🏢 Department Workload</h6>
            </Card.Header>
            <Card.Body style={{ maxHeight: "300px", overflowY: "auto" }}>
              {chartData.department_workload &&
              chartData.department_workload.length > 0 ? (
                chartData.department_workload.slice(0, 10).map((dept, idx) => (
                  <div key={idx} className="mb-2">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span
                        className="text-truncate"
                        style={{ maxWidth: "150px" }}
                      >
                        {dept.department}
                      </span>
                      <span className="badge bg-secondary">
                        {dept.report_count}
                      </span>
                    </div>
                    <ProgressBar
                      now={
                        (dept.report_count /
                          Math.max(
                            ...chartData.department_workload.map(
                              (d) => d.report_count,
                            ),
                            1,
                          )) *
                        100
                      }
                      variant="info"
                      style={{ height: "4px" }}
                    />
                  </div>
                ))
              ) : (
                <p className="text-muted text-center">No department data</p>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Budget Overview Card */}
        <Col md={6} lg={4}>
          <Card className="h-100 shadow-sm">
            <Card.Header className="bg-success text-white">
              <h6 className="mb-0">💰 Budget Overview</h6>
            </Card.Header>
            <Card.Body>
              {chartData.budget_stats ? (
                <>
                  <div className="text-center mb-3">
                    <h4 className="text-success">
                      {formatCurrency(chartData.budget_stats.total_budget || 0)}
                    </h4>
                    <small className="text-muted">Total Budget</small>
                  </div>
                  <Row className="text-center">
                    <Col>
                      <div className="border rounded p-2">
                        <h5 className="text-info">
                          {formatCurrency(
                            chartData.budget_stats.approved_budget || 0,
                          )}
                        </h5>
                        <small>Approved</small>
                      </div>
                    </Col>
                    <Col>
                      <div className="border rounded p-2">
                        <h5 className="text-warning">
                          {chartData.budget_stats.reports_with_budget || 0}
                        </h5>
                        <small>With Budget</small>
                      </div>
                    </Col>
                  </Row>
                </>
              ) : (
                <p className="text-muted text-center">No budget data</p>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Monthly Trend Card */}
        {chartData.monthly_trend && chartData.monthly_trend.length > 0 && (
          <Col md={12}>
            <Card className="shadow-sm">
              <Card.Header className="bg-dark text-white">
                <h6 className="mb-0">📈 Monthly Submission Trend</h6>
              </Card.Header>
              <Card.Body>
                <div
                  className="d-flex align-items-end"
                  style={{ height: "150px" }}
                >
                  {chartData.monthly_trend.map((month, idx) => (
                    <div key={idx} className="flex-fill text-center mx-1">
                      <div
                        className="bg-primary rounded"
                        style={{
                          height: `${Math.max((month.count / Math.max(...chartData.monthly_trend.map((m) => m.count), 1)) * 100, 10)}%`,
                          minHeight: "10px",
                        }}
                      ></div>
                      <div className="mt-2">
                        <small className="text-muted">{month.month}</small>
                        <div className="fw-bold">{month.count}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>
        )}

        {/* Workflow Flow Card */}
        <Col md={12}>
          <Card className="shadow-sm">
            <Card.Header
              className="bg-gradient"
              style={{
                background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
                color: "white",
              }}
            >
              <h6 className="mb-0">🔄 Record Processing Flow</h6>
            </Card.Header>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center flex-wrap">
                {[
                  "Pending",
                  "Under Review",
                  "Assigned",
                  "Processing",
                  "Approved",
                  "Completed",
                ].map((step, idx) => (
                  <React.Fragment key={step}>
                    <div className="text-center">
                      <div
                        className={`rounded-circle d-flex align-items-center justify-content-center ${statusCounts.find((s) => s.status === step)?.count > 0 ? "bg-success" : "bg-secondary"}`}
                        style={{
                          width: "50px",
                          height: "50px",
                          color: "white",
                          opacity:
                            statusCounts.find((s) => s.status === step)?.count >
                            0
                              ? 1
                              : 0.5,
                        }}
                      >
                        <strong>
                          {statusCounts.find((s) => s.status === step)?.count ||
                            0}
                        </strong>
                      </div>
                      <small className="d-block mt-1">{step}</small>
                    </div>
                    {idx < 5 && (
                      <div className="flex-fill mx-2">
                        <div
                          className={`border-top ${
                            statusCounts.find((s) => s.status === step)?.count >
                            0
                              ? "border-success"
                              : "border-secondary"
                          }`}
                        ></div>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ChartFlow;
