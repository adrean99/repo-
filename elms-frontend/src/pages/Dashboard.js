import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Button, Container, Typography, Paper } from "@mui/material";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    
    <Container maxWidth="md" className="mt-10">
      <Paper className="p-6 shadow-lg">
        <Typography variant="h4">Welcome, {user?.role}</Typography>
        {user?.role === "Admin" && <Typography>Admin Dashboard: Manage Users & Leaves</Typography>}
        {user?.role === "Manager" && <Typography>Manager Dashboard: Approve/Reject Leaves</Typography>}
        {user?.role === "Employee" && <Typography>Employee Dashboard: Apply for Leave</Typography>}
        <Button component={Link} to="/leave-calendar" variant="contained" color="secondary">Leave Calendar</Button>
        <Button variant="contained" color="secondary" className="mt-4" onClick={logout}>Logout</Button>
      </Paper>
    </Container>
  );
};

export default Dashboard;
