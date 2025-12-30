const Resignation = require("../models/resignation.model");
const Intern = require("../models/Intern");
const nodemailer = require("nodemailer");

// Utility to send email
async function sendEmail(to, subject, text, attachments = []) {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, text, attachments });
}

// CREATE resignation
exports.createResignation = async (req, res) => {
  try {
    const { internId } = req.body;
    const existing = await Resignation.findOne({ internId });

    if (existing && existing.status !== "rejected") {
      return res.json({ success: false, message: "Off boarding already submitted" });
    }

    if (existing && existing.status === "rejected") {
      Object.assign(existing, { ...req.body, status: "pending", createdAt: new Date() });
      await existing.save();
      return res.json({ success: true, message: "Resignation resubmitted successfully", data: existing });
    }

    const data = new Resignation({ ...req.body, status: "pending" });
    await data.save();
    res.json({ success: true, message: "Resignation submitted successfully", data });
  } catch (error) {
    console.error("Resignation Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// CHECK if resignation exists for an intern
exports.checkResignation = async (req, res) => {
  try {
    const { internId } = req.params;
    const existing = await Resignation.findOne({ internId });

    res.json({
      exists: !!existing && existing.status !== "rejected",
      status: existing?.status || null,
    });
  } catch (error) {
    res.status(500).json({ exists: false });
  }
};

// GET all resignations
exports.getAllResignations = async (req, res) => {
  try {
    const list = await Resignation.find().sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// GET resignation by internId
exports.getResignationByInternId = async (req, res) => {
  try {
    const record = await Resignation.findOne({ internId: req.params.internId });
    if (!record) return res.json({ success: false, message: "No record found" });
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// GET pending resignations
exports.getPendingResignations = async (req, res) => {
  try {
    const pendingList = await Resignation.find({ status: "pending" }).sort({ createdAt: -1 });
    res.json({ success: true, data: pendingList });
  } catch (err) {
    console.error("Fetch Pending Resignations Error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// ACCEPT / REJECT resignation
exports.updateResignationStatus = async (req, res) => {
  try {
    const { action, id } = req.params;
    

    const resignation = await Resignation.findById(id);
    if (!resignation) return res.status(404).json({ message: "Resignation not found" });

    const intern = await Intern.findOne({ internid: resignation.internId });
    if (!intern) return res.status(404).json({ message: "Intern not found" });

    let attachments = [];
    if (req.files?.length) {
      req.files.forEach(f => attachments.push({ path: f.path, filename: f.originalname }));
    }

    if (action === "accept") {
      resignation.status = "accepted";
      await resignation.save();

      intern.status = "drop";
      await intern.save();

      await sendEmail(
        intern.email,
        "Your Resignation has been Accepted",
        `Hello ${intern.fullName},\n\nYour resignation has been accepted.\n\nBest Regards,\nHR Team`,
        attachments
      );

      return res.json({ message: "Resignation accepted and email sent" });

    } else if (action === "reject") {
      resignation.status = "rejected";
      await resignation.save();

      await sendEmail(
        intern.email,
        "Your Resignation has been Rejected",
        `Hello ${intern.fullName},\n\nYour resignation request has been rejected.\n\nBest Regards,\nHR Team`
      );

      return res.json({ message: "Resignation rejected and email sent" });

    } else {
      return res.status(400).json({ message: "Invalid action" });
    }
  } catch (err) {
    console.error("Resignation Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
