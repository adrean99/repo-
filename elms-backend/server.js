require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express(); // ✅ Define `app` before using it
const server = http.createServer(app); // ✅ Now `app` is available

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(express.json());
app.use(cors());

// Import routes
const leaveRoutes = require("./routes/leaveRoutes");
const authRoutes = require("./routes/authRoutes");

// Use routes
app.use("/api/leaves", leaveRoutes);
app.use("/api/auth", authRoutes);

// WebSocket logic
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);
  
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Attach `io` to `app`
app.set("io", io);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log(`✅ MongoDB Connected`))
  .catch((err) => console.error(` MongoDB Connection Error: ${err}`));

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(` Server running on port ${PORT}`));
