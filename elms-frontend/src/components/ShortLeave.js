import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import apiClient from"../utils/apiClient";
import { useNavigate } from "react-router-dom";
import {
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Alert,
  Box,
  TableContainer,
  Chip,
  Tooltip,
  Grid,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import InfoIcon from "@mui/icons-material/Info";

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString();
};

const countWorkingDays = (start, end) => {
  let count = 0;
  let current = new Date(start);
  const holidays = [new Date("2025-01-01")];

  while (current <= end) {
    const day = current.getUTCDay();
    if (day !== 0 && day !== 6 && !holidays.some(h => h.toDateString() === current.toDateString())) {
      count++;
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return count;
};

const ShortLeave = () => {
  const { user, logout, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [chiefOfficerName, setChiefOfficerName] = useState("");
  const [department, setDepartment] = useState("");
  const [supervisorName, setSupervisorName] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [personNumber, setPersonNumber] = useState("");
  const [daysApplied, setDaysApplied] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [assignedToName, setAssignedToName] = useState("");
  const [assignedToDesignation, setAssignedToDesignation] = useState("");
  const [comments, setComments] = useState({});
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false); // Added for submit button loading state
  const [dialogOpen, setDialogOpen] = useState(false); // Added for approval confirmation dialog
  const [dialogData, setDialogData] = useState({ leaveId: "", status: "" }); // Added for dialog data

  const localToken = localStorage.getItem("token");
  const localUser = JSON.parse(localStorage.getItem("user") || "null");
  const effectiveToken = token || localToken;
  const effectiveUser = user || localUser;

  console.log("ShortLeave rendering - Token:", effectiveToken, "User:", effectiveUser);

  useEffect(() => {
    if (!effectiveToken || !effectiveUser) {
      navigate("/login");
      return;
    }

    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const profileRes = await apiClient.get("/api/profiles", {
          headers: { Authorization: `Bearer ${effectiveToken}` },
        });
        console.log("Profile fetched:", profileRes.data);
        const profile = profileRes.data;
        setChiefOfficerName(profile.chiefOfficerName || "");
        setDepartment(profile.department || "");
        setSupervisorName(profile.supervisorName || "");
        setEmployeeName(profile.name || "");
        setPersonNumber(profile.personNumber || "");

        const leavesRes = await apiClient.get("/api/leaves/my-leaves?leaveType=Short%20Leave", {
          headers: { Authorization: `Bearer ${effectiveToken}` },
        });
        console.log("Fetched leave requests:", leavesRes.data);
        setLeaveRequests(Array.isArray(leavesRes.data) ? leavesRes.data : []);

        if (effectiveUser.role === "Supervisor") {
          const pendingRes = await apiClient.get("/api/leaves/pending-approvals", {
            headers: { Authorization: `Bearer ${effectiveToken}` },
          });
          console.log("Fetched pending approvals:", pendingRes.data);
          setPendingApprovals(Array.isArray(pendingRes.data) ? pendingRes.data : []);
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
        setMessage({ type: "error", text: "Failed to fetch initial data" });
        if (error.response?.status === 401) {
          console.log("401 Unauthorized, logging out");
          logout();
          navigate("/login");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const validateForm = () => {
    if (!chiefOfficerName || !department || !supervisorName || !employeeName || !personNumber || !daysApplied || !startDate || !endDate || !reason) {
      setMessage({ type: "error", text: "All required fields must be filled" });
      return false;
    }
    const days = Number(daysApplied);
    if (!Number.isInteger(days) || days <= 0 || days > 5) {
      setMessage({ type: "error", text: "Days applied must be between 1 and 5" });
      return false;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      setMessage({ type: "error", text: "Start date cannot be after end date" });
      return false;
    }
    const workingDays = countWorkingDays(start, end);
    if (workingDays > 5) {
      setMessage({ type: "error", text: "Short leave cannot exceed 5 working days" });
      return false;
    }
    if (workingDays !== days) {
      setMessage({ type: "error", text: `Days applied (${days}) must match working days (${workingDays}) excluding weekends and holidays` });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    if (!effectiveToken || !effectiveUser) {
      navigate("/login");
      return;
    }
    if (!validateForm()) return;

    setSubmitting(true); // Added for loading state
    try {
      const res = await apiClient.post("/api/leaves/apply",
        {
          leaveType: "Short Leave",
          chiefOfficerName,
          department,
          supervisorName,
          employeeName,
          personNumber,
          daysApplied: Number(daysApplied),
          startDate,
          endDate,
          reason,
          assignedToName,
          assignedToDesignation,
        },
        { headers: { Authorization: `Bearer ${effectiveToken}` } }
      );
      console.log("Submitted short leave response:", res.data);
      setLeaveRequests(prev => [...prev, res.data.leave]);
      setMessage({ type: "success", text: "Short leave submitted!" });
      setDaysApplied("");
      setStartDate("");
      setEndDate("");
      setReason("");
      setAssignedToName("");
      setAssignedToDesignation("");
    } catch (error) {
      console.error("Error submitting short leave:", error);
      setMessage({ type: "error", text: error.response?.data?.error || "Error submitting short leave." });
      if (error.response?.status === 401) {
        logout();
        navigate("/login");
      }
    } finally {
      setSubmitting(false); // Added for loading state
    }
  };

  const handleApprovalConfirm = (leaveId, status) => { // Added for confirmation dialog
    setDialogData({ leaveId, status });
    setDialogOpen(true);
  };

  const handleApproval = async () => { // Modified to work with dialog
    const { leaveId, status } = dialogData;
    try {
      const res = await apiClient.put(
        `/api/leaves/approve/${leaveId}`,
        { status, comment: comments[leaveId] || "" },
        { headers: { Authorization: `Bearer ${effectiveToken}` } }
      );
      setPendingApprovals(prev => prev.filter(l => l._id !== leaveId));
      setLeaveRequests(prev => prev.map(l => l._id === leaveId ? res.data.leave : l));
      setComments(prev => { delete prev[leaveId]; return { ...prev }; });
      setMessage({ type: "success", text: `Leave ${status.toLowerCase()}!` });
    } catch (error) {
      console.error("Error updating approval:", error);
      setMessage({ type: "error", text: error.response?.data?.error || "Error updating approval" });
      if (error.response?.status === 401) {
        logout();
        navigate("/login");
      }
    } finally {
      setDialogOpen(false); // Added to close dialog
    }
  };

  if (!effectiveToken || !effectiveUser) {
    navigate("/login");
    return null;
  }

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </Box>
    ); // Updated loading screen
  }

  const getStatusChip = (status) => {
    const statusValue = status || "Pending";
    switch (statusValue) {
      case "Approved":
        return <Chip label="Approved" color="success" size="small" icon={<CheckCircleIcon />} />; // Added icon
      case "Rejected":
        return <Chip label="Rejected" color="error" size="small" icon={<CancelIcon />} />; // Added icon
      case "Pending":
      default:
        return <Chip label="Pending" color="warning" size="small" />;
    }
  };

  return (
    <Container maxWidth="lg"> {/* Updated maxWidth */}
      {effectiveUser.role === "Employee" && (
        <Paper elevation={3} sx={{ padding: 4, marginTop: 4, borderRadius: 2, boxShadow: 5 }}> {/* Enhanced styling */}
          <Typography variant="h5" gutterBottom>Short Leave Request</Typography>
          {message.text && <Alert severity={message.type}>{message.text}</Alert>}
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}> {/* Added Grid layout */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Chief Officer Name"
                  value={chiefOfficerName}
                  onChange={(e) => setChiefOfficerName(e.target.value)}
                  margin="normal"
                  required
                  helperText="Enter the name of the Chief Officer" // Added helper text
                  aria-label="Chief Officer Name" // Added accessibility
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  margin="normal"
                  required
                  helperText="Your department" // Added helper text
                  aria-label="Department" // Added accessibility
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Supervisor Name"
                  value={supervisorName}
                  onChange={(e) => setSupervisorName(e.target.value)}
                  margin="normal"
                  required
                  helperText="Your supervisor's name" // Added helper text
                  aria-label="Supervisor Name" // Added accessibility
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Employee Name"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  margin="normal"
                  required
                  helperText="Your full name" // Added helper text
                  aria-label="Employee Name" // Added accessibility
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Person Number"
                  value={personNumber}
                  onChange={(e) => setPersonNumber(e.target.value)}
                  margin="normal"
                  required
                  helperText="Your personnel number" // Added helper text
                  aria-label="Person Number" // Added accessibility
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Days Applied"
                  type="number"
                  value={daysApplied}
                  onChange={(e) => setDaysApplied(e.target.value)}
                  margin="normal"
                  required
                  inputProps={{ min: 1, max: 5 }}
                  helperText="Number of working days (1-5)" // Added helper text
                  aria-label="Days Applied" // Added accessibility
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  margin="normal"
                  required
                  helperText="Select start date" // Added helper text
                  aria-label="Start Date" // Added accessibility
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="End Date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  margin="normal"
                  required
                  helperText="Select end date" // Added helper text
                  aria-label="End Date" // Added accessibility
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  margin="normal"
                  required
                  multiline // Added for better input
                  rows={2} // Added for better input
                  helperText="Reason for your leave" // Added helper text
                  aria-label="Reason" // Added accessibility
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Assigned To Name"
                  value={assignedToName}
                  onChange={(e) => setAssignedToName(e.target.value)}
                  margin="normal"
                  helperText="Optional: Name of assignee" // Added helper text
                  aria-label="Assigned To Name" // Added accessibility
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Assigned To Designation"
                  value={assignedToDesignation}
                  onChange={(e) => setAssignedToDesignation(e.target.value)}
                  margin="normal"
                  helperText="Optional: Assignee's designation" // Added helper text
                  aria-label="Assigned To Designation" // Added accessibility
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  sx={{ marginTop: 2, borderRadius: 2, padding: "8px 24px" }} // Enhanced styling
                  disabled={submitting} // Added for loading state
                  aria-label="Submit Short Leave" // Added accessibility
                >
                  {submitting ? "Submitting..." : "Submit Short Leave"} {/* Added loading state */}
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>
      )}

      <Paper elevation={3} sx={{ padding: 4, marginTop: 4, borderRadius: 2, boxShadow: 5 }}> {/* Enhanced styling */}
        <Typography variant="h6" gutterBottom>
          Short Leave Policies
          <Tooltip title="Key rules for short leave requests" arrow> {/* Added tooltip */}
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
        <Box component="ul" sx={{ pl: 2 }}>
          <li>Days applied must not exceed 5 days.</li>
          <li>Must be submitted at least 7 days in advance, unless an emergency.</li>
          <li>Requires supervisor approval; Human Resources Management notified for records.</li>
          <li>Days applied for to be deducted from annual leave.</li>
        </Box>
      </Paper>

      {effectiveUser.role === "Supervisor" && (
        <Paper elevation={3} sx={{ padding: 4, marginTop: 4, overflowX: "auto", borderRadius: 2, boxShadow: 5 }}> {/* Enhanced styling */}
          <Typography variant="h6" gutterBottom>Pending Short Leave Approvals</Typography>
          <Table stickyHeader> {/* Removed minWidth */}
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Days</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendingApprovals.length > 0 ? (
                pendingApprovals.map((leave) => (
                  <TableRow key={leave._id}>
                    <TableCell>{leave.employeeName}</TableCell>
                    <TableCell>{leave.daysApplied}</TableCell>
                    <TableCell>{formatDate(leave.startDate)}</TableCell>
                    <TableCell>{formatDate(leave.endDate)}</TableCell>
                    <TableCell>{leave.reason}</TableCell>
                    <TableCell>
                      <TextField
                        label="Comment"
                        value={comments[leave._id] || ""}
                        onChange={(e) => setComments(prev => ({ ...prev, [leave._id]: e.target.value }))}
                        size="small"
                        sx={{ mr: 1 }}
                        aria-label={`Comment for ${leave.employeeName}`} // Added accessibility
                      />
                      <Button
                        onClick={() => handleApprovalConfirm(leave._id, "Approved")} // Updated for dialog
                        variant="contained"
                        color="success"
                        size="small"
                        sx={{ mr: 1 }}
                        aria-label={`Approve leave for ${leave.employeeName}`} // Added accessibility
                      >
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleApprovalConfirm(leave._id, "Rejected")} // Updated for dialog
                        variant="contained"
                        color="error"
                        size="small"
                        aria-label={`Reject leave for ${leave.employeeName}`} // Added accessibility
                      >
                        Reject
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">No pending approvals.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Paper elevation={3} sx={{ padding: 4, marginTop: 4, borderRadius: 2, boxShadow: 5 }}> {/* Enhanced styling */}
        <Typography variant="h6" gutterBottom>My Short Leave Requests</Typography>
        <TableContainer sx={{ maxHeight: 400, overflowX: "auto" }}>
          <Table stickyHeader> {/* Removed minWidth */}
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Chief Officer</TableCell>
                <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Department</TableCell>
                <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Supervisor</TableCell>
                <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Employee</TableCell>
                <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Person #</TableCell>
                <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Days</TableCell>
                <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Start Date</TableCell>
                <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>End Date</TableCell>
                <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Reason</TableCell>
                <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Assigned To</TableCell>
                <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Designation</TableCell>
                <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Comment</TableCell>
                <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leaveRequests.length > 0 ? (
                leaveRequests.map((leave) => (
                  <TableRow
                    key={leave._id}
                    hover
                    sx={{ "&:hover": { bgcolor: "#f0f0f0", cursor: "pointer" } }}
                  >
                    <TableCell>{leave.chiefOfficerName}</TableCell>
                    <TableCell>{leave.department}</TableCell>
                    <TableCell>{leave.supervisorName}</TableCell>
                    <TableCell>{leave.employeeName}</TableCell>
                    <TableCell>{leave.personNumber}</TableCell>
                    <TableCell>{leave.daysApplied}</TableCell>
                    <TableCell>{formatDate(leave.startDate)}</TableCell>
                    <TableCell>{formatDate(leave.endDate)}</TableCell>
                    <TableCell>{leave.reason}</TableCell>
                    <TableCell>{leave.assignedToName || "N/A"}</TableCell>
                    <TableCell>{leave.assignedToDesignation || "N/A"}</TableCell>
                    <TableCell>{leave.approvals?.[0]?.comment || leave.recommendation || "N/A"}</TableCell>
                    <TableCell>
                      <Tooltip title={`Status: ${leave.status || "Pending"}`}>
                        {getStatusChip(leave.status)}
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={13} align="center">
                    No short leave requests found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Added Confirmation Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Confirm {dialogData.status}</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to {dialogData.status.toLowerCase()} this leave request?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} color="primary">Cancel</Button>
          <Button onClick={handleApproval} variant="contained" color={dialogData.status === "Approved" ? "success" : "error"}>Confirm</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ShortLeave;