const express = require("express");
const router = express.Router();
const EmployeeLeave = require("../models/employeeLeave.model");

// POST /api/employee-leave/apply
router.post("/apply", async (req, res) => {
  try {
    const data = req.body;

    const employeeId = data.employeeId;
    const fromDate = new Date(data.fromDate);
    const toDate = new Date(data.toDate);

    // normalize dates (remove time)
    const fromDay = new Date(
      fromDate.getFullYear(),
      fromDate.getMonth(),
      fromDate.getDate()
    );
    const toDay = new Date(
      toDate.getFullYear(),
      toDate.getMonth(),
      toDate.getDate()
    );

    // overlap check (ignore rejected)
    const overlapping = await EmployeeLeave.find({
      employeeId,
      status: { $ne: "rejected" },
      fromDate: { $lte: toDay },
      toDate: { $gte: fromDay },
    });

    if (overlapping.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "You already have a pending/approved leave that overlaps these dates.",
      });
    }

    const leave = new EmployeeLeave({
      employeeId,
      employeeName: data.employeeName,
      leaveType: data.leaveType,
      fromDate: fromDay,
      toDate: toDay,
      numberOfDays: Number(data.numberOfDays),
      reason: data.reason,
      status: "pending",
      rejectionReason: "",
      perDayDurations: data.perDayDurations || {},
    });

    await leave.save();

    res.status(200).json({
      success: true,
      message: "Leave applied successfully",
      leaveId: leave._id,
    });
  } catch (err) {
    console.error("Employee leave apply error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
// GET /api/employee-leave/pending
router.get("/pending", async (req, res) => {
  try {
    const pendingLeaves = await EmployeeLeave.find({ status: "pending" })
      .sort({ createdAt: -1 });

    res.status(200).json(pendingLeaves);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// PUT /api/employee-leave/:id
router.put("/:id", async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;

    const leave = await EmployeeLeave.findById(req.params.id);
    if (!leave) {
      return res
        .status(404)
        .json({ success: false, message: "Leave not found" });
    }

    leave.status = status;

    if (status === "rejected") {
      leave.rejectionReason = rejectionReason || "";
    } else {
      leave.rejectionReason = "";
    }

    await leave.save();

    res.status(200).json({ success: true, leave });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// GET /api/employee-leave/employee/:employeeId
router.get("/employee/:employeeId", async (req, res) => {
  try {
    const employeeId = req.params.employeeId;

    const leaves = await EmployeeLeave.find({ employeeId })
      .sort({ fromDate: -1 });

    res.status(200).json(leaves);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
module.exports = router;
