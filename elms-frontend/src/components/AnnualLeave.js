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

const AnnualLeave = () => {
  const { user, logout, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [employeeName, setEmployeeName] = useState("");
  const [personNumber, setPersonNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [sector, setSector] = useState("");
  const [daysApplied, setDaysApplied] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [addressWhileAway, setAddressWhileAway] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [reason, setReason] = useState("");
  const [sectionalHeadName, setSectionalHeadName] = useState("");
  const [departmentalHeadName, setDepartmentalHeadName] = useState("");
  const [HRDirectorName, setHRDirectorName] = useState("");
  const [leaveBalance, setLeaveBalance] = useState({ leaveBalanceBF: 0, currentYearLeave: 0, leaveTakenThisYear: 0 });
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [comments, setComments] = useState({});
  const [submitting, setSubmitting] = useState(false); // Added for submit button loading state
  const [dialogOpen, setDialogOpen] = useState(false); // Added for approval confirmation dialog
  const [dialogData, setDialogData] = useState({ leaveId: "", status: "" }); // Added for dialog data

  const localToken = localStorage.getItem("token");
  const localUser = JSON.parse(localStorage.getItem("user") || "null");
  const effectiveToken = token || localToken;
  const effectiveUser = user || localUser;

  console.log("AnnualLeave rendering - Token:", effectiveToken, "User:", effectiveUser);

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
        const profile = profileRes.data;
        console.log("Profile fetched:", profile);
        setEmployeeName(profile.name || "");
        setPersonNumber(profile.personNumber || "");
        setDepartment(profile.department || "");
        setSector(profile.sector || "");
        setEmailAddress(profile.email || "");
        setPhoneNumber(profile.phoneNumber || "");
        setSectionalHeadName(profile.sectionalHeadName || "");
        setDepartmentalHeadName(profile.departmentalHeadName || "");
        setHRDirectorName(profile.HRDirectorName || "");

        const balanceRes = await apiClient.get("/api/leave-balances", {
          headers: { Authorization: `Bearer ${effectiveToken}` },
        });
        console.log("Leave balance fetched:", balanceRes.data);
        setLeaveBalance({
          leaveBalanceBF: balanceRes.data.leaveBalanceBF || 0,
          currentYearLeave: balanceRes.data.currentYearLeave || 0,
          leaveTakenThisYear: balanceRes.data.leaveTakenThisYear || 0,
        });

        const leavesRes = await apiClient.get("/api/leaves/my-leaves?leaveType=Annual%20Leave", {
          headers: { Authorization: `Bearer ${effectiveToken}` },
        });
        console.log("Leave requests fetched:", leavesRes.data);
        setLeaveRequests(Array.isArray(leavesRes.data) ? leavesRes.data : []);

        if (["SectionalHead", "DepartmentalHead", "HRDirector"].includes(effectiveUser.role)) {
          const pendingRes = await apiClient.get("/api/leaves/pending-approvals", {
            headers: { Authorization: `Bearer ${effectiveToken}` },
          });
          console.log("Pending approvals fetched:", pendingRes.data);
          setPendingApprovals(Array.isArray(pendingRes.data) ? pendingRes.data : []);
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
        setMessage({ type: "error", text: "Failed to fetch initial data: " + (error.response?.data?.error || error.message) });
        if (error.response?.status === 401) {
          logout();
          navigate("/login");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const countWorkingDays = (start, end) => {
    let count = 0;
    let current = new Date(start);
    const holidays = [];
    while (current <= end) {
      const day = current.getUTCDay();
      if (day !== 0 && day !== 6 && !holidays.some(h => h.toDateString() === current.toDateString())) {
        count++;
      }
      current.setUTCDate(current.getUTCDate() + 1);
    }
    return count;
  };

  const validateForm = () => {
    if (!employeeName || !personNumber || !department || !daysApplied || !startDate || !endDate || !reason) {
      setMessage({ type: "error", text: "All required fields must be filled" });
      return false;
    }

    const days = Number(daysApplied);
    if (!Number.isInteger(days) || days <= 0 || days > 30) {
      setMessage({ type: "error", text: "Days applied must be between 1 and 30" });
      return false;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setMessage({ type: "error", text: "Invalid start or end date" });
      return false;
    }

    if (start > end) {
      setMessage({ type: "error", text: "Start date cannot be after end date" });
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start - today < 7 * 24 * 60 * 60 * 1000) {
      setMessage({ type: "error", text: "Annual leave must be submitted at least 7 days in advance" });
      return false;
    }

    const workingDays = countWorkingDays(start, end);
    if (workingDays !== days) {
      setMessage({
        type: "error",
        text: `Days applied (${days}) must match working days (${workingDays}) between dates (excluding weekends/holidays)`,
      });
      return false;
    }

    const availableDays = leaveBalance.leaveBalanceBF + leaveBalance.currentYearLeave - leaveBalance.leaveTakenThisYear;
    if (days > availableDays) {
      setMessage({ type: "error", text: "Insufficient leave balance" });
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
          leaveType: "Annual Leave",
          employeeName,
          personNumber,
          department,
          sector,
          daysApplied: Number(daysApplied),
          startDate,
          endDate,
          addressWhileAway,
          emailAddress,
          phoneNumber,
          reason,
          leaveBalanceBF: leaveBalance.leaveBalanceBF,
          currentYearLeave: leaveBalance.currentYearLeave,
          leaveTakenThisYear: leaveBalance.leaveTakenThisYear,
          sectionalHeadName,
          departmentalHeadName,
          HRDirectorName,
        },
        { headers: { Authorization: `Bearer ${effectiveToken}` } }
      );
      console.log("Leave submitted:", res.data);
      setLeaveRequests(prev => [...prev, res.data.leave]);
      setMessage({ type: "success", text: "Annual leave submitted!" });
      setDaysApplied("");
      setStartDate("");
      setEndDate("");
      setAddressWhileAway("");
      setReason("");
    } catch (error) {
      console.error("Error submitting annual leave:", error);
      setMessage({ type: "error", text: error.response?.data?.error || "Error submitting annual leave." });
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
    const comment = comments[leaveId] || "";
    try {
      const res = await apiClient.put(
        `/api/leaves/approve/${leaveId}`,
        { status, comment },
        { headers: { Authorization: `Bearer ${effectiveToken}` } }
      );
      console.log("Approval updated:", res.data);
      setPendingApprovals(prev => prev.filter(l => l._id !== leaveId));
      setLeaveRequests(prev => prev.map(l => l._id === leaveId ? res.data.leave : l));
      setComments(prev => { const newComments = { ...prev }; delete newComments[leaveId]; return newComments; });
      setMessage({ type: "success", text: `Leave ${status.toLowerCase()}!` });
    } catch (error) {
      console.error("Error updating approval:", error);
      setMessage({ type: "error", text: error.response?.data?.error || "Error updating approval." });
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

  const availableDays = leaveBalance.leaveBalanceBF + leaveBalance.currentYearLeave - leaveBalance.leaveTakenThisYear;

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
          <Typography variant="h5" gutterBottom>Annual Leave Application</Typography>
          {message.text && <Alert severity={message.type}>{message.text}</Alert>}
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}> {/* Added Grid layout */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Name"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  sx={{ mb: 2 }}
                  required
                  helperText="Your full name" // Added helper text
                  aria-label="Employee Name" // Added accessibility
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="P/F No."
                  value={personNumber}
                  onChange={(e) => setPersonNumber(e.target.value)}
                  sx={{ mb: 2 }}
                  required
                  helperText="Your personnel number" // Added helper text
                  aria-label="Person Number" // Added accessibility
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  sx={{ mb: 2 }}
                  required
                  helperText="Your department" // Added helper text
                  aria-label="Department" // Added accessibility
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Sector"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  sx={{ mb: 2 }}
                  helperText="Your sector (optional)" // Added helper text
                  aria-label="Sector" // Added accessibility
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Days Applied"
                  type="number"
                  value={daysApplied}
                  onChange={(e) => setDaysApplied(e.target.value)}
                  sx={{ mb: 2 }}
                  required
                  inputProps={{ min: 1, max: 30 }}
                  helperText="Number of working days (1-30)" // Added helper text
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
                  sx={{ mb: 2 }}
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
                  sx={{ mb: 2 }}
                  required
                  helperText="Select end date" // Added helper text
                  aria-label="End Date" // Added accessibility
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address While Away"
                  value={addressWhileAway}
                  onChange={(e) => setAddressWhileAway(e.target.value)}
                  sx={{ mb: 2 }}
                  helperText="Where you’ll be during leave (optional)" // Added helper text
                  aria-label="Address While Away" // Added accessibility
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email Address"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  sx={{ mb: 2 }}
                  helperText="Your contact email (optional)" // Added helper text
                  aria-label="Email Address" // Added accessibility
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone No."
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  sx={{ mb: 2 }}
                  helperText="Your contact phone number (optional)" // Added helper text
                  aria-label="Phone Number" // Added accessibility
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  sx={{ mb: 2 }}
                  required
                  multiline // Added for better input
                  rows={2} // Added for better input
                  helperText="Reason for your leave" // Added helper text
                  aria-label="Reason" // Added accessibility
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mt: 2 }} color="primary">Leave Days Computation</Typography> {/* Enhanced styling */}
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Leave Balance B/F"
                  type="number"
                  value={leaveBalance.leaveBalanceBF}
                  sx={{ mb: 2 }}
                  disabled
                  helperText="Balance brought forward" // Added helper text
                  aria-label="Leave Balance B/F" // Added accessibility
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Current Year Leave"
                  type="number"
                  value={leaveBalance.currentYearLeave}
                  sx={{ mb: 2 }}
                  disabled
                  helperText="This year’s allocation" // Added helper text
                  aria-label="Current Year Leave" // Added accessibility
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Leave Taken This Year"
                  type="number"
                  value={leaveBalance.leaveTakenThisYear}
                  sx={{ mb: 2 }}
                  disabled
                  helperText="Days already taken" // Added helper text
                  aria-label="Leave Taken This Year" // Added accessibility
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Available Days"
                  type="number"
                  value={availableDays}
                  sx={{ mb: 2 }}
                  disabled
                  helperText="Calculated as B/F + Current - Taken" // Existing helper text
                  aria-label="Available Days" // Added accessibility
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Sectional Head Name"
                  value={sectionalHeadName}
                  onChange={(e) => setSectionalHeadName(e.target.value)}
                  sx={{ mb: 2 }}
                  helperText="Sectional Head’s name (optional)" // Added helper text
                  aria-label="Sectional Head Name" // Added accessibility
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Departmental Head Name"
                  value={departmentalHeadName}
                  onChange={(e) => setDepartmentalHeadName(e.target.value)}
                  sx={{ mb: 2 }}
                  helperText="Departmental Head’s name (optional)" // Added helper text
                  aria-label="Departmental Head Name" // Added accessibility
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="HR Director Name"
                  value={HRDirectorName}
                  onChange={(e) => setHRDirectorName(e.target.value)}
                  sx={{ mb: 2 }}
                  helperText="HR Director’s name (optional)" // Added helper text
                  aria-label="HR Director Name" // Added accessibility
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
                  aria-label="Submit Annual Leave" // Added accessibility
                >
                  {submitting ? "Submitting..." : "Submit Annual Leave"} {/* Added loading state */}
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>
      )}

      <Paper elevation={3} sx={{ padding: 4, marginTop: 4, borderRadius: 2, boxShadow: 5 }}> {/* Enhanced styling */}
        <Typography variant="h6" gutterBottom>
          Annual Leave Policies
          <Tooltip title="Key rules for annual leave requests" arrow> {/* Added tooltip */}
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
        <Box component="ul" sx={{ pl: 2 }}>
          <li>Maximum of 30 working days per request.</li>
          <li>Must be submitted at least 7 days in advance.</li>
          <li>Requires approval from Sectional Head, Departmental Head, and HR Director.</li>
          <li>Public Holidays, Saturdays, and Sundays are excluded; only working days count.</li>
          <li>Total annual leave capped at 30 days per year (including balance B/F and current year allocation).</li>
          <li>Total number of days brought forward is 15 days</li>
        </Box>
      </Paper>

      {["SectionalHead", "DepartmentalHead", "HRDirector"].includes(effectiveUser.role) && (
        <Paper elevation={3} sx={{ padding: 4, marginTop: 4, overflowX: "auto", borderRadius: 2, boxShadow: 5 }}> {/* Enhanced styling */}
          <Typography variant="h6" gutterBottom>Pending Annual Leave Approvals</Typography>
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
        <Typography variant="h6" gutterBottom>My Annual Leave Requests</Typography>
        <TableContainer sx={{ maxHeight: 400, overflowX: "auto" }}>
          <Table stickyHeader> {/* Removed minWidth */}
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Name</TableCell>
                <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>P/F No.</TableCell>
                <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Department</TableCell>
                <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Sector</TableCell>
                <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Days</TableCell>
                <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Start Date</TableCell>
                <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>End Date</TableCell>
                <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Reason</TableCell>
                <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Status</TableCell>
                <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Sectional Head</TableCell>
                <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Dept. Head</TableCell>
                <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>HR Director</TableCell>
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
                    <TableCell>{leave.employeeName}</TableCell>
                    <TableCell>{leave.personNumber}</TableCell>
                    <TableCell>{leave.department}</TableCell>
                    <TableCell>{leave.sector || "N/A"}</TableCell>
                    <TableCell>{leave.daysApplied}</TableCell>
                    <TableCell>{formatDate(leave.startDate)}</TableCell>
                    <TableCell>{formatDate(leave.endDate)}</TableCell>
                    <TableCell>{leave.reason}</TableCell>
                    <TableCell>
                      <Tooltip title={`Status: ${leave.status || "Pending"}`}>
                        {getStatusChip(leave.status)}
                      </Tooltip>
                    </TableCell>
                    <TableCell>{leave.sectionalHeadName || "N/A"}</TableCell>
                    <TableCell>{leave.departmentalHeadName || "N/A"}</TableCell>
                    <TableCell>{leave.HRDirectorName || "N/A"}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={12} align="center">
                    No annual leave requests found.
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

export default AnnualLeave;