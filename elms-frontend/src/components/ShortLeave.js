import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
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
} from "@mui/material";

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString();
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
        const profileRes = await axios.get("http://localhost:5000/api/profiles", {
          headers: { Authorization: `Bearer ${effectiveToken}` },
        });
        console.log("Profile fetched:", profileRes.data);
        const profile = profileRes.data;
        setChiefOfficerName(profile.chiefOfficerName || "");
        setDepartment(profile.department || "");
        setSupervisorName(profile.supervisorName || "");
        setEmployeeName(profile.name || "");
        setPersonNumber(profile.personNumber || "");

        const leavesRes = await axios.get("http://localhost:5000/api/leaves/my-leaves?leaveType=Short%20Leave", {
          headers: { Authorization: `Bearer ${effectiveToken}` },
        });
        console.log("Fetched leave requests:", leavesRes.data);
        setLeaveRequests(Array.isArray(leavesRes.data) ? leavesRes.data : []);

        if (effectiveUser.role === "Supervisor") {
          const pendingRes = await axios.get("http://localhost:5000/api/leaves/pending-approvals", {
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
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 5) {
      setMessage({ type: "error", text: "Short leave cannot exceed 5 days" });
      return false;
    }
    if (diffDays !== days) {
      setMessage({ type: "error", text: "Days applied must match the date range" });
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

    try {
      const res = await axios.post(
        "http://localhost:5000/api/leaves/apply",
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
    }
  };

  const handleApproval = async (leaveId, status) => {
    try {
      const res = await axios.put(
        `http://localhost:5000/api/leaves/approve/${leaveId}`,
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
    }
  };

  if (!effectiveToken || !effectiveUser) {
    navigate("/login");
    return null;
  }

  if (isLoading) {
    return <Typography>Loading...</Typography>;
  }

  const getStatusChip = (status) => {
    const statusValue = status || "Pending";
    switch (statusValue) {
      case "Approved":
        return <Chip label="Approved" color="success" size="small" />;
      case "Rejected":
        return <Chip label="Rejected" color="error" size="small" />;
      case "Pending":
      default:
        return <Chip label="Pending" color="warning" size="small" />;
    }
  };

  return (
    <Container maxWidth="md">
      {effectiveUser.role === "Employee" && (
        <Paper elevation={3} sx={{ padding: 4, marginTop: 4 }}>
          <Typography variant="h5" gutterBottom>Short Leave Request</Typography>
          {message.text && <Alert severity={message.type}>{message.text}</Alert>}
          <form onSubmit={handleSubmit}>
            <TextField fullWidth label="Chief Officer Name" value={chiefOfficerName} onChange={(e) => setChiefOfficerName(e.target.value)} margin="normal" required />
            <TextField fullWidth label="Department" value={department} onChange={(e) => setDepartment(e.target.value)} margin="normal" required />
            <TextField fullWidth label="Supervisor Name" value={supervisorName} onChange={(e) => setSupervisorName(e.target.value)} margin="normal" required />
            <TextField fullWidth label="Employee Name" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} margin="normal" required />
            <TextField fullWidth label="Person Number" value={personNumber} onChange={(e) => setPersonNumber(e.target.value)} margin="normal" required />
            <TextField fullWidth label="Days Applied" type="number" value={daysApplied} onChange={(e) => setDaysApplied(e.target.value)} margin="normal" required inputProps={{ min: 1, max: 5 }} />
            <TextField fullWidth label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} margin="normal" required />
            <TextField fullWidth label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} margin="normal" required />
            <TextField fullWidth label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} margin="normal" required />
            <TextField fullWidth label="Assigned To Name" value={assignedToName} onChange={(e) => setAssignedToName(e.target.value)} margin="normal" />
            <TextField fullWidth label="Assigned To Designation" value={assignedToDesignation} onChange={(e) => setAssignedToDesignation(e.target.value)} margin="normal" />
            <Button type="submit" variant="contained" color="primary" fullWidth sx={{ marginTop: 2 }}>Submit Short Leave</Button>
          </form>
        </Paper>
      )}

      <Paper elevation={3} sx={{ padding: 4, marginTop: 4 }}>
        <Typography variant="h6" gutterBottom>Short Leave Policies</Typography>
        <Box component="ul" sx={{ pl: 2 }}>
          <li>Days applied must not exceed 5 days.</li>
          <li>Must be submitted at least 7 days in advance, unless an emergency.</li>
          <li>Requires supervisor approval; Human Resources Management notified for records.</li>
          <li>Days applied for to be deducted from annual leave.</li>
        </Box>
      </Paper>

      {effectiveUser.role === "Supervisor" && (
        <Paper elevation={3} sx={{ padding: 4, marginTop: 4, overflowX: "auto" }}>
          <Typography variant="h6" gutterBottom>Pending Short Leave Approvals</Typography>
          <Table sx={{ minWidth: "1200px" }}>
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
                      />
                      <Button onClick={() => handleApproval(leave._id, "Approved")} variant="contained" color="success" size="small" sx={{ mr: 1 }}>
                        Approve
                      </Button>
                      <Button onClick={() => handleApproval(leave._id, "Rejected")} variant="contained" color="error" size="small">
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

      <Paper elevation={3} sx={{ padding: 4, marginTop: 4 }}>
        <Typography variant="h6" gutterBottom>My Short Leave Requests</Typography>
        <TableContainer sx={{ maxHeight: 400, overflowX: "auto" }}>
          <Table stickyHeader sx={{ minWidth: "1400px" }}>
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
    </Container>
  );
};

export default ShortLeave;