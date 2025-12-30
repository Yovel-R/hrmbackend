const express = require("express");
const router = express.Router();
const Leave = require("../models/leave.model");

router.post("/apply", async (req, res) => {
  try {
    const data = req.body;

    const internId = data.internId;
    const fromDate = new Date(data.fromDate);
    const toDate   = new Date(data.toDate);

    const fromDay = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
    const toDay   = new Date(toDate.getFullYear(),   toDate.getMonth(),   toDate.getDate());

    console.log("APPLY request:", {
      internId,
      fromDate: data.fromDate,
      toDate: data.toDate,
      fromDay,
      toDay,
    });

    const overlapping = await Leave.find({
      internId,
      status: { $ne: "rejected" },
      fromDate: { $lte: toDay },
      toDate:   { $gte: fromDay },
    });

    console.log("Overlapping leaves found:", overlapping.length);
    overlapping.forEach(l => {
      console.log(" -", l._id, l.status, l.fromDate, l.toDate);
    });

    if (overlapping.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "You already have a leave request that overlaps these dates.",
      });
    }

    const leave = new Leave({
      internId,
      internName: data.internName,
      leaveType: data.leaveType,
      fromDate: fromDay,
      toDate: toDay,
      numberOfDays: Number(data.numberOfDays),
      reason: data.reason,
      status: "pending",
      rejectionReason: "",
      perDayDurations: data.perDayDurations,
    });

    await leave.save();

    res.status(200).json({
      success: true,
      message: "Leave applied successfully",
      leaveId: leave._id,
    });
  } catch (err) {
    console.error("Leave apply error:", err);
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


// GET /api/intern/pastout?year=2025&month=0
// Returns interns with status "drop" filtered by year and (optionally) month of endDate.
router.get("/pastout", async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10);
    const month = parseInt(req.query.month ?? "0", 10); // 0 = all months

    if (isNaN(year)) {
      return res
        .status(400)
        .json({ message: "year query param is required, e.g. ?year=2025&month=0" });
    }

    // base: only drop/past-out interns
    const dropped = await Intern.find({ status: "drop" }).sort({ endDate: -1 });

    // endDate is saved as "dd-MM-yyyy", so filter in JS
    const filtered = dropped.filter((intern) => {
      const raw = intern.endDate;
      if (!raw || typeof raw !== "string") return false;

      const parts = raw.split("-");
      if (parts.length !== 3) return false;

      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10); // 1–12
      const y = parseInt(parts[2], 10);

      if (isNaN(d) || isNaN(m) || isNaN(y)) return false;
      if (y !== year) return false;
      if (month === 0) return true;

      return m === month;
    });

    return res.status(200).json(filtered);
  } catch (err) {
    console.error("Fetch Past-out Interns Error:", err);
    res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
