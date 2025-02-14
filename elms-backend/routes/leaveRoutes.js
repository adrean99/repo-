const express = require("express");
const router = express.Router();
const Leave = require("../models/Leave");
const sendEmail = require("../utils/emailService");
const { verifyToken, isManager, isAdmin } = require("../middleware/authMiddleware");

// Employee: Apply for leave
router.post("/apply", verifyToken, async (req, res) => {
  try {
    const { startDate, endDate, reason } = req.body;
    const leave = new Leave({ employeeId: req.user.id, startDate, endDate, reason });
    await leave.save();
    res.status(201).json({ message: "Leave request submitted", leave });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Manager/Admin: Approve or Reject Leave
router.put("/:id", verifyToken, isManager, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const leave = await Leave.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json({ message: `Leave ${status.toLowerCase()} successfully`, leave });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Employee: View Own Leave Requests
router.get("/my-leaves", verifyToken, async (req, res) => {
  try {
    const leaves = await Leave.find({ employeeId: req.user.id });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Manager/Admin: View All Leave Requests
router.get("/", verifyToken, isManager, isAdmin, async (req, res) => {
  try {
    const leaves = await Leave.find().populate("employeeId", "name email role");
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Get Approved Leaves for Calendar
router.get("/approved", verifyToken, async (req, res) => {
    try {
      const leaves = await Leave.find({ status: "Approved" }).populate("employeeId", "name");
      res.json(leaves);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  router.post("/apply", verifyToken, async (req, res) => {
    try {
      const { startDate, endDate, reason } = req.body;
      const leave = new Leave({ employeeId: req.user.id, startDate, endDate, reason });
      await leave.save();
  
      // Send email to HR/Manager
      sendEmail("manager@example.com", "New Leave Request", `Employee ${req.user.name} has requested leave.`);
  
      res.status(201).json({ message: "Leave request submitted", leave });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  router.put("/:id", verifyToken, isManager, async (req, res) => {
    try {
      const { status } = req.body;
      if (!["Approved", "Rejected"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
  
      const leave = await Leave.findByIdAndUpdate(req.params.id, { status }, { new: true }).populate("employeeId");
  
      // Send email notification to the employee
      sendEmail(leave.employeeId.email, "Leave Request Update", `Your leave request has been ${status.toLowerCase()}.`);
  
      res.json({ message: `Leave ${status.toLowerCase()} successfully`, leave });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  router.post("/apply", verifyToken, async (req, res) => {
    try {
      const { startDate, endDate, reason } = req.body;
      const leave = new Leave({ employeeId: req.user.id, startDate, endDate, reason });
      await leave.save();
  
      // Emit notification
      const io = req.app.get("io");
      io.emit("leaveRequest", { message: `New leave request from ${req.user.name}` });
  
      res.status(201).json({ message: "Leave request submitted", leave });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  router.put("/:id", verifyToken, isManager, async (req, res) => {
    try {
      const { status } = req.body;
      if (!["Approved", "Rejected"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
  
      const leave = await Leave.findByIdAndUpdate(req.params.id, { status }, { new: true }).populate("employeeId");
  
      // Emit notification
      const io = req.app.get("io");
      io.emit("leaveUpdate", { message: `Your leave request has been ${status.toLowerCase()}.` });
  
      res.json({ message: `Leave ${status.toLowerCase()} successfully`, leave });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });
  
  
  

module.exports = router;
