import { createContext, useState, useEffect } from "react";
import { io } from "socket.io-client";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const socket = io("http://localhost:5000"); // Connect to WebSocket server

    socket.on("leaveRequest", (data) => {
      setNotifications((prev) => [...prev, data.message]);
    });

    socket.on("leaveUpdate", (data) => {
      setNotifications((prev) => [...prev, data.message]);
    });

    return () => socket.disconnect(); // Cleanup on unmount
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, notifications }}>
      {children}
    </AuthContext.Provider>
  );
};
