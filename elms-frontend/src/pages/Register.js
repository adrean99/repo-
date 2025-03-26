import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { TextField, Button, Typography, Container, Paper, Select, MenuItem } from "@mui/material";

const Register = () => {
  const [userData, setUserData] = useState({ name: "", email: "", password: "", role: "Employee" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setUserData({ ...userData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await axios.post("http://localhost:5000/api/auth/register", userData);
      navigate("/login"); // Redirect to login page after successful registration
    } catch (error) {
      setError(error.response?.data?.message || "Registration failed");
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ padding: 4, textAlign: "center", marginTop: 8 }}>
        <Typography variant="h5" gutterBottom>
          Register
        </Typography>
        {error && <Typography color="error">{error}</Typography>}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Full Name"
            name="name"
            value={userData.name}
            onChange={handleChange}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Email"
            type="email"
            name="email"
            value={userData.email}
            onChange={handleChange}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            name="password"
            value={userData.password}
            onChange={handleChange}
            margin="normal"
            required
          />

          <Select fullWidth name="role" value={userData.role} onChange={handleChange} sx={{ marginTop: 2 }}>
            <MenuItem value="Employee">Employee</MenuItem>
            <MenuItem value="Admin">Admin</MenuItem>
            <MenuItem value="SectionalHead">SectionalHead</MenuItem>
            <MenuItem value="DepartmentalHead">DepartmentalHead</MenuItem>
            <MenuItem value="HRDirector">HRDirector</MenuItem>

          </Select>

          <Button type="submit" variant="contained" color="primary" fullWidth sx={{ marginTop: 2 }}>
            Register
          </Button>
        </form>
      </Paper>
    </Container>
  );
};


export default Register;
