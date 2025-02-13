const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { check, validationResult } = require("express-validator");
const User = require("../models/User");

const router = express.Router(); 

//register
router.post(
    "/register",
    [
        check("name", "Name is required").not().isEmpty(),
        check("email", "Please include a valid email").isEmail(),
        check("password", "Password must be at least 8 characters").isLength({min: 8}),

    ],
    async(req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()){
            return res.status(400).json({errors: errors.array()});
        }

        const { name, email, password } =req.body;

        try {
            let user = await User.findOne({ email})
            if (user) {
                return res.status(400).json({ msg: "User already exists"});
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            user = new User({
                name,
                email,
                password: hashedPassword,
            });

            await user.save();

            const payload = { user: { id: user.id, role: user.role }};
            const token = jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: "1h"});

            res.status(201).json({token});
        
            
        } catch (error) {
            console.error(err.message);
            res.status(500).send("Server Error");
            
        }
    }
);


//authenticate user

router.post(
    "/login",
    [
        check("email", "Please include a valid email").isEmail(),
        check("password", "Password is required").exists
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password} = req.body;

    
        try {
            let user = await User.findOne({ email });
            if (!user) {
                return res,status(400).json({ msg: "invalid Credentials"});
            }
            
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ msg: "Invalid Credentials"});
            }

            const payload = { user: { id: user.id, role: user.role } };
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "ih"});

            res.json({ token });

        } catch (error) {
            console.error(err.message);
            res.status(500).send("Server Error")
            
        }
    }
);

module.exports = router;