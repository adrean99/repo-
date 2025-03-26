const express = require("express");
const router = express.Router();
const ShortLeave = require("../models/ShortLeave");
const AnnualLeave = require("../models/AnnualLeave");
const mongoose = require("mongoose");
const sendEmail = require("../utils/emailService");
const { verifyToken, hasRole } = require("../middleware/authMiddleware");
const User = require("../models/User");
const LeaveBalance = require("../models/LeaveBalance");


// Utility function to count working days (fixed typo: newDate → new Date)
const countWorkingDays = (start, end) => {
  let count = 0;
  let current = new Date(start);
  const holidays = [new Date("2025-01-01")]; // Fixed typo

  while (current <= end) {
    const day = current.getUTCDay();
    if (day !== 0 && day !== 6 && !holidays.some(h => h.toDateString() === current.toDateString())) {
      count++;
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return count;
};




// Apply for leave (Employee)
// POST /api/leaves/apply
router.post("/apply", verifyToken, async (req, res) => {
  try {
    console.log("Request User:", req.user);
    console.log("Request Body:", req.body);

    if (!req.user || !req.user.id || !mongoose.Types.ObjectId.isValid(req.user.id)) {
      console.log("User validation failed:", req.user);
      return res.status(401).json({ error: "Invalid or missing user ID" });
    }

    const userExists = await User.findById(req.user.id);
    if (!userExists) {
      return res.status(400).json({ error: "User not found" });
    }

    const {
      leaveType,
      chiefOfficerName,
      supervisorName,
      employeeName,
      personNumber,
      department,
      daysApplied,
      startDate,
      endDate,
      reason,
      assignedToName,
      assignedToDesignation,
      recommendation,
      // Annual Leave fields
      sector,
      addressWhileAway,
      emailAddress,
      phoneNumber,
      leaveBalanceBF,
      currentYearLeave,
      leaveTakenThisYear,
      computedBy,
      sectionalHeadName,
      departmentalHeadName,
      HRDirectorName,
    } = req.body;

  // Fetch user's leave balance
  let leaveBalance = await LeaveBalance.findOne({ userId: req.user.id });
  if (!leaveBalance) {
    leaveBalance = new LeaveBalance({
      userId: req.user.id,
      year: new Date().getFullYear(),
      leaveBalanceBF: 0,
      currentYearLeave: 30,
      leaveTakenThisYear: 0,
    });
    await leaveBalance.save();
  }

  // Check available leave balance
  const totalLeaveDays = leaveBalance.leaveBalanceBF + leaveBalance.currentYearLeave;
  const leaveBalanceDue = totalLeaveDays - leaveBalance.leaveTakenThisYear;

  if (daysApplied > leaveBalanceDue) {
    return res.status(400).json({ error: "Insufficient leave balance" });
  }


    if (!leaveType || !startDate || !reason || !employeeName || !personNumber || !department || !daysApplied) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = endDate ? new Date(endDate) : null;
    if (end) end.setUTCHours(0, 0, 0, 0);

    if (isNaN(start.getTime()) || (end && isNaN(end.getTime()))) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    let leave;
    if (leaveType === "Short Leave") {
      if (!chiefOfficerName || !supervisorName || !daysApplied) {
        return res.status(400).json({ error: "Chief Officer Name, Supervisor Name, and Days Applied are required for Short Leave" });
      }
      if (!Number.isInteger(daysApplied) || daysApplied <= 0 || daysApplied > 5) {
        return res.status(400).json({ error: "Days applied must be a number between 1 and 5" });
      }
      if (!end) {
        return res.status(400).json({ error: "End Date is required for Short Leave" });
      }
      const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
      if (diffDays > 5 || diffDays !== daysApplied) {
        return res.status(400).json({ error: "Short leave must be 1-5 days and match date range" });
      }

      console.log("Creating short leave for user:", req.user.id);
      leave = new ShortLeave({
        employeeId: req.user.id,
        leaveType: "Short Leave",
        chiefOfficerName,
        supervisorName,
        employeeName,
        personNumber,
        department,
        daysApplied,
        startDate: start,
        endDate: end,
        reason,
        assignedToName,
        assignedToDesignation,
        recommendation,
        status: "Pending",
      });
    } else if (leaveType === "Annual Leave") {
      if (!Number.isInteger(daysApplied) || daysApplied <= 0 || daysApplied > 30) {
        return res.status(400).json({ error: "Days applied must be between 1 and 30" });
      }
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      if (start - today < 7 * 24 * 60 * 60 * 1000) {
        return res.status(400).json({ error: "Annual leave must be submitted at least 7 days in advance" });
      }
      // Working days calculation
      const workingDays = countWorkingDays(start, end);
      if (workingDays !== daysApplied) {
        return res.status(400).json({ error: `Days applied (${daysApplied}) must match working days (${workingDays}) after excluding weekends and holidays` });
      }
      // Leave computation
      const totalLeaveDays = (leaveBalanceBF || 0) + (currentYearLeave || 0);
      const leaveBalanceDue = totalLeaveDays - (leaveTakenThisYear || 0);
      if (daysApplied > leaveBalanceDue) {
        return res.status(400).json({ error: "Insufficient leave balance" });
      }

      console.log("Creating annual leave for user:", req.user.id);
      leave = new AnnualLeave({
        employeeId: req.user.id,
        leaveType: "Annual Leave",
        employeeName,
        personNumber,
        department,
        sector,
        daysApplied,
        startDate: start,
        endDate: end,
        addressWhileAway,
        emailAddress,
        phoneNumber,
        reason,
        leaveBalanceBF: leaveBalanceBF || 0,
        currentYearLeave: currentYearLeave || 0,
        totalLeaveDays: totalLeaveDays,
        leaveTakenThisYear: leaveTakenThisYear || 0,
        leaveBalanceDue: leaveBalanceDue,
        leaveApplied: daysApplied,
        leaveBalanceCF: leaveBalanceDue - daysApplied,
        computedBy,
        computedDate: computedBy ? new Date() : undefined,
        sectionalHeadName,
        departmentalHeadName,
        HRDirectorName,
        approvals: [
          { approverRole: "Sectional Head", status: "Pending" },
          { approverRole: "Departmental Head", status: "Pending" },
          { approverRole: "HR Director", status: "Pending" },
        ],
        status: "Pending",
      });
    } else {
      return res.status(400).json({ error: "Invalid leave type" });
    }

    console.log("Saving leave:", leave);
    await leave.save();
    console.log("Leave saved:", leave);


    
    const io = req.app.get("io");
    if (io) {
      io.emit("newLeaveRequest", {
        leaveType: leave.leaveType,
        employeeName: leave.employeeName,
        id: leave._id,
      });
    }

    const adminEmail = (await User.findOne({ role: "Admin" }))?.email || "admin@example.com";
    await sendEmail(adminEmail, "New Leave Request", `New ${leave.leaveType} request from ${leave.employeeName}.`);

    res.status(201).json({ message: "Leave request submitted", leave });
  } catch (error) {
    console.error("Error applying for leave:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// Get own leave requests (Employee)
// GET /api/leaves/my-leaves
router.get("/my-leaves", verifyToken, async (req, res) => {
  try {
    const { leaveType } = req.query;
    console.log("Fetching leaves for user:", req.user.id, "with leaveType:", leaveType);
    const currentDate = new Date();

    // Auto-reject overdue pending leaves
    if (leaveType === "Short Leave") {
      await ShortLeave.updateMany(
        {
          employeeId: req.user.id,
          status: "Pending",
          startDate: { $lte: currentDate },
        },
        { status: "Rejected" }
      );
    } else if (leaveType === "Annual Leave") {
      await AnnualLeave.updateMany(
        {
          employeeId: req.user.id,
          status: "Pending",
          startDate: { $lte: currentDate },
        },
        { status: "Rejected" }
      );
    }
    let leaveRequests;

    if (leaveType === "Short Leave") {
      leaveRequests = await ShortLeave.find({ employeeId: req.user.id }).sort({ createdAt: -1 });
    } else if (leaveType === "Annual Leave") {
      leaveRequests = await AnnualLeave.find({ employeeId: req.user.id }).sort({ createdAt: -1 });
    } else {
      return res.status(400).json({ error: "Invalid leave type" });
    }

    console.log("Leave requests for user:", req.user.id, leaveRequests);
    res.status(200).json(leaveRequests);
  } catch (error) {
    console.error("Error fetching leave requests:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

router.get("/pending-approvals", verifyToken, hasRole(["Supervisor", "SectionalHead", "DepartmentalHead", "HRDirector", "Admin"]), async (req, res) => {
  try {


    let leaveRequests = [];
    if (req.user.role === "Supervisor" || req.user.role === "Admin") {
      const shortLeaves = await ShortLeave.find({ status: "Pending" }).sort({ createdAt: -1 });
      leaveRequests = [...leaveRequests, ...shortLeaves];
    }
    if (["SectionalHead", "DepartmentalHead", "HRDirector", "Admin"].includes(req.user.role)) {
      const annualLeaves = await AnnualLeave.find({
        "approvals": { $elemMatch: { approverRole: req.user.role, status: "Pending" } },
      }).sort({ createdAt: -1 });
      leaveRequests = [...leaveRequests, ...annualLeaves];
    }
    res.status(200).json(leaveRequests);
  } catch (error) {
    console.error("Error fetching pending approvals:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

router.patch("/approve/:id", verifyToken, hasRole(["Supervisor", "SectionalHead", "DepartmentalHead", "HRDirector", "Admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body; // "Approved" or "Rejected"

    let leave = await ShortLeave.findById(id);
    let isShortLeave = !!leave;
    if (!leave) {
      leave = await AnnualLeave.findById(id);
    }
    if (!leave) return res.status(404).json({ error: "Leave request not found" });

    if (isShortLeave) {
      if (req.user.role === "Supervisor") {
        leave.status = "Pending"; 
        leave.recommendation = comment || leave.recommendation;
      } else if (req.user.role === "HRDirector" || req.user.role === "Admin") {
        leave.status = status; 
        leave.recommendation = comment || leave.recommendation;
      } else {
        return res.status(403).json({ error: "Only Supervisor, HRDirector, or Admin can approve Short Leave" });
      }
      await leave.save();

      if (leave.status === "Approved") {
        const leaveBalance = await LeaveBalance.findOne({ userId: leave.employeeId });
        if (leaveBalance) {
          const currentYear = new Date().getFullYear();
          const approvedLeaves = [
            ...(await ShortLeave.find({
              employeeId: leave.employeeId,
              status: "Approved",
              startDate: { $gte: new Date(currentYear, 0, 1), $lte: new Date(currentYear, 11, 31) },
            })),
            ...(await AnnualLeave.find({
              employeeId: leave.employeeId,
              status: "Approved",
              startDate: { $gte: new Date(currentYear, 0, 1), $lte: new Date(currentYear, 11, 31) },
            })),
          ];
          leaveBalance.leaveTakenThisYear = approvedLeaves.reduce((sum, l) => sum + (l.daysApplied || 0), 0);
          await leaveBalance.save();
        }
      }
    } else {
      const approval = leave.approvals.find(a => a.approverRole === req.user.role && a.status === "Pending");
      if (!approval && req.user.role !== "Admin") {
        return res.status(403).json({ error: `Not authorized as ${req.user.role}` });
      }
      if (approval) {
        approval.status = status;
        approval.comment = comment || "";
        approval.updatedAt = Date.now();
      }
      if (leave.approvals.every(a => a.status === "Approved")) {
        leave.status = "Approved";
      } else if (leave.approvals.some(a => a.status === "Rejected")) {
        leave.status = "Rejected";
      } else {
        leave.status = "Pending";
      }
      await leave.save();
    

    if (leave.status === "Approved") {
      const leaveBalance = await LeaveBalance.findOne({ userId: leave.employeeId });
      if (leaveBalance) {
        const currentYear = new Date().getFullYear();
        const approvedLeaves = [
          ...(await ShortLeave.find({
            employeeId: leave.employeeId,
            status: "Approved",
            startDate: { $gte: new Date(currentYear, 0, 1), $lte: new Date(currentYear, 11, 31) },
          })),
          ...(await AnnualLeave.find({
            employeeId: leave.employeeId,
            status: "Approved",
            startDate: { $gte: new Date(currentYear, 0, 1), $lte: new Date(currentYear, 11, 31) },
          })),
        ];
        leaveBalance.leaveTakenThisYear = approvedLeaves.reduce((sum, l) => sum + (l.daysApplied || 0), 0);
        await leaveBalance.save();
      }
    }
  }

    const io = req.app.get("io");
    if (io) {
      io.emit("leaveStatusUpdate", { id: leave._id, status: leave.status });
    }

    const employee = await User.findById(leave.employeeId);
    const employeeEmail = employee?.email || "employee@example.com";
    await sendEmail(employeeEmail, "Leave Status Update", `Your ${leave.leaveType} request has been ${leave.status.toLowerCase()}. Comment: ${comment || "None"}`);

    res.status(200).json({ message: "Leave status updated", leave });
  } catch (error) {
    console.error("Error updating leave:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});


router.patch("/admin/leaves/:id", verifyToken, hasRole(["Supervisor", "SectionalHead", "DepartmentalHead", "HRDirector", "Admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body; 
    console.log("Admin updating leave:", id, "with updates:", updates, "by role:", req.user.role);

    let leave = await ShortLeave.findById(id);
    let isShortLeave = !!leave;
    if (!leave) {
      leave = await AnnualLeave.findById(id);
    }
    if (!leave) {
      return res.status(404).json({ error: "Leave request not found" });
    }

    const allowedUpdates = {
      Supervisor: ["SupervisorRecommendation", "supervisorDate"],
      SectionalHead: ["sectionalHeadRecommendation", "sectionalHeadDate"],
      DepartmentalHead: [
        "departmentalHeadRecommendation",
        "departmentalHeadDate",
        "departmentalHeadDaysGranted",
        "departmentalHeadStartDate",
        "departmentalHeadLastDate",
        "departmentalHeadResumeDate",
      ],
      HRDirector: ["approverRecommendation", "approverDate"],
      Admin: [
        "sectionalHeadRecommendation",
        "sectionalHeadDate",
        "departmentalHeadRecommendation",
        "departmentalHeadDate",
        "departmentalHeadDaysGranted",
        "departmentalHeadStartDate",
        "departmentalHeadLastDate",
        "departmentalHeadResumeDate",
        "approverRecommendation",
        "approverDate",
      ],
    };

    const userRole = req.user.role;
    const allowedFields = allowedUpdates[userRole];
    if (!allowedFields) {
      return res.status(403).json({ error: `Role ${userRole} not authorized to update leave` });
    }

    if (isShortLeave && !["Supervisor", "HRDirector", "Admin"].includes(userRole)) {
      return res.status(403).json({ error: "Only Supervisor, HRDirector, or Admin can update Short Leave" });
    }

    // Filter updates to only allowed fields
    const filteredUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = value;
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ error: "No valid fields provided for update" });
    }

    if ((userRole === "HRDirector" || userRole === "Admin") && "approverRecommendation" in filteredUpdates) {
      filteredUpdates.status = filteredUpdates.approverRecommendation === "Approved" ? "Approved" : "Rejected";
      if (filteredUpdates.status === "Approved") {
        const leaveBalance = await LeaveBalance.findOne({ userId: leave.employeeId });
        if (leaveBalance) {
          const currentYear = new Date().getFullYear();
          const approvedLeaves = [
            ...(await ShortLeave.find({
              employeeId: leave.employeeId,
              status: "Approved",
              startDate: { $gte: new Date(currentYear, 0, 1), $lte: new Date(currentYear, 11, 31) },
            })),
            ...(await AnnualLeave.find({
              employeeId: leave.employeeId,
              status: "Approved",
              startDate: { $gte: new Date(currentYear, 0, 1), $lte: new Date(currentYear, 11, 31) },
            })),
          ];
          leaveBalance.leaveTakenThisYear = approvedLeaves.reduce((sum, l) => sum + (l.daysApplied || 0), 0);
          await leaveBalance.save();
        }
      }
    }

    Object.assign(leave, filteredUpdates);
    await leave.save();

    console.log("Leave updated:", leave);
    res.status(200).json({ message: "Leave updated successfully", leave });
  } catch (error) {
    console.error("Error updating leave:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});



router.get("/approved", verifyToken, async (req, res) => {
  try {
    const shortLeaves = await ShortLeave.find({ status: "Approved" }).populate("employeeId", "name");
    const annualLeaves = await AnnualLeave.find({ status: "Approved" }).populate("employeeId", "name");
    const leaves = [...shortLeaves, ...annualLeaves];
    res.json(leaves);
  } catch (error) {
    console.error("Error fetching approved leaves:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

//GET /api/leaves/admin/leaves
router.get(
  "/admin/leaves",
  verifyToken,
  hasRole(["Admin", "SectionalHead", "DepartmentalHead", "HRDirector"]),
  async (req, res) => {
    try {
      const { leaveType } = req.query;
      console.log("Fetching admin leaves with leaveType:", leaveType);
      let leaveRequests;

      if (leaveType === "Short Leave") {
        leaveRequests = await ShortLeave.find().sort({ createdAt: -1 });
      } else if (leaveType === "Annual Leave") {
        leaveRequests = await AnnualLeave.find().sort({ createdAt: -1 });
      } else {
        return res.status(400).json({ error: "Invalid leave type" });
      }

      console.log("Admin leaves found:", leaveRequests);
      res.status(200).json(leaveRequests);
    } catch (error) {
      console.error("Error fetching admin leaves:", error);
      res.status(500).json({ error: "Server error", details: error.message });
    }
  }
);


router.get("/all", verifyToken,
  hasRole(["Admin", "SectionalHead", "DepartmentalHead", "HRDirector"]),
  async (req, res) => {
  try {
  
    // Fetch all Short Leave and Annual Leave requests
    const shortLeaves = await ShortLeave.find().populate("employeeId");
    const annualLeaves = await AnnualLeave.find().populate("employeeId");

    // Combine and sort by createdAt (newest first)
    const allLeaves = [...shortLeaves, ...annualLeaves].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.status(200).json(allLeaves);
  } catch (error) {
    console.error("Error fetching all leave requests:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// Utility function to get manager's email based on employee's data
const getManagerEmail = async (employeeId) => {
  try {
    const employee = await User.findById(employeeId);
    const manager = await User.findOne({ department: employee.department, role: "Manager" });
    return manager ? manager.email : "manager@example.com";
  } catch (error) {
    console.error("Error retrieving manager email:", error);
    return "manager@example.com";
  }
};

module.exports = router;