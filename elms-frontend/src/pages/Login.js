import { useState, useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { TextField, Button, Container, Typography, Paper, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import apiClient from "../utils/apiClient";
const Login = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  //const hasNavigated = useRef(false);
  const[authData, setAuthData ] = useState(null);

  

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("")

   
    try{
      console.log("Attempting login with", { email,password });
      const response = await apiClient.post("/auth/login", {
        email,
        password,
      
    });

    const data = await response.json();
    if (response.ok) {
      console.log("Login response:", data);
      //localStorage.setItem("token", data.token);
      //localStorage.setItem("user", JSON.stringify(data.user));
      login(data.token, data.user);
      setAuthData(data);
      //navigate("/dashboard");

    } else {
      setError(data.message || "Login failed");
    }
  } catch (error) {
    console.error("Login error", error);
    setError("Server error. Please try again");
  }
};

useEffect(() => {
  if(authData?.user?.role) {
  console.log("Login useEffect - Navigating with:", authData);
  
  setTimeout(() => {
    if (authData.user.role === "Admin" || authData.user.role === "SectionalHead" || authData.user.role === "DepartmentalHead" || authData.user.role === "HRDirector") {
      console.log("Navigating to /admin-dashboard");
      navigate("/admin-dashboard");
    } else {
      console.log("Navigating to /employee-dashboard");
      navigate("/employee-dashboard");
    }
  }, 500);
  }
}, [authData, navigate]);


  return (
    <Container maxWidth="xs" className="flex items-center justify-center h-screen">
      <Paper className="p-6 shadow-lg">
        <Typography variant="h5" className="mb-4">Login</Typography>

        {error && <Typography color="error">{error}</Typography>}
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField label="Email" fullWidth required value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField label="Password" type="password" fullWidth required value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" variant="contained" color="primary" fullWidth>Login</Button>
        </form>
        <Box display="flex" justifyContent="center" alignItems="center" mt={2}>
          <Typography variant="body2" sx={{ mr: 1 }}>
            Don't have an account?
          </Typography>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => navigate("/register")}
          >
            Register
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Login;
