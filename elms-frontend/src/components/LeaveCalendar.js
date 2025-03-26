import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Container, Typography, Paper } from "@mui/material";

const LeaveCalendar = () => {
  const { user, logout, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [leaveData, setLeaveData] = useState([]);

  const localToken = localStorage.getItem("token");
  const localUser = JSON.parse(localStorage.getItem("user") || "null");
  const effectiveToken = token || localToken;
  const effectiveUser = user || localUser;

  console.log("LeaveCalendar rendering - Token:", effectiveToken, "User:", effectiveUser);

  useEffect(() => {
    console.log("LeaveCalendar useEffect - Token:", effectiveToken);
    if (!effectiveToken || !effectiveUser) {
      console.log("No token or user, redirecting to /login");
      navigate("/login");
      return;
    }
    const fetchLeaveData = async () => {
      console.log("Fetching leave data with token:", effectiveToken);
      try {
        const res = await axios.get("http://localhost:5000/api/leaves/my-leaves", {
          headers: { Authorization: `Bearer ${effectiveToken}` },
        });
        console.log("Fetched leave data:", res.data);
        setLeaveData(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        console.error("Error fetching leave data:", error);
        setLeaveData([]);
        if (error.response?.status === 401) {
          console.log("401 Unauthorized from /api/leaves/my-leaves, logging out");
          logout();
          navigate("/login");
        }
      }
    };
    fetchLeaveData();
  }, [effectiveToken, effectiveUser, navigate, logout]);

  if (!effectiveToken || !effectiveUser) {
    console.log("Render guard: No token or user, redirecting");
    navigate("/login");
    return null;
  }

  return (
    <Container maxWidth="lg">
      <Paper elevation={3} sx={{ padding: 4, marginTop: 4 }}>
        <Typography variant="h5" gutterBottom>Leave Calendar</Typography>
        {leaveData.length === 0 ? (
          <Typography>No valid leave data found.</Typography>
        ) : (
          <Typography>Leave data available: {JSON.stringify(leaveData)}</Typography>
        )}
      </Paper>
    </Container>
  );
};

export default LeaveCalendar;