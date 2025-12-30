const express = require("express");
const router = express.Router();

const EmployeeLeave = require("../models/employeeLeave.model");
const LeaveCounter = require("../models/leaveCounter.model");

/* ============================
   APPLY LEAVE
============================ */
router.post("/apply", async (req, res) => {
  try {
    const data = req.body;

    const fromDate = new Date(data.fromDate);
    const toDate = new Date(data.toDate);

    const fromDay = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
    const toDay = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());

    // 1️⃣ OVERLAPPING LEAVE CHECK
    const overlapping = await EmployeeLeave.find({
      employeeId: data.employeeId,
      status: { $ne: "rejected" },
      fromDate: { $lte: toDay },
      toDate: { $gte: fromDay },
    });

    if (overlapping.length > 0) {
      return res.status(400).json({
        success: false,
        message: "You already have an overlapping leave.",
      });
    }

    // 2️⃣ FETCH LEAVE COUNTER (BALANCE)
    const counter = await LeaveCounter.findOne({
      employeeId: data.employeeId,
      leaveType: data.leaveType,
    });

    if (!counter) {
      return res.status(404).json({
        success: false,
        message: "Leave balance not found",
      });
    }

    // 3️⃣ ✅ INSUFFICIENT LEAVE BALANCE CHECK
    if (Number(data.numberOfDays) > counter.balance) {
      return res.status(400).json({
        success: false,
        message: "Insufficient leave balance",
      });
    }

    // 4️⃣ CREATE LEAVE (NO DEDUCTION HERE)
    const leave = await EmployeeLeave.create({
      employeeId: data.employeeId,
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

    res.json({ success: true, leaveId: leave._id });
  } catch (err) {
    console.error("Leave apply error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ============================
   GET LEAVE BALANCE
============================ */
router.get("/balance/:employeeId", async (req, res) => {
  try {
    const counters = await LeaveCounter.find({
      employeeId: req.params.employeeId,
    })
      .select("leaveType balance totalAllowed used")
      .lean();

    if (!counters.length) {
      return res.status(404).json({
        success: false,
        message: "Leave balance not found",
      });
    }

    res.json({ success: true, data: counters });
  } catch (err) {
    console.error("Leave balance error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ============================
   UPDATE LEAVE BALANCE
============================ */

router.put("/update-status/:leaveId", async (req, res) => {
  try {
    const { status } = req.body;

    const leave = await EmployeeLeave.findById(req.params.leaveId);
    if (!leave) {
      return res.status(404).json({ success: false, message: "Leave not found" });
    }

    leave.status = status;
    await leave.save();

    // ✅ Reduce balance ONLY when approved
    if (status === "approved") {
      const counter = await LeaveCounter.findOne({
        employeeId: leave.employeeId,
        leaveType: leave.leaveType,
      });

      if (!counter) {
        return res.status(404).json({
          success: false,
          message: "Leave balance not found",
        });
      }

      counter.used += leave.numberOfDays;
      counter.balance = counter.totalAllowed - counter.used;

      await counter.save();
    }

    res.json({ success: true, message: "Leave updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ============================
   GET EMPLOYEE LEAVES
============================ */
router.get("/employee/:employeeId", async (req, res) => {
  try {
    const leaves = await EmployeeLeave.find({
      employeeId: req.params.employeeId,
    }).sort({ fromDate: -1 });

    res.json(leaves);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ============================
   GET PENDING LEAVES (ADMIN)
============================ */
router.get("/pending", async (req, res) => {
  try {
    const leaves = await EmployeeLeave.find({ status: "pending" })
      .sort({ createdAt: -1 });

    res.json(leaves);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ============================
   UPDATE LEAVE STATUS
============================ */
router.put("/:id", async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;

    console.log("➡️ Update leave request received");
    console.log("Status to set:", status);

    const leave = await EmployeeLeave.findById(req.params.id);

    console.log("Fetched leave:", leave);

    if (!leave) {
      console.log("❌ Leave not found");
      return res.status(404).json({
        success: false,
        message: "Leave not found",
      });
    }

    // Prevent double processing
    if (leave.status !== "pending") {
      console.log("⚠️ Leave already processed:", leave.status);
      return res.status(400).json({
        success: false,
        message: "Leave already processed",
      });
    }

    // ✅ IF APPROVED → UPDATE BALANCE
    if (status === "approved") {
      const normalizedLeaveType = leave.leaveType.trim();

      console.log("🔍 Matching LeaveCounter with:");
      console.log("employeeId:", leave.employeeId);
      console.log("leaveType:", JSON.stringify(normalizedLeaveType));
      console.log("numberOfDays:", leave.numberOfDays);

      const counter = await LeaveCounter.findOne({
        employeeId: leave.employeeId,
        leaveType: normalizedLeaveType,
      });

      console.log("LeaveCounter found:", counter);

      if (!counter) {
        console.log("❌ LeaveCounter NOT FOUND");
        return res.status(404).json({
          success: false,
          message: "Leave balance not found",
        });
      }

      if (leave.numberOfDays > counter.balance) {
        console.log("❌ Insufficient balance");
        console.log("Balance:", counter.balance);
        return res.status(400).json({
          success: false,
          message: "Insufficient leave balance",
        });
      }

      counter.used += leave.numberOfDays;
      counter.balance -= leave.numberOfDays;

      console.log("✅ Updating LeaveCounter to:");
      console.log("used:", counter.used);
      console.log("balance:", counter.balance);

      await counter.save();
      console.log("✅ LeaveCounter saved successfully");
    }

    // Update leave status
    leave.status = status;
    leave.rejectionReason = status === "rejected" ? rejectionReason || "" : "";
    await leave.save();

    console.log("✅ Leave status updated successfully");

    res.json({
      success: true,
      message: `Leave ${status} successfully`,
      leave,
    });
  } catch (err) {
    console.error("🔥 Update leave status error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


module.exports = router;
