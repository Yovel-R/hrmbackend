const hrModel = require("../models/hr_models");

// HR Signup
exports.hrSignup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await hrModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: "Email already exists" });
    }

    const newHR = new hrModel({
      name,
      email,
      password, 
    });

    await newHR.save();

    res.status(201).json({
      msg: "HR Registered Successfully",
      user: newHR
    });

  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err });
  }
};

// HR Login
exports.hrLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await hrModel.findOne({ email });

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (user.password !== password) {
      return res.status(400).json({ msg: "Invalid password" });
    }

    res.status(200).json({
      msg: "Login successful",
      user
    });

  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err });
  }
};
