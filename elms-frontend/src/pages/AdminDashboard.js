import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Paper,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Alert,
  Drawer,
  List,
  ListItem,
  ListItemText,
  IconButton,
  AppBar,
  Toolbar,
  Modal,
  Box,
  TableContainer,
  Chip,
  Tooltip,
  Divider,
  TextField,
  Grid,
  Avatar,
  CircularProgress,
  Input,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { styled } from "@mui/system";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import "react-big-calendar/lib/css/react-big-calendar.css";

// Date-fns setup for react-big-calendar
const locales = {
  "en-US": require("date-fns/locale/en-US"),
};
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Helper function to calculate the next working day (assuming Mon-Fri workweek)
const calculateNextWorkingDay = (date) => {
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  const dayOfWeek = nextDay.getDay();
  if (dayOfWeek === 0) nextDay.setDate(nextDay.getDate() + 1); // Move to Monday
  else if (dayOfWeek === 6) nextDay.setDate(nextDay.getDate() + 2); // Move to Monday
  return nextDay.toISOString();
};

// Validation helper functions
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhoneNumber = (phoneNumber) => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber);
};

// Styled components for custom styling
const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: "#1976d2",
}));

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  "& .MuiDrawer-paper": {
    width: 250,
    backgroundColor: "#f5f5f5",
  },
}));

const StyledButton = styled(Button)(({ theme }) => ({
  borderRadius: 6,
  textTransform: "none",
  padding: "8px 16px",
}));

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 600,
  bgcolor: "background.paper",
  borderRadius: 8,
  boxShadow: 24,
  p: 4,
  maxHeight: "85vh",
  overflowY: "auto",
};

const AdminDashboard = () => {
  const { token, logout, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [shortLeaves, setShortLeaves] = useState([]);
  const [annualLeaves, setAnnualLeaves] = useState([]);
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [setError] = useState(null);
  const [calendarError, setCalendarError] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingEvents, setIsFetchingEvents] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("Short Leave Requests");
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null); // Added: For event modal
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    department: "",
    phoneNumber: "",
    profilePicture: null, // Changed: Now stores a File object
    chiefOfficerName: "",
    supervisorName: "",
    personNumber: "",
    email: "",
    sector: "",
    sectionalHeadName: "",
    departmentalHeadName: "",
    HRDirectorName: "",
  });
  const [formErrors, setFormErrors] = useState({}); // Added: For form validation

  const localToken = localStorage.getItem("token");
  const effectiveToken = token || localToken;
  const effectiveUser = user || JSON.parse(localStorage.getItem("user") || "{}");

  // Define fetch functions outside useEffect
  const fetchLeaves = async () => {
    try {
      console.log("Fetching leaves with token:", effectiveToken);
      const [shortRes, annualRes] = await Promise.all([
        axios.get("http://localhost:5000/api/leaves/admin/leaves?leaveType=Short%20Leave", {
          headers: { Authorization: `Bearer ${effectiveToken}` },
          timeout: 5000,
        }),
        axios.get("http://localhost:5000/api/leaves/admin/leaves?leaveType=Annual%20Leave", {
          headers: { Authorization: `Bearer ${effectiveToken}` },
          timeout: 5000,
        }),
      ]);
      console.log("Short leaves response:", shortRes.data);
      console.log("Annual leaves response:", annualRes.data);
      setShortLeaves(Array.isArray(shortRes.data) ? shortRes.data : []);
      setAnnualLeaves(Array.isArray(annualRes.data) ? annualRes.data : []);
    } catch (error) {
      console.error("Error fetching leaves:", error.response ? error.response.data : error.message);
      setMessage({ type: "error", text: error.response?.data?.error || "Failed to fetch leaves" });
      if (error.response?.status === 401) {
        logout();
        navigate("/login");
      } else if (error.response?.status === 403) {
        setMessage({ type: "error", text: "You do not have permission to view leaves" });
      }
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/admin/profile", {
        headers: { Authorization: `Bearer ${effectiveToken}` },
        timeout: 5000,
      });
      setProfile(res.data);
      setFormData({
        name: res.data.name || "",
        department: res.data.department || "",
        phoneNumber: res.data.phoneNumber || "",
        profilePicture: null, // File input will be handled separately
        chiefOfficerName: res.data.chiefOfficerName || "",
        supervisorName: res.data.supervisorName || "",
        personNumber: res.data.personNumber || "",
        email: res.data.email || "",
        sector: res.data.sector || "",
        sectionalHeadName: res.data.sectionalHeadName || "",
        departmentalHeadName: res.data.departmentalHeadName || "",
        HRDirectorName: res.data.HRDirectorName || "",
      });
    } catch (error) {
      const errorMsg = error.response
        ? `${error.response.status}: ${error.response.data.error || error.response.statusText}`
        : error.message;
      setMessage({ type: "error", text: `Failed to fetch profile: ${errorMsg}` });
    }
  };

  const fetchLeaveEvents = async () => {
    setIsFetchingEvents(true);
    try {
      const res = await axios.get("http://localhost:5000/api/leaves/all", {
        headers: { Authorization: `Bearer ${effectiveToken}` },
        timeout: 5000,
      });
      const leaveEvents = res.data.map((leave) => ({
        title: `${leave.employeeName} - ${leave.leaveType} (${leave.status})`,
        start: new Date(leave.startDate),
        end: new Date(leave.endDate),
        allDay: true,
        style: {
          backgroundColor:
            leave.status === "Approved" ? "#4caf50" : leave.status === "Rejected" ? "#f44336" : "#ff9800",
          color: "#fff",
        },
      }));
      setEvents(leaveEvents);
      setCalendarError(null);
    } catch (error) {
      const errorMsg = error.response
        ? `${error.response.status}: ${error.response.data.error || error.response.statusText}`
        : error.message;
      setCalendarError(`Failed to fetch leave events: ${errorMsg}`);
    } finally {
      setIsFetchingEvents(false);
    }
  };

  useEffect(() => {
    console.log("AdminDashboard useEffect - Token:", effectiveToken, "Role:", effectiveUser.role);

    if (!effectiveToken) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      await Promise.all([fetchLeaves(), fetchProfile(), fetchLeaveEvents()]);
      setIsLoading(false);
    };

    fetchData();
  }, []);

  const handleAction = async (leaveId, action) => {
    try {
      const leave = [...shortLeaves, ...annualLeaves].find((l) => l._id === leaveId);
      if (!leave) {
        setMessage({ type: "error", text: "Leave not found" });
        return;
      }

      const updates = {};
      const currentDate = new Date().toISOString();
      const isShortLeave = shortLeaves.some((l) => l._id === leaveId);

      if (effectiveUser.role === "Supervisor" && isShortLeave) {
        updates.sectionalHeadRecommendation = action; // Set recommendation
        updates.sectionalHeadDate = currentDate;
        updates.status = action === "Recommended" ? "RecommendedBySectional" : "Pending";
      } else if (effectiveUser.role === "SectionalHead" && !isShortLeave) {
        updates.sectionalHeadRecommendation = action; // Set recommendation
        updates.sectionalHeadDate = currentDate;
        updates.status = action === "Recommended" ? "RecommendedBySectional" : "Pending";
      } else if (effectiveUser.role === "DepartmentalHead" && !isShortLeave) {
        updates.departmentalHeadRecommendation = action; // Set recommendation
        updates.departmentalHeadDate = currentDate;
        updates.departmentalHeadDaysGranted = leave.daysApplied;
        updates.departmentalHeadStartDate = leave.startDate;
        updates.departmentalHeadLastDate = leave.endDate;
        updates.departmentalHeadResumeDate = calculateNextWorkingDay(leave.endDate);
        updates.status = action === "Recommended" ? "RecommendedByDepartmental" : "RecommendedBySectional";
      } else if (effectiveUser.role === "HRDirector") {
        updates.approverRecommendation = action === "Approve" ? "Approved" : "Not Approved"; // Set recommendation
        updates.approverDate = currentDate;
        updates.status = action === "Approve" ? "Approved" : "Rejected";
        // Updated: When HR Director approves/rejects, ensure previous recommendations are set
        if (!leave.sectionalHeadRecommendation) {
          updates.sectionalHeadRecommendation = "Recommended";
          updates.sectionalHeadDate = currentDate;
        }
        if (!leave.departmentalHeadRecommendation && !isShortLeave) {
          updates.departmentalHeadRecommendation = "Recommended";
          updates.departmentalHeadDate = currentDate;
          updates.departmentalHeadDaysGranted = leave.daysApplied;
          updates.departmentalHeadStartDate = leave.startDate;
          updates.departmentalHeadLastDate = leave.endDate;
          updates.departmentalHeadResumeDate = calculateNextWorkingDay(leave.endDate);
        }
      } else if (effectiveUser.role === "Admin") {
        if (isShortLeave) {
          if (action === "Approve" || action === "Reject") {
            updates.approverRecommendation = action === "Approve" ? "Approved" : "Not Approved"; // Set recommendation
            updates.approverDate = currentDate;
            updates.status = action === "Approve" ? "Approved" : "Rejected";
            // Updated: When Admin approves/rejects a short leave, ensure sectional recommendation is set
            if (!leave.sectionalHeadRecommendation) {
              updates.sectionalHeadRecommendation = "Recommended";
              updates.sectionalHeadDate = currentDate;
            }
          } else {
            updates.sectionalHeadRecommendation = action; // Set recommendation
            updates.sectionalHeadDate = currentDate;
            updates.status = action === "Recommended" ? "RecommendedBySectional" : "Pending";
          }
        } else {
          if (action === "Approve" || action === "Reject") {
            updates.approverRecommendation = action === "Approve" ? "Approved" : "Not Approved"; // Set recommendation
            updates.approverDate = currentDate;
            updates.status = action === "Approve" ? "Approved" : "Rejected";
            // Updated: When Admin approves/rejects an annual leave, ensure sectional and departmental recommendations are set
            if (!leave.sectionalHeadRecommendation) {
              updates.sectionalHeadRecommendation = "Recommended";
              updates.sectionalHeadDate = currentDate;
            }
            if (!leave.departmentalHeadRecommendation) {
              updates.departmentalHeadRecommendation = "Recommended";
              updates.departmentalHeadDate = currentDate;
              updates.departmentalHeadDaysGranted = leave.daysApplied;
              updates.departmentalHeadStartDate = leave.startDate;
              updates.departmentalHeadLastDate = leave.endDate;
              updates.departmentalHeadResumeDate = calculateNextWorkingDay(leave.endDate);
            }
          } else if (action === "Recommended" || action === "Not Recommended") {
            // Admin acts as both Sectional and Departmental Head sequentially
            if (!leave.sectionalHeadRecommendation) {
              updates.sectionalHeadRecommendation = action; // Set recommendation
              updates.sectionalHeadDate = currentDate;
              updates.status = action === "Recommended" ? "RecommendedBySectional" : "Pending";
            } else if (!leave.departmentalHeadRecommendation) {
              updates.departmentalHeadRecommendation = action; // Set recommendation
              updates.departmentalHeadDate = currentDate;
              updates.departmentalHeadDaysGranted = leave.daysApplied;
              updates.departmentalHeadStartDate = leave.startDate;
              updates.departmentalHeadLastDate = leave.endDate;
              updates.departmentalHeadResumeDate = calculateNextWorkingDay(leave.endDate);
              updates.status = action === "Recommended" ? "RecommendedByDepartmental" : "RecommendedBySectional";
            }
          }
        }
      }
      if (Object.keys(updates).length === 0) {
        setMessage({ type: "error", text: "Not authorized to perform this action" });
        return;
      }

      console.log("Updating leave:", leaveId, "with", updates, "by role:", effectiveUser.role);
      await axios.patch(`http://localhost:5000/api/leaves/admin/leaves/${leaveId}`, updates, {
        headers: { Authorization: `Bearer ${effectiveToken}` },
      });

      const [shortRes, annualRes] = await Promise.all([
        axios.get("http://localhost:5000/api/leaves/admin/leaves?leaveType=Short%20Leave", {
          headers: { Authorization: `Bearer ${effectiveToken}` },
        }),
        axios.get("http://localhost:5000/api/leaves/admin/leaves?leaveType=Annual%20Leave", {
          headers: { Authorization: `Bearer ${effectiveToken}` },
        }),
      ]);
      setShortLeaves(Array.isArray(shortRes.data) ? shortRes.data : []);
      setAnnualLeaves(Array.isArray(annualRes.data) ? annualRes.data : []);
      setMessage({ type: "success", text: `Leave ${action.toLowerCase()} successfully` });
    } catch (error) {
      console.error("Error updating leave:", error.response ? error.response.data : error.message);
      setMessage({ type: "error", text: error.response?.data?.error || "Failed to update leave" });
    }
  };

  const handleLogout = () => {
    console.log("Logging out from AdminDashboard");
    logout();
    navigate("/login");
  };

  const toggleDrawer = (open) => () => {
    setDrawerOpen(open);
  };

  const handleMenuClick = (section) => {
    if (section === "Logout") handleLogout();
    else {
      setActiveSection(section);
      setDrawerOpen(false);
    }
  };

  const handleViewDetails = (leave) => {
    setSelectedLeave(leave);
  };

  const handleCloseModal = () => {
    setSelectedLeave(null);
  };

  const handleCloseEventModal = () => {
    setSelectedEvent(null);
  };

  const isActiveLeave = (leave) => {
    const today = new Date();
    return (
      leave.approverRecommendation === "Approved" &&
      new Date(leave.startDate) <= today &&
      new Date(leave.endDate) >= today
    );
  };

  const getStatusChip = (leave) => {
    const status = leave.status || "Pending";
    switch (status) {
      case "Approved":
        return <Chip label="Approved" color="success" size="small" />;
      case "Rejected":
        return <Chip label="Rejected" color="error" size="small" />;
      case "RecommendedBySectional": // Updated: Added new status
        return <Chip label="Recommended by Sectional" color="info" size="small" />;
      case "RecommendedByDepartmental": // Updated: Added new status
        return <Chip label="Recommended by Departmental" color="info" size="small" />;
      case "Pending":
      default:
        return <Chip label="Pending" color="warning" size="small" />;
    }
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "profilePicture") {
      setFormData({ ...formData, [name]: files[0] }); // Handle file input
    } else {
      setFormData({ ...formData, [name]: value });
    }
    // Clear error for the field being edited
    setFormErrors({ ...formErrors, [name]: "" });
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name) errors.name = "Name is required";
    if (!formData.email) {
      errors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      errors.email = "Invalid email format";
    }
    if (formData.phoneNumber && !validatePhoneNumber(formData.phoneNumber)) {
      errors.phoneNumber = "Invalid phone number format (e.g., +1234567890)";
    }
    if (!formData.department) errors.department = "Department is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProfileUpdate = async () => {
    if (!validateForm()) {
      setMessage({ type: "error", text: "Please fix the errors in the form" });
      return;
    }

    try {
      const formDataToSend = new FormData();
      Object.keys(formData).forEach((key) => {
        if (key === "profilePicture" && formData[key]) {
          formDataToSend.append(key, formData[key]);
        } else if (formData[key]) {
          formDataToSend.append(key, formData[key]);
        }
      });

      const res = await axios.put(
        "http://localhost:5000/api/admin/profile",
        formDataToSend,
        {
          headers: {
            Authorization: `Bearer ${effectiveToken}`,
            "Content-Type": "multipart/form-data",
          },
          timeout: 5000,
        }
      );
      setProfile(res.data.profile);
      setIsEditingProfile(false);
      setMessage({ type: "success", text: "Profile updated successfully" });
    } catch (error) {
      const errorMsg = error.response
        ? `${error.response.status}: ${error.response.data.error || error.response.statusText}`
        : error.message;
      setError(errorMsg);
      setMessage({ type: "error", text: `Failed to update profile: ${errorMsg}` });
    }
  };

  const menuItems = ["Short Leave Requests", "Annual Leave Requests", "Profile", "Calendar", "Logout"];

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading dashboard...</Typography>
      </Box>
    );
  }

  if (!effectiveToken) {
    navigate("/login");
    return null;
  }

  return (
    <Container maxWidth="lg">
      <StyledAppBar position="static">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={toggleDrawer(true)} sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Admin Dashboard
          </Typography>
          <Typography variant="subtitle1" sx={{ color: "#fff" }}>
            {effectiveUser.role}
          </Typography>
        </Toolbar>
      </StyledAppBar>

      <StyledDrawer anchor="left" open={drawerOpen} onClose={toggleDrawer(false)}>
        <List>
          {menuItems.map((item) => (
            <ListItem
              button
              key={item}
              onClick={() => handleMenuClick(item)}
              sx={{
                "&:hover": { bgcolor: "#e0e0e0" },
                bgcolor: activeSection === item ? "#d0d0d0" : "inherit",
              }}
            >
              <ListItemText primary={item} />
            </ListItem>
          ))}
        </List>
      </StyledDrawer>

      <Paper elevation={3} sx={{ p: 4, mt: 4, borderRadius: 2 }}>
        {message.text && (
          <Alert severity={message.type} sx={{ mb: 3, borderRadius: 2 }}>
            {message.text}
          </Alert>
        )}

        {activeSection === "Short Leave Requests" && (
          <>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: "bold" }}>
              Short Leave Requests
            </Typography>
            <TableContainer sx={{ maxHeight: 500, overflowX: "auto" }}>
              <Table stickyHeader sx={{ minWidth: "1200px" }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>ID</TableCell>
                    <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Employee</TableCell>
                    <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Days</TableCell>
                    <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Start Date</TableCell>
                    <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>End Date</TableCell>
                    <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Actions</TableCell>
                    <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {shortLeaves.length > 0 ? (
                    shortLeaves.map((leave) => (
                      <TableRow
                        key={leave._id}
                        hover
                        sx={{
                          "&:hover": { bgcolor: "#f0f0f0" },
                          bgcolor: isActiveLeave(leave) ? "#e0f7fa" : "inherit",
                        }}
                      >
                        <TableCell>{leave._id.slice(-6)}</TableCell>
                        <TableCell>{leave.employeeName}</TableCell>
                        <TableCell>{leave.daysApplied}</TableCell>
                        <TableCell>{new Date(leave.startDate).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(leave.endDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Tooltip title={leave.status}>
                            {getStatusChip(leave)}
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          {(effectiveUser.role === "Supervisor" || effectiveUser.role === "Admin") && (
                            <>
                              <Button
                                onClick={() => handleAction(leave._id, "Recommended")}
                                variant="contained"
                                color="primary"
                                size="small"
                                sx={{ mr: 1, borderRadius: 1 }}
                              >
                                Recommend
                              </Button>
                              <Button
                                onClick={() => handleAction(leave._id, "Not Recommended")}
                                variant="outlined"
                                color="secondary"
                                size="small"
                                sx={{ mr: 1, borderRadius: 1 }}
                              >
                                Not Recommend
                              </Button>
                            </>
                          )}
                          {(effectiveUser.role === "HRDirector" || effectiveUser.role === "Admin") && (
                            <>
                              <Button
                                onClick={() => handleAction(leave._id, "Approve")}
                                variant="contained"
                                color="success"
                                size="small"
                                sx={{ mr: 1, borderRadius: 1 }}
                              >
                                Approve
                              </Button>
                              <Button
                                onClick={() => handleAction(leave._id, "Reject")}
                                variant="outlined"
                                color="error"
                                size="small"
                                sx={{ borderRadius: 1 }}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            onClick={() => handleViewDetails(leave)}
                            variant="outlined"
                            size="small"
                            sx={{ borderRadius: 1 }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        No short leave requests found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {activeSection === "Annual Leave Requests" && (
          <>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: "bold" }}>
              Annual Leave Requests
            </Typography>
            <TableContainer sx={{ maxHeight: 500, overflowX: "auto" }}>
              <Table stickyHeader sx={{ minWidth: "1200px" }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>ID</TableCell>
                    <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Employee</TableCell>
                    <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Days</TableCell>
                    <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Start Date</TableCell>
                    <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>End Date</TableCell>
                    <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Actions</TableCell>
                    <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {annualLeaves.length > 0 ? (
                    annualLeaves.map((leave) => (
                      <TableRow
                        key={leave._id}
                        hover
                        sx={{
                          "&:hover": { bgcolor: "#f0f0f0" },
                          bgcolor: isActiveLeave(leave) ? "#e0f7fa" : "inherit",
                        }}
                      >
                        <TableCell>{leave._id.slice(-6)}</TableCell>
                        <TableCell>{leave.employeeName}</TableCell>
                        <TableCell>{leave.daysApplied}</TableCell>
                        <TableCell>{new Date(leave.startDate).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(leave.endDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Tooltip title={leave.status}>
                            {getStatusChip(leave)}
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          {(effectiveUser.role === "SectionalHead" || effectiveUser.role === "Admin") && (
                            <>
                              <Button
                                onClick={() => handleAction(leave._id, "Recommended")}
                                variant="contained"
                                color="primary"
                                size="small"
                                sx={{ mr: 1, borderRadius: 1 }}
                              >
                                Recommend
                              </Button>
                              <Button
                                onClick={() => handleAction(leave._id, "Not Recommended")}
                                variant="outlined"
                                color="secondary"
                                size="small"
                                sx={{ mr: 1, borderRadius: 1 }}
                              >
                                Not Recommend
                              </Button>
                            </>
                          )}
                          {(effectiveUser.role === "DepartmentalHead" || effectiveUser.role === "Admin") && (
                            <>
                              <Button
                                onClick={() => handleAction(leave._id, "Recommended")}
                                variant="contained"
                                color="primary"
                                size="small"
                                sx={{ mr: 1, borderRadius: 1 }}
                              >
                                Recommend
                              </Button>
                              <Button
                                onClick={() => handleAction(leave._id, "Not Recommended")}
                                variant="outlined"
                                color="secondary"
                                size="small"
                                sx={{ mr: 1, borderRadius: 1 }}
                              >
                                Not Recommend
                              </Button>
                            </>
                          )}
                          {(effectiveUser.role === "HRDirector" || effectiveUser.role === "Admin") && (
                            <>
                              <Button
                                onClick={() => handleAction(leave._id, "Approve")}
                                variant="contained"
                                color="success"
                                size="small"
                                sx={{ mr: 1, borderRadius: 1 }}
                              >
                                Approve
                              </Button>
                              <Button
                                onClick={() => handleAction(leave._id, "Reject")}
                                variant="outlined"
                                color="error"
                                size="small"
                                sx={{ borderRadius: 1 }}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            onClick={() => handleViewDetails(leave)}
                            variant="outlined"
                            size="small"
                            sx={{ borderRadius: 1 }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        No annual leave requests found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {activeSection === "Profile" && (
          <>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: "bold" }}>
              Admin Profile
            </Typography>
            <Divider sx={{ mb: 3 }} />
            {isEditingProfile ? (
              <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      fullWidth
                      error={!!formErrors.name}
                      helperText={formErrors.name}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      fullWidth
                      error={!!formErrors.email}
                      helperText={formErrors.email}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Department"
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      fullWidth
                      error={!!formErrors.department}
                      helperText={formErrors.department}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Phone Number"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      fullWidth
                      error={!!formErrors.phoneNumber}
                      helperText={formErrors.phoneNumber}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Input
                      type="file"
                      name="profilePicture"
                      onChange={handleInputChange}
                      fullWidth
                      inputProps={{ accept: "image/*" }}
                    />
                    {formData.profilePicture && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Selected file: {formData.profilePicture.name}
                      </Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Chief Officer Name"
                      name="chiefOfficerName"
                      value={formData.chiefOfficerName}
                      onChange={handleInputChange}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Supervisor Name"
                      name="supervisorName"
                      value={formData.supervisorName}
                      onChange={handleInputChange}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Person Number"
                      name="personNumber"
                      value={formData.personNumber}
                      onChange={handleInputChange}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Sector"
                      name="sector"
                      value={formData.sector}
                      onChange={handleInputChange}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Sectional Head Name"
                      name="sectionalHeadName"
                      value={formData.sectionalHeadName}
                      onChange={handleInputChange}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Departmental Head Name"
                      name="departmentalHeadName"
                      value={formData.departmentalHeadName}
                      onChange={handleInputChange}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="HR Director Name"
                      name="HRDirectorName"
                      value={formData.HRDirectorName}
                      onChange={handleInputChange}
                      fullWidth
                    />
                  </Grid>
                </Grid>
                <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
                  <StyledButton
                    variant="contained"
                    color="primary"
                    onClick={handleProfileUpdate}
                  >
                    Save
                  </StyledButton>
                  <StyledButton
                    variant="outlined"
                    color="secondary"
                    onClick={() => setIsEditingProfile(false)}
                  >
                    Cancel
                  </StyledButton>
                </Box>
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                  <Avatar
                    src={profile?.profilePicture || ""}
                    alt={profile?.name || "Admin"}
                    sx={{ width: 80, height: 80 }}
                  />
                  <Typography variant="h6">{profile?.name || "N/A"}</Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body1" sx={{ color: "#555" }}>
                      <strong>Email:</strong> {profile?.email || "N/A"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body1" sx={{ color: "#555" }}>
                      <strong>Department:</strong> {profile?.department || "N/A"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body1" sx={{ color: "#555" }}>
                      <strong>Phone Number:</strong> {profile?.phoneNumber || "N/A"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body1" sx={{ color: "#555" }}>
                      <strong>Chief Officer:</strong> {profile?.chiefOfficerName || "N/A"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body1" sx={{ color: "#555" }}>
                      <strong>Supervisor:</strong> {profile?.supervisorName || "N/A"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body1" sx={{ color: "#555" }}>
                      <strong>Person Number:</strong> {profile?.personNumber || "N/A"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body1" sx={{ color: "#555" }}>
                      <strong>Sector:</strong> {profile?.sector || "N/A"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body1" sx={{ color: "#555" }}>
                      <strong>Sectional Head:</strong> {profile?.sectionalHeadName || "N/A"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body1" sx={{ color: "#555" }}>
                      <strong>Departmental Head:</strong> {profile?.departmentalHeadName || "N/A"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body1" sx={{ color: "#555" }}>
                      <strong>HR Director:</strong> {profile?.HRDirectorName || "N/A"}
                    </Typography>
                  </Grid>
                </Grid>
                <StyledButton
                  variant="contained"
                  color="primary"
                  onClick={() => setIsEditingProfile(true)}
                  sx={{ mt: 3, width: "fit-content" }}
                >
                  Edit Profile
                </StyledButton>
              </Box>
            )}
          </>
        )}

        {activeSection === "Calendar" && (
          <>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: "bold" }}>
              Leave Calendar
            </Typography>
            <Divider sx={{ mb: 3 }} />
            {calendarError ? (
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <Typography variant="body1" sx={{ color: "#f44336" }}>
                  {calendarError}
                </Typography>
                <StyledButton
                  variant="contained"
                  color="primary"
                  onClick={fetchLeaveEvents}
                  disabled={isFetchingEvents}
                >
                  {isFetchingEvents ? <CircularProgress size={24} /> : "Retry"}
                </StyledButton>
              </Box>
            ) : (
              <Box sx={{ height: 600 }}>
                <Calendar
                  localizer={localizer}
                  events={events}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: "100%" }}
                  onSelectEvent={(event) => setSelectedEvent(event)}
                  eventPropGetter={(event) => ({
                    style: event.style,
                  })}
                />
              </Box>
            )}
          </>
        )}
      </Paper>

      {/* Leave Details Modal */}
      <Modal open={!!selectedLeave} onClose={handleCloseModal}>
        <Box sx={modalStyle}>
          {selectedLeave && (
            <>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: "bold", mb: 3 }}>
                Leave Details
              </Typography>

              {/* Employee Information */}
              <Typography variant="h6" sx={{ fontWeight: "medium", mb: 2 }}>
                Employee Information
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Typography sx={{ mb: 1.5 }}>
                  <strong>ID:</strong> {selectedLeave._id}
                </Typography>
                <Typography sx={{ mb: 1.5 }}>
                  <strong>Employee:</strong> {selectedLeave.employeeName}
                </Typography>
                <Typography sx={{ mb: 1.5 }}>
                  <strong>Person Number:</strong> {selectedLeave.personNumber || "N/A"}
                </Typography>
                <Typography sx={{ mb: 1.5 }}>
                  <strong>Department:</strong> {selectedLeave.department}
                </Typography>
                <Typography sx={{ mb: 1.5 }}>
                  <strong>Sector:</strong> {selectedLeave.sector || "N/A"}
                </Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />

              {/* Leave Details */}
              <Typography variant="h6" sx={{ fontWeight: "medium", mb: 2 }}>
                Leave Details
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Typography sx={{ mb: 1.5 }}>
                  <strong>Days Applied:</strong> {selectedLeave.daysApplied}
                </Typography>
                <Typography sx={{ mb: 1.5 }}>
                  <strong>Start Date:</strong> {new Date(selectedLeave.startDate).toLocaleDateString()}
                </Typography>
                <Typography sx={{ mb: 1.5 }}>
                  <strong>End Date:</strong> {new Date(selectedLeave.endDate).toLocaleDateString()}
                </Typography>
                <Typography sx={{ mb: 1.5 }}>
                  <strong>Reason:</strong> {selectedLeave.reason || "N/A"}
                </Typography>
                <Typography sx={{ mb: 1.5 }}>
                  <strong>Address While Away:</strong> {selectedLeave.addressWhileAway || "N/A"}
                </Typography>
                <Typography sx={{ mb: 1.5 }}>
                  <strong>Email:</strong> {selectedLeave.emailAddress || "N/A"}
                </Typography>
                <Typography sx={{ mb: 1.5 }}>
                  <strong>Phone:</strong> {selectedLeave.phoneNumber || "N/A"}
                </Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />

              {/* Leave Balance */}
              <Typography variant="h6" sx={{ fontWeight: "medium", mb: 2 }}>
                Leave Balance
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Typography sx={{ mb: 1.5 }}>
                  <strong>Leave Balance BF:</strong> {selectedLeave.leaveBalanceBF || 0}
                </Typography>
                <Typography sx={{ mb: 1.5 }}>
                  <strong>Current Year Leave:</strong> {selectedLeave.currentYearLeave || 0}
                </Typography>
                <Typography sx={{ mb: 1.5 }}>
                  <strong>Total Leave Days:</strong> {selectedLeave.totalLeaveDays || "N/A"}
                </Typography>
                <Typography sx={{ mb: 1.5 }}>
                  <strong>Leave Taken This Year:</strong> {selectedLeave.leaveTakenThisYear || 0}
                </Typography>
                <Typography sx={{ mb: 1.5 }}>
                  <strong>Leave Balance Due:</strong> {selectedLeave.leaveBalanceDue || "N/A"}
                </Typography>
                <Typography sx={{ mb: 1.5 }}>
                  <strong>Leave Applied:</strong> {selectedLeave.leaveApplied || "N/A"}
                </Typography>
                <Typography sx={{ mb: 1.5 }}>
                  <strong>Leave Balance CF:</strong> {selectedLeave.leaveBalanceCF || "N/A"}
                </Typography>
                <Typography sx={{ mb: 1.5 }}>
                  <strong>Computed By:</strong> {selectedLeave.computedBy || "N/A"}
                </Typography>
                <Typography sx={{ mb: 1.5 }}>
                  <strong>Computed Date:</strong> {selectedLeave.computedDate ? new Date(selectedLeave.computedDate).toLocaleString() : "N/A"}
                </Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />

              {/* Approvals */}
              <Typography variant="h6" sx={{ fontWeight: "medium", mb: 2 }}>
                Approvals
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Typography sx={{ mb: 1.5 }}>
                  <strong>Sectional Head:</strong> {selectedLeave.sectionalHeadName || "N/A"}
                </Typography>
                <Typography sx={{ mb: 1.5 }}>
                  <strong>Sectional Recommendation:</strong> {selectedLeave.sectionalHeadRecommendation || "Pending"}
                </Typography>
                <Typography sx={{ mb: 1.5 }}>
                  <strong>Sectional Date:</strong> {selectedLeave.sectionalHeadDate ? new Date(selectedLeave.sectionalHeadDate).toLocaleString() : "N/A"}
                </Typography>
                <Typography sx={{ mb: 1.5 }}>
                  <strong>Departmental Head:</strong> {selectedLeave.departmentalHeadName || "N/A"}
                </Typography>
                <Typography sx={{ mb: 1.5 }}>
                  <strong>Departmental Recommendation:</strong> {selectedLeave.departmentalHeadRecommendation || "Pending"}
                </Typography>
                <Typography sx={{ mb: 1.5 }}>
                  <strong>Departmental Date:</strong> {selectedLeave.departmentalHeadDate ? new Date(selectedLeave.departmentalHeadDate).toLocaleString() : "N/A"}
                </Typography>
                <Typography sx={{ mb: 1.5 }}>
                  <strong>Days Granted:</strong> {selectedLeave.departmentalHeadDaysGranted || "N/A"}
                </Typography>
                <Typography sx={{ mb: 1.5 }}>
                  <strong>Effective From:</strong> {selectedLeave.departmentalHeadStartDate ? new Date(selectedLeave.departmentalHeadStartDate).toLocaleDateString() : "N/A"}
                </Typography>
                <Typography sx={{ mb: 1.5 }}>
                  <strong>Last Day:</strong> {selectedLeave.departmentalHeadLastDate ? new Date(selectedLeave.departmentalHeadLastDate).toLocaleDateString() : "N/A"}
                </Typography>
                <Typography sx={{ mb: 1.5 }}>
                  <strong>Resume Date:</strong> {selectedLeave.departmentalHeadResumeDate ? new Date(selectedLeave.departmentalHeadResumeDate).toLocaleDateString() : "N/A"}
                </Typography>
                <Typography sx={{ mb: 1.5 }}>
                  <strong>HR Director:</strong> {selectedLeave.HRDirectorName || "N/A"}
                </Typography>
                <Typography sx={{ mb: 1.5 }}>
                  <strong>HR Recommendation:</strong> {selectedLeave.approverRecommendation || "Pending"}
                </Typography>
                <Typography sx={{ mb: 1.5 }}>
                  <strong>HR Date:</strong> {selectedLeave.approverDate ? new Date(selectedLeave.approverDate).toLocaleString() : "N/A"}
                </Typography>
                <Typography sx={{ mb: 1.5 }}>
                  <strong>Final Status:</strong> {selectedLeave.status}
                </Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />

              {/* Updated: Added Workflow Progress Section */}
              <Typography variant="h6" sx={{ fontWeight: "medium", mb: 2 }}>
                Workflow Progress
              </Typography>
              <Box sx={{ mb: 4 }}>
                {selectedLeave.status === "Pending" && (
                  <Typography sx={{ mb: 1.5, color: "#ff9800" }}>
                    Leave request submitted, awaiting Sectional Head recommendation.
                  </Typography>
                )}
                {selectedLeave.sectionalHeadRecommendation && (
                  <Typography sx={{ mb: 1.5, color: selectedLeave.sectionalHeadRecommendation === "Recommended" ? "#4caf50" : "#f44336" }}>
                    Sectional Head {selectedLeave.sectionalHeadRecommendation} on {new Date(selectedLeave.sectionalHeadDate).toLocaleString()}
                  </Typography>
                )}
                {selectedLeave.departmentalHeadRecommendation && (
                  <Typography sx={{ mb: 1.5, color: selectedLeave.departmentalHeadRecommendation === "Recommended" ? "#4caf50" : "#f44336" }}>
                    Departmental Head {selectedLeave.departmentalHeadRecommendation} on {new Date(selectedLeave.departmentalHeadDate).toLocaleString()}
                  </Typography>
                )}
                {selectedLeave.approverRecommendation && (
                  <Typography sx={{ mb: 1.5, color: selectedLeave.approverRecommendation === "Approved" ? "#4caf50" : "#f44336" }}>
                    HR Director {selectedLeave.approverRecommendation} on {new Date(selectedLeave.approverDate).toLocaleString()}
                  </Typography>
                )}
                {selectedLeave.status === "Approved" && (
                  <Typography sx={{ mb: 1.5, color: "#4caf50" }}>
                    Leave request fully approved.
                  </Typography>
                )}
                {selectedLeave.status === "Rejected" && (
                  <Typography sx={{ mb: 1.5, color: "#f44336" }}>
                    Leave request rejected.
                  </Typography>
                )}
              </Box>

              <Button onClick={handleCloseModal} variant="contained" color="primary" fullWidth sx={{ borderRadius: 1 }}>
                Close
              </Button>
            </>
          )}
        </Box>
      </Modal>

      {/* Event Details Modal */}
      <Modal open={!!selectedEvent} onClose={handleCloseEventModal}>
        <Box sx={modalStyle}>
          {selectedEvent && (
            <>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: "bold", mb: 3 }}>
                Event Details
              </Typography>
              <Typography sx={{ mb: 1.5 }}>
                <strong>Title:</strong> {selectedEvent.title}
              </Typography>
              <Typography sx={{ mb: 1.5 }}>
                <strong>Start:</strong> {selectedEvent.start.toLocaleDateString()}
              </Typography>
              <Typography sx={{ mb: 1.5 }}>
                <strong>End:</strong> {selectedEvent.end.toLocaleDateString()}
              </Typography>
              <Button onClick={handleCloseEventModal} variant="contained" color="primary" fullWidth sx={{ borderRadius: 1 }}>
                Close
              </Button>
            </>
          )}
        </Box>
      </Modal>
    </Container>
  );
};

export default AdminDashboard;