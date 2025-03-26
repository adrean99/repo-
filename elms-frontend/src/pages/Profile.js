import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Container, TextField, Button, Typography, Paper, Alert, Avatar } from "@mui/material";

const Profile = () => {
  const { token, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    name: "",
    department: "",
    phoneNumber: "",
    profilePicture: "",
    chiefOfficerName: "",
    supervisorName: "",
    personNumber: "",
    email: "",
    sector: "",
    sectionalHeadName: "",
    departmentalHeadName: "",
    HRDirectorName: "",
  });
  const [message, setMessage] = useState({ type: "", text: "" });

  const localToken = localStorage.getItem("token");
  const effectiveToken = token || localToken;

  console.log("Profile rendering - Effective Token:", effectiveToken);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!effectiveToken) {
        console.log("No effective token, redirecting to /login");
        navigate("/login");
        return;
      }
      try {
        const res = await axios.get("http://localhost:5000/api/profiles", {
          headers: { Authorization: `Bearer ${effectiveToken}` },
        });
        console.log("Profile fetched:", res.data);
        setProfile(res.data);
      } catch (error) {
        console.error("Error fetching profile:", error);
        setMessage({ type: "info", text: "No Profile Found. Please fill in your details." });
        if (error.response?.status === 401) {
          console.log("401 Unauthorized, logging out");
          logout();
          navigate("/login");
        }
      }
    };
    fetchProfile();
  }, [effectiveToken, navigate, logout]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (!profile.name || !profile.department || !profile.email) {
      setMessage({ type: "error", text: "Name, department, and email are required" });
      return;
    }
    if (!effectiveToken) {
      console.log("No effective token on submit, redirecting to /login");
      navigate("/login");
      return;
    }
    try {
      const res = await axios.put(
        "http://localhost:5000/api/profiles",
        profile,
        { headers: { Authorization: `Bearer ${effectiveToken}` } }
      );
      setMessage({ type: "success", text: "Profile updated successfully" });
      setProfile(res.data.profile);
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage({ type: "error", text: error.response?.data?.error || "Failed to update profile" });
      if (error.response?.status === 401) {
        console.log("401 Unauthorized on submit, logging out");
        logout();
        navigate("/login");
      }
    }
  };

  if (!effectiveToken) {
    console.log("Render guard: No effective token, redirecting");
    navigate("/login");
    return null;
  }

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ padding: 4, marginTop: 4 }}>
        <Typography variant="h5" gutterBottom>
          Employee Profile
        </Typography>
        {message.text && <Alert severity={message.type}>{message.text}</Alert>}
        <form onSubmit={handleSubmit}>
          <Avatar
            src={profile.profilePicture || ""}
            alt={profile.name}
            sx={{ width: 100, height: 100, margin: "0 auto 20px" }}
          />
          <TextField
            fullWidth
            label="Full Name"
            name="name"
            value={profile.name || ""}
            onChange={handleChange}
            sx={{ mb: 2 }}
            required
          />
          <TextField
            fullWidth
            label="Department"
            name="department"
            value={profile.department || ""}
            onChange={handleChange}
            sx={{ mb: 2 }}
            required
          />
          <TextField
            fullWidth
            label="Phone Number"
            name="phoneNumber"
            value={profile.phoneNumber || ""}
            onChange={handleChange}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Chief Officer Name"
            name="chiefOfficerName"
            value={profile.chiefOfficerName || ""}
            onChange={handleChange}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Supervisor Name"
            name="supervisorName"
            value={profile.supervisorName || ""}
            onChange={handleChange}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Person Number"
            name="personNumber"
            value={profile.personNumber || ""}
            onChange={handleChange}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Email"
            name="email"
            value={profile.email || ""}
            onChange={handleChange}
            sx={{ mb: 2 }}
            required
          />
          <TextField
            fullWidth
            label="Sector"
            name="sector"
            value={profile.sector || ""}
            onChange={handleChange}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Profile Picture URL"
            name="profilePicture"
            value={profile.profilePicture || ""}
            onChange={handleChange}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Sectional Head Name"
            name="sectionalHeadName"
            value={profile.sectionalHeadName || ""}
            onChange={handleChange}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Departmental Head Name"
            name="departmentalHeadName"
            value={profile.departmentalHeadName || ""}
            onChange={handleChange}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="HR Director Name"
            name="HRDirectorName"
            value={profile.HRDirectorName || ""}
            onChange={handleChange}
            sx={{ mb: 2 }}
          />
          <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
            Update Profile
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

export default Profile;