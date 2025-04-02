import { createContext, useState, useEffect } from "react";
import { io } from "socket.io-client";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    return {
      token: token ? token : null,
      user: user ? JSON.parse(user) : null,
    };
  });
  
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {

    const socket = io("https://elms-backend.onrender.com",{
      transports: ["websocket", "polling"], // Enable fallback
      withCredentials: true, // Ensures cookies and auth headers work
    }
    ); // Connect to WebSocket server

    socket.on("leaveRequest", (data) => {
      setNotifications((prev) => [...prev, data.message]);
    });

    socket.on("leaveUpdate", (data) => {
      setNotifications((prev) => [...prev, data.message]);
    });

    return () => socket.disconnect(); // Cleanup on unmount
  }, []);

  const login = (newToken, userData) => {
    console.log("🔐 Logging in with token:", newToken, "User:", userData);
    setAuthState({ token: newToken, user: userData });
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(userData));
    
  };

  const logout = () => {
    console.log("🚪 Logging out...");
    setAuthState({ token: null, user: null });
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    
  };

  useEffect(() => {
    console.log("AuthContext state updated:", authState);
  }, [authState]);

  console.log("AuthContext rendering with:", authState);

  return (
    <AuthContext.Provider value={{  authState, notifications, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
