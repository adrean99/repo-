import { useState, useEffect } from "react";
import io from "socket.io-client";
import {
  Container,
  Typography,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Alert,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import apiClient from"../utils/apiClient";
import { useNavigate, Link } from "react-router-dom";

const socket = io("https://elms-backend.onrender.com"); // Initialize WebSocket connection

const ManagerDashboard = () => {
  const [notifications, setNotifications] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchLeaveRequests = async () => {
      try {
        const res = await apiClient.get("/api/leaves", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLeaveRequests(res.data);
      } catch (error) {
        console.error("Error fetching leave requests:", error);
        if (error.response && error.response.status === 401) {
          localStorage.removeItem("token");
          navigate("/login");
        } else {
          setNotifications((prev) => [
            ...prev, "Failed to fetch leave requests.Please try again later",
          ]);
        }
      }
    };

    fetchLeaveRequests();

    socket.on("leaveRequest", (data) => {
      setNotifications((prev) => [...prev, data.message]);
    });

    socket.on("leaveUpdate", (data) => {
      setNotifications((prev) => [...prev, data.message]);
    });

    return () => {
      socket.off("leaveRequest");
      socket.off("leaveUpdate");
    };
  }, [navigate]);

  // Approve or Reject Leave Request
  const handleLeaveRequestStatus = async (id, status) => {
    try {
      await apiClient.put(
        `/api/leaves/${id}`,
        { status },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      setLeaveRequests((prevRequests) =>
        prevRequests.map((leave) =>
          leave._id === id ? { ...leave, status } : leave
        )
      );

      setNotifications((prev) => [
        ...prev,
        `Leave request has been ${status.toLowerCase()}.`,
      ]);
    } catch (error) {
      console.error("Error updating leave request:", error);
    }
  };

  const toggleDrawer = (open) => {
    setIsDrawerOpen(open);
  };

  return (
    <Container maxWidth="lg">
      {/* Hamburger Menu */}
      <IconButton
        onClick={() => toggleDrawer(true)}
        sx={{
          position: "absolute",
          left: 10,
          top: 10,
          zIndex: 1,
          backgroundColor: "white",
          boxShadow: 2,
        }}
      >
        <MenuIcon />
      </IconButton>

      {/* Hamburger Drawer */}
      <Drawer anchor="left" open={isDrawerOpen} onClose={() => toggleDrawer(false)}>
        <List sx={{ width: 250 }}>
          <ListItem
            component={Link} 
            to="/leave-calendar"
            onClick={() => toggleDrawer(false)} 
          >
            <ListItemText primary="Leave Calendar" />
          </ListItem>
          <ListItem
            button 
            onClick={() => {
              localStorage.removeItem("token");
              navigate("/login");
              toggleDrawer(false); 
          }}>
            <ListItemText primary="Logout" />
          </ListItem>
        </List>
      </Drawer>

      <Paper elevation={3} sx={{ padding: 4, marginTop: 4 }}>
        <Typography variant="h5" gutterBottom>Admin Dashboard</Typography>

        {/* Notifications */}
        <Paper elevation={3} sx={{ padding: 4, marginTop: 2 }}>
          <Typography variant="h6" gutterBottom>Notifications</Typography>
          {notifications.length > 0 ? (
            notifications.map((notif, index) => (
              <Alert key={index} severity="info" sx={{ marginBottom: 1 }}>
                {notif}
              </Alert>
            ))
          ) : (
            <Typography>No new notifications.</Typography>
          )}
        </Paper>

        {/* Leave Requests Table */}
        <Paper elevation={3} sx={{ padding: 4, marginTop: 4 }}>
          <Typography variant="h6" gutterBottom>Leave Requests</Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leaveRequests.map((leave) => (
                <TableRow key={leave._id}>
                  <TableCell>{leave.employeeId.name}</TableCell>
                  <TableCell>{leave.reason}</TableCell>
                  <TableCell>{new Date(leave.startDate).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(leave.endDate).toLocaleDateString()}</TableCell>
                  <TableCell>{leave.status}</TableCell>
                  <TableCell>
                    {leave.status === "Pending" ? (
                      <>
                        <Button
                          variant="contained"
                          color="success"
                          onClick={() => handleLeaveRequestStatus(leave._id, "Approved")}
                          sx={{ mr: 1 }}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="contained"
                          color="error"
                          onClick={() => handleLeaveRequestStatus(leave._id, "Rejected")}
                        >
                          Reject
                        </Button>
                      </>
                    ) : (
                      <Typography color={leave.status === "Approved" ? "green" : "red"}>
                        {leave.status}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Paper>
    </Container>
  );
};

export default ManagerDashboard;
