const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { verifyToken, isAdmin, isSectionalHead, isDepartmentalHead, isHRDirector } = require("../middleware/authMiddleware");
const jwt = require("jsonwebtoken");
const router = express.Router();

// USER REGISTRATION
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
    }
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 8);

    // Save user
    const newUser = new User({ name, email, password: hashedPassword, role });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully", role: User.role });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// USER LOGIN (JWT Authentication)
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Generate JWT Token
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.status(200).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// PROTECTED ROUTE - ADMIN DASHBOARD
router.get("/admin-dashboard", verifyToken, isSectionalHead, isDepartmentalHead, isAdmin, isHRDirector, (req, res) => {
  res.json({ msg: "Welcome to Admin Dashboard!" });
});

// PROTECTED ROUTE - EMPLOYEE DASHBOARD
router.get("/employee-dashboard", verifyToken, (req, res) => {
  res.json({ msg: "Welcome to Employee Dashboard!" });
});

router.get("/manager-dashboard", verifyToken, (req, res) => {
  res.json({ msg: "Welcome to Manager Dashboard" });
}); 

module.exports = router;
