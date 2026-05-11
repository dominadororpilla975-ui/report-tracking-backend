import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ClientDashboard from "./pages/ClientDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import DepartmentDashboard from "./pages/DepartmentDashboard";
import ModernDashboard from "./pages/ModernDashboard";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/modern-dashboard" element={<ModernDashboard />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/client-dashboard" element={<ClientDashboard />} />
        <Route path="/staff-dashboard" element={<StaffDashboard />} />
        <Route path="/department-dashboard" element={<DepartmentDashboard />} />
        <Route path="/client-dashboard/report" element={<ClientDashboard />} />
        <Route
          path="/client-dashboard/reporting"
          element={<Navigate to="/client-dashboard?tab=submit" replace />}
        />
        <Route
          path="/client-report"
          element={<Navigate to="/client-dashboard?tab=submit" replace />}
        />
        <Route
          path="/client/reporting"
          element={<Navigate to="/client-dashboard?tab=submit" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
