import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Home from  "./pages/Home";
import NotFound from "./pages/NotFound";
import LeaveCalendar from "./pages/LeaveCalendar";

const PrivateRoute = ({ children, allowedRoles }) => {
  const { user } = useContext(AuthContext);
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/leave-calendar" element={<LeaveCalendar />} />
          <Route path="/" element={<Home />} />
          <Route path="/" element={<NotFound />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<PrivateRoute allowedRoles={["Employee", "Manager", "Admin"]}><Dashboard /></PrivateRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}


export default App;



