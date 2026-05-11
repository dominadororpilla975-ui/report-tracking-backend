import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

const AnalyticsCard = ({
  title,
  data,
  dataKey,
  type = "pie",
  labelKey = "name",
}) => {
  return (
    <div className="card h-100">
      <div className="card-header">
        <h5 className="card-title mb-0">{title}</h5>
      </div>
      <div className="card-body p-3">
        <div style={{ width: "100%", height: 350, minHeight: 350 }}>
          <ResponsiveContainer width="100%" height={300}>
            {type === "pie" && data.length > 0 && (
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey={dataKey}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            )}

            {type === "line" && data.length > 0 && (
              <LineChart data={data} width={300} height={300}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={labelKey} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey={dataKey} stroke="#8884d8" />
              </LineChart>
            )}
            {type === "bar" && data.length > 0 && (
              <BarChart data={data} width={300} height={300}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={labelKey} />
                <YAxis />
                <Tooltip />
                <Bar dataKey={dataKey} fill="#8884d8" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsCard;
