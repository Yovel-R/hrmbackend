const express = require("express");
const router = express.Router();
const Leave = require("../models/leave.model");

// POST /leave/apply
router.post("/apply", async (req, res) => {
  try {
    const data = req.body;

    const leave = new Leave({
      internId: data.internId,
      internName: data.internName,
      leaveType: data.leaveType,
      fromDate: new Date(data.fromDate),
      toDate: new Date(data.toDate),
      numberOfDays: Number(data.numberOfDays),
      reason: data.reason,
      status: "pending",
      rejectionReason: "",
      perDayDurations: data.perDayDurations
    });

    await leave.save();

    res.status(200).json({
      success: true,
      message: "Leave applied successfully",
      leaveId: leave._id
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/pending", async (req, res) => {
  try {
    // Find all leaves where status is 'pending'
    const pendingLeaves = await Leave.find({ status: "pending" });

    res.status(200).json(pendingLeaves);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: "Leave not found" });

    leave.status = status;
    if (status === "rejected") {
      leave.rejectionReason = rejectionReason || "";
    }

    await leave.save();
    res.status(200).json({ success: true, leave });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// GET /api/leave/:internId
router.get("/:internId", async (req, res) => {
  try {
    const internId = req.params.internId;
    const leaves = await Leave.find({ internId }); // filter by internId
    res.status(200).json(leaves);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
