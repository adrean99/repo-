import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Button, TextField, Container, Typography, Paper, Table, TableHead, TableBody, TableRow, TableCell } from "@mui/material";

const LeaveRequests = () => {
  const { user } = useContext(AuthContext);
  const [leaves, setLeaves] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  // Fetch leave requests
  useEffect(() => {
    fetch("http://localhost:5000/api/leaves", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then(setLeaves);
  }, []);

  // Apply for leave
  const applyForLeave = async () => {
    const response = await fetch("http://localhost:5000/api/leaves/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: JSON.stringify({ startDate, endDate, reason }),
    });

    if (response.ok) {
      alert("Leave request submitted");
      window.location.reload();
    } else {
      alert("Error submitting leave request");
    }
  };

  // Approve/Reject leave
  const updateLeaveStatus = async (id, status) => {
    await fetch(`http://localhost:5000/api/leaves/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: JSON.stringify({ status }),
    });
    window.location.reload();
  };

  return (
    <Container maxWidth="md" className="mt-10">
      <Paper className="p-6 shadow-lg">
        <Typography variant="h5" className="mb-4">Leave Requests</Typography>

        {/* Apply for Leave (Employee) */}
        {user?.role === "Employee" && (
          <div className="mb-6">
            <Typography variant="h6">Apply for Leave</Typography>
            <TextField label="Start Date" type="date" fullWidth value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mb-4" />
            <TextField label="End Date" type="date" fullWidth value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mb-4" />
            <TextField label="Reason" fullWidth value={reason} onChange={(e) => setReason(e.target.value)} className="mb-4" />
            <Button variant="contained" color="primary" onClick={applyForLeave}>Submit Request</Button>
          </div>
        )}

        {/* Leave Requests Table (For All Roles) */}
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Employee</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>End Date</TableCell>
              <TableCell>Status</TableCell>
              {user?.role === "Manager" && <TableCell>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {leaves.map((leave) => (
              <TableRow key={leave._id}>
                <TableCell>{leave.employeeId?.name || "N/A"}</TableCell>
                <TableCell>{leave.startDate.split("T")[0]}</TableCell>
                <TableCell>{leave.endDate.split("T")[0]}</TableCell>
                <TableCell>{leave.status}</TableCell>
                {user?.role === "Manager" && leave.status === "Pending" && (
                  <TableCell>
                    <Button color="success" onClick={() => updateLeaveStatus(leave._id, "Approved")}>Approve</Button>
                    <Button color="error" onClick={() => updateLeaveStatus(leave._id, "Rejected")}>Reject</Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
};

export default LeaveRequests;
