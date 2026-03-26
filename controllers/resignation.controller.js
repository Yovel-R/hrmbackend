const Resignation = require("../models/resignation.model");
const Intern = require("../models/Intern");
const sendEmail = require("../utilities/sendEmail");

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
      req.files.forEach(f => attachments.push({ content: f.buffer, filename: f.originalname }));
    }

    if (action === "accept") {
      resignation.status = "accepted";
      await resignation.save();

      intern.status = "drop";
      await intern.save();

      const lastDate = resignation.lastWorkingDay 
        ? new Date(resignation.lastWorkingDay).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) 
        : "(TBD)";
      
      let certificateLine = "";
      if (attachments.length > 0) {
        const fileNames = attachments.map(a => a.filename).join(", ");
        certificateLine = `Please find the following documents attached for your records: ${fileNames}.`;
      } else {
        certificateLine = "Your internship completion certificate and experience letter will be issued within 7 working days after the successful completion of all formalities.";
      }

      await sendEmail({
        to: intern.email,
        subject: "Internship Offboarding Confirmed – Softrate Global",
        text: `Dear ${intern.fullName},

Thank you for submitting your offboarding form. We are pleased to confirm that your internship offboarding process has been successfully initiated and accepted by the HR team.

Your internship with Softrate Global officially concludes on ${lastDate}. It has been a pleasure having you as part of our team, and we appreciate the effort and enthusiasm you have brought during your tenure.

As part of the offboarding process, please ensure the following are completed before your last day:

1. Return all company-issued assets (ID card, access badge, equipment, etc.)
2. Complete knowledge transfer and handover of pending tasks to your reporting manager
3. Ensure all project documentation is up to date and shared with the team
4. Clear any outstanding approvals or submissions

${certificateLine}

We truly wish you the very best in your academic and professional journey ahead. Stay in touch!

Warm regards,
Human Resources
Softrate Global`,
        attachments
      });

      return res.json({ message: "Resignation accepted and email sent" });

    } else if (action === "reject") {
      resignation.status = "rejected";
      await resignation.save();

      await sendEmail({
        to: intern.email,
        subject: "Your Resignation has been Rejected",
        text: `Hello ${intern.fullName},\n\nYour resignation request has been rejected.\n\nBest Regards,\nHR Team`
      });

      return res.json({ message: "Resignation rejected and email sent" });

    } else {
      return res.status(400).json({ message: "Invalid action" });
    }
  } catch (err) {
    console.error("Resignation Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
