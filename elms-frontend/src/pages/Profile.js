import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import apiClient from"../utils/apiClient";
import { useNavigate } from "react-router-dom";
import {
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  Avatar,
  Grid,
  CircularProgress,
  Box,
} from "@mui/material";

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
  const [submitting, setSubmitting] = useState(false); // Added for submit button loading state
  const [isLoading, setIsLoading] = useState(true); // Added for initial loading state

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
      setIsLoading(true); // Added for loading state
      try {
        const res = await apiClient.get("/api/profiles", {
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
      } finally {
        setIsLoading(false); // Added for loading state
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
    setSubmitting(true); // Added for loading state
    try {
      const res = await apiClient.put(
        "/api/profiles",
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
    } finally {
      setSubmitting(false); // Added for loading state
    }
  };

  if (!effectiveToken) {
    console.log("Render guard: No effective token, redirecting");
    navigate("/login");
    return null;
  }

  if (isLoading) { // Added loading state
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg"> {/* Updated maxWidth */}
      <Paper elevation={3} sx={{ padding: 4, marginTop: 4, borderRadius: 2, boxShadow: 5 }}> {/* Enhanced styling */}
        <Typography variant="h5" gutterBottom>
          Employee Profile
        </Typography>
        {message.text && <Alert severity={message.type}>{message.text}</Alert>}
        <form onSubmit={handleSubmit}>
          <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
            <Avatar
              src={profile.profilePicture || ""}
              alt={profile.name}
              sx={{ width: 100, height: 100 }}
            />
          </Box>
          <Grid container spacing={2}> {/* Added Grid layout */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Full Name"
                name="name"
                value={profile.name || ""}
                onChange={handleChange}
                sx={{ mb: 2 }}
                required
                helperText="Your full name" // Added helper text
                aria-label="Full Name" // Added accessibility
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Department"
                name="department"
                value={profile.department || ""}
                onChange={handleChange}
                sx={{ mb: 2 }}
                required
                helperText="Your department" // Added helper text
                aria-label="Department" // Added accessibility
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone Number"
                name="phoneNumber"
                value={profile.phoneNumber || ""}
                onChange={handleChange}
                sx={{ mb: 2 }}
                helperText="Your contact phone number (optional)" // Added helper text
                aria-label="Phone Number" // Added accessibility
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Chief Officer Name"
                name="chiefOfficerName"
                value={profile.chiefOfficerName || ""}
                onChange={handleChange}
                sx={{ mb: 2 }}
                helperText="Name of the Chief Officer (optional)" // Added helper text
                aria-label="Chief Officer Name" // Added accessibility
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Supervisor Name"
                name="supervisorName"
                value={profile.supervisorName || ""}
                onChange={handleChange}
                sx={{ mb: 2 }}
                helperText="Your supervisor's name (optional)" // Added helper text
                aria-label="Supervisor Name" // Added accessibility
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Person Number"
                name="personNumber"
                value={profile.personNumber || ""}
                onChange={handleChange}
                sx={{ mb: 2 }}
                helperText="Your personnel number (optional)" // Added helper text
                aria-label="Person Number" // Added accessibility
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                value={profile.email || ""}
                onChange={handleChange}
                sx={{ mb: 2 }}
                required
                helperText="Your email address" // Added helper text
                aria-label="Email" // Added accessibility
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Sector"
                name="sector"
                value={profile.sector || ""}
                onChange={handleChange}
                sx={{ mb: 2 }}
                helperText="Your sector (optional)" // Added helper text
                aria-label="Sector" // Added accessibility
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Profile Picture URL"
                name="profilePicture"
                value={profile.profilePicture || ""}
                onChange={handleChange}
                sx={{ mb: 2 }}
                helperText="URL to your profile picture (optional)" // Added helper text
                aria-label="Profile Picture URL" // Added accessibility
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Sectional Head Name"
                name="sectionalHeadName"
                value={profile.sectionalHeadName || ""}
                onChange={handleChange}
                sx={{ mb: 2 }}
                helperText="Sectional Head’s name (optional)" // Added helper text
                aria-label="Sectional Head Name" // Added accessibility
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Departmental Head Name"
                name="departmentalHeadName"
                value={profile.departmentalHeadName || ""}
                onChange={handleChange}
                sx={{ mb: 2 }}
                helperText="Departmental Head’s name (optional)" // Added helper text
                aria-label="Departmental Head Name" // Added accessibility
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="HR Director Name"
                name="HRDirectorName"
                value={profile.HRDirectorName || ""}
                onChange={handleChange}
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
                sx={{ mt: 2, borderRadius: 2, padding: "8px 24px" }} // Enhanced styling
                disabled={submitting} // Added for loading state
                aria-label="Update Profile" // Added accessibility
              >
                {submitting ? "Updating..." : "Update Profile"} {/* Added loading state */}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
};

export default Profile;