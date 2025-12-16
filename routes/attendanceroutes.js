const express = require("express");
const Attendance = require("../models/attendancemodel");

const router = express.Router();


// 📌 Punch In
router.post("/punch-in", async (req, res) => {
  try {
    const { internId, location } = req.body;

    const today = new Date().toISOString().slice(0, 10); // yyyy-mm-dd

    // Check if already punched in
    let record = await Attendance.findOne({ internId, date: today });

    if (record && record.punchInTime) {
      return res.status(400).json({ message: "Already punched in today." });
    }

    if (!record) {
      record = new Attendance({
        internId,
        date: today,
      });
    }

    record.punchInTime = new Date();
    record.punchInLocation = location;

    await record.save();

    return res.json({ message: "Punch In successful", record });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Server error" });
  }
});


// 📌 Punch Out
router.post("/punch-out", async (req, res) => {
  try {
    const { internId, location } = req.body;

    const today = new Date().toISOString().slice(0, 10);

    let record = await Attendance.findOne({ internId, date: today });

    if (!record || !record.punchInTime) {
      return res.status(400).json({ message: "Punch-in not found for today" });
    }

    if (record.punchOutTime) {
      return res.status(400).json({ message: "Already punched out" });
    }

    record.punchOutTime = new Date();
    record.punchOutLocation = location;

    // Calculate duration (HH:mm)
    const diffMs = record.punchOutTime - record.punchInTime;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    record.duration = `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;

    await record.save();

    return res.json({ message: "Punch Out successful", record });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Server error" });
  }
});
// router.post("/punch-in", async (req, res) => {
//   try {
//     const { internId, location } = req.body;

//     const today = new Date().toISOString().slice(0, 10); // yyyy-mm-dd

//     // Find record or create new
//     let record = await Attendance.findOne({ internId, date: today });

//     if (!record) {
//       record = new Attendance({
//         internId,
//         date: today,
//       });
//     }

//     record.punchInTime = new Date();
//     record.punchInLocation = location;

//     await record.save();

//     return res.json({ message: "Punch In successful", record });
//   } catch (err) {
//     console.log(err);
//     return res.status(500).json({ message: "Server error" });
//   }
// });


// router.post("/punch-out", async (req, res) => {
//   try {
//     const { internId, location } = req.body;

//     const today = new Date().toISOString().slice(0, 10);

//     let record = await Attendance.findOne({ internId, date: today });

//     if (!record || !record.punchInTime) {
//       return res.status(400).json({ message: "Punch-in not found for today" });
//     }

//     // ❌ Removed punch-out restriction for testing
//     // if (record.punchOutTime) {
//     //   return res.status(400).json({ message: "Already punched out" });
//     // }

//     record.punchOutTime = new Date();
//     record.punchOutLocation = location;

//     // Calculate duration (HH:mm)
//     const diffMs = record.punchOutTime - record.punchInTime;
//     const hours = Math.floor(diffMs / (1000 * 60 * 60));
//     const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

//     record.duration = `${hours.toString().padStart(2, "0")}:${minutes
//       .toString()
//       .padStart(2, "0")}`;

//     await record.save();

//     return res.json({ message: "Punch Out successful", record });
//   } catch (err) {
//     console.log(err);
//     return res.status(500).json({ message: "Server error" });
//   }
// });


// 📌 Get Attendance by Intern ID
router.get("/intern/:id", async (req, res) => {
  try {
    const internId = req.params.id;

    const attendance = await Attendance.find({ internId }).sort({
      date: -1,
    });

    return res.json({ attendance });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Server error" });
  }
});
// 📌 Get Today's Attendance (FIXED)
router.get("/today/:internId", async (req, res) => {
  const { internId } = req.params;
  const today = new Date().toISOString().slice(0, 10); // UTC date
  const record = await Attendance.findOne({ internId, date: today });
  console.log("Today attendance record:", record);
  res.json({ record });
});


module.exports = router;
