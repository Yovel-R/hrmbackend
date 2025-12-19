const express = require("express");
const multer = require("multer");
const Employee = require("../models/EmployeeModel");
const nodemailer = require("nodemailer");

const router = express.Router();

// ✅ Multer – in memory (no files saved to DB)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|jpg|jpeg|png/;
    const ext = allowed.test(file.originalname.toLowerCase());
    cb(ext ? null : new Error("Invalid file type"), ext);
  },
});

// ✅ Nodemailer setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SENDER_EMAIL_USER,
    pass: process.env.SENDER_EMAIL_PASS,
  },
});

// POST /api/employee/onboard
router.post(
  "/onboard",
  upload.fields([
    { name: "resume" },
    { name: "photo" },
    { name: "aadhaar" },
    { name: "pan" },
    { name: "ugCertificate" },
    { name: "pgCertificate" },
    { name: "experienceLetter" },
    { name: "relievingLetter" },
    { name: "bankProof" },
  ]),
  async (req, res) => {
    try {
        console.log('BODY ==> ', req.body);
        console.log('FILES ==> ', Object.keys(req.files || {}));

      // 1️⃣ Save only textual form data in DB
      const {
        fullName,
        email,
        phone,
        isExperienced,
        emergencyName,
        emergencyPhone,
        dob,
        address,
        linkedin,
        gender,
        nationality,
        maritalStatus,
        qualification,
        specialization,
        college,
        passingYear,
        ugCgpa,
        pgCgpa,
        experienceYears,
        previousOrg,
        designation,
        declaration,
        bgConsent,
        whatsappConsent,
      } = req.body;

      const employee = await Employee.create({
        fullName,
        email,
        phone,
        isExperienced: isExperienced === "true",
        emergencyName,
        emergencyPhone,
        dob,
        address,
        linkedin,
        gender,
        nationality,
        maritalStatus,
        qualification,
        specialization,
        college,
        passingYear,
        ugCgpa,
        pgCgpa,
        experienceYears,
        previousOrg,
        designation,
        declaration: declaration === "true",
        bgConsent: bgConsent === "true",
        whatsappConsent: whatsappConsent === "true",
      });

      // 2️⃣ Send PDFs via email (in-memory)
      const files = req.files;
      const attachments = Object.values(files)
        .flat()
        .map((file) => ({
          filename: file.originalname,
          content: file.buffer,
        }));

      await transporter.sendMail({
        from: `"HR Onboarding" <${process.env.SENDER_EMAIL_USER}>`,
        to: process.env.RECIVER_EMAIL_USER,
        subject: `New Employee Onboarding – ${employee.fullName}`,
        html: `
          <h3>New Employee Onboarding Submitted</h3>
          <p><b>Name:</b> ${employee.fullName}</p>
          <p><b>Email:</b> ${employee.email}</p>
          <p><b>Phone:</b> ${employee.phone}</p>
          <p><b>Experience:</b> ${employee.isExperienced ? "Experienced" : "Fresher"}</p>
        `,
        attachments,
      });

      res.status(200).json({ message: "Onboarding submitted successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

module.exports = router;
