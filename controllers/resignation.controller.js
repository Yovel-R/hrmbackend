const Resignation = require("../models/resignation.model");
const Intern = require("../models/Intern");
// CREATE
exports.createResignation = async (req, res) => {
  try {
    const { internId } = req.body;

    // Check if already submitted
    const existing = await Resignation.findOne({ internId });

    if (existing) {
      return res.json({
        success: false,
        message: "Resignation already submitted",
      });
    }

    // Save new record
    const data = new Resignation(req.body);
    await data.save();

    res.json({
      success: true,
      message: "Resignation submitted successfully",
      data,
    });

  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};


// GET ALL
exports.getAllResignations = async (req, res) => {
  try {
    const list = await Resignation.find().sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// GET by internId
exports.getResignationByInternId = async (req, res) => {
  try {
    const internId = req.params.internId;
    const record = await Resignation.findOne({ internId });

    if (!record)
      return res.json({ success: false, message: "No record found" });

    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
// ACCEPT / REJECT resignation
exports.updateResignationStatus = async (req, res) => {
  try {
    const { action, id } = req.params; // action = "accept" or "reject"

    const resignation = await Resignation.findById(id);
    if (!resignation) return res.status(404).json({ message: "Resignation request not found" });

    if (action === "accept") {
      resignation.status = "accepted";
      await resignation.save();

      // Update intern status to "drop"
      const intern = await Intern.findOne({ internid: resignation.internId });
      if (intern) {
        intern.status = "drop";
        await intern.save();
      }

      res.json({ message: "Resignation accepted", resignation });
    } else if (action === "reject") {
      resignation.status = "rejected";
      await resignation.save();
      res.json({ message: "Resignation rejected", resignation });
    } else {
      res.status(400).json({ message: "Invalid action" });
    }
  } catch (err) {
    console.error("Resignation Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
exports.getPendingResignations = async (req, res) => {
  try {
    const pendingList = await Resignation.find({ status: "pending" }).sort({ createdAt: -1 });
    res.json({ success: true, data: pendingList });
  } catch (err) {
    console.error("Fetch Pending Resignations Error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

