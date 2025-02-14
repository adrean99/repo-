import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { TextField, Button, Container, Typography, Paper } from "@mui/material";

const Login = () => {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const response = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (response.ok) {
      login(data.token);
    } else {
      alert("Login failed");
    }
  };

  return (
    <Container maxWidth="xs" className="flex items-center justify-center h-screen">
      <Paper className="p-6 shadow-lg">
        <Typography variant="h5" className="mb-4">Login</Typography>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField label="Email" fullWidth required value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField label="Password" type="password" fullWidth required value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" variant="contained" color="primary" fullWidth>Login</Button>
        </form>
      </Paper>
    </Container>
  );
};

export default Login;
