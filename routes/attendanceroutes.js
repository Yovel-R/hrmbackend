const express = require("express");
const Attendance = require("../models/attendancemodel");
const PDFDocument = require("pdfkit");
const moment = require("moment");
const Intern = require("../models/Intern");
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
    const { year, month, from, to } = req.query;  // Add these params

    let query = { internId };
    
    if (year && month) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0);
      query.date = { $gte: start, $lte: end };
    } else if (from && to) {
      query.date = { $gte: new Date(from), $lte: new Date(to) };
    }

    const attendance = await Attendance.find(query).sort({ date: -1 });
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

// 📌 Export Attendance Excel
router.get("/export/pdf/:internId", async (req, res) => {
  try {
    const { internId } = req.params;
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ message: "from & to dates required" });
    }

    const records = await Attendance.find({
      internId,
      date: {
        $gte: from,
        $lte: to,
      },
    }).sort({ date: 1 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=attendance_${internId}.pdf`
    );

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.pipe(res);

    /* ================= HEADER ================= */
    doc
      .fontSize(20)
      .fillColor("#00657F")
      .text("Attendance Report", { align: "center" });

    doc.moveDown(0.5);

    doc
      .fontSize(11)
      .fillColor("black")
      .text(`Intern ID : ${internId}`)
      .text(
        `Period : ${moment(from).format("DD MMM YYYY")} - ${moment(to).format(
          "DD MMM YYYY"
        )}`
      );

    doc.moveDown(1);

    /* ================= TABLE HEADER ================= */
    const tableTop = doc.y;
    const col = {
      date: 40,
      in: 160,
      out: 270,
      duration: 380,
      status: 470,
    };

    doc.font("Helvetica-Bold").fontSize(11);
    doc.text("Date", col.date, tableTop);
    doc.text("Punch In", col.in, tableTop);
    doc.text("Punch Out", col.out, tableTop);
    doc.text("Hours", col.duration, tableTop);
    doc.text("Status", col.status, tableTop);

    doc.moveDown(0.5);
    doc.font("Helvetica");

    /* ================= TABLE ROWS ================= */
    records.forEach((r) => {
      const y = doc.y;

      let status = "Absent";
      if (r.punchInTime && r.punchOutTime) {
        const mins =
          (new Date(r.punchOutTime) - new Date(r.punchInTime)) / 60000;
        status = mins < 360 ? "Short" : "Present";
      }

      doc.text(moment(r.date).format("DD MMM YYYY"), col.date, y);
      doc.text(
        r.punchInTime
          ? moment(r.punchInTime).format("hh:mm A")
          : "--",
        col.in,
        y
      );
      doc.text(
        r.punchOutTime
          ? moment(r.punchOutTime).format("hh:mm A")
          : "--",
        col.out,
        y
      );
      doc.text(r.duration || "--", col.duration, y);
      doc.text(status, col.status, y);

      doc.moveDown(0.4);

      // Auto page break
      if (doc.y > 750) {
        doc.addPage();
      }
    });

    /* ================= FOOTER ================= */
    doc.moveDown(1);
    doc
      .fontSize(9)
      .fillColor("gray")
      .text("Generated by SoftPeople HRM", { align: "center" });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "PDF export failed" });
  }
});

router.get("/export/pdf/all-interns", async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ message: "from & to dates required" });
    }

    // Convert to Date objects for Mongo query
    const fromDate = new Date(from);
    const toDate = new Date(to);

    // Fetch records within date range
    const records = await Attendance.find({
      date: { $gte: fromDate, $lte: toDate },
    }).sort({ internId: 1, date: 1 });

    // Set PDF headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=All_Interns_Attendance_${moment(fromDate).format("DDMMMyy")}_${moment(toDate).format("DDMMMyy")}.pdf`
    );

    // Create PDF
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.pipe(res);

    /* ========== HEADER ========== */
    doc.fontSize(20).fillColor("#00657F").text("Attendance Report", {
      align: "center",
    });

    doc.moveDown(0.5);

    doc
      .fontSize(11)
      .fillColor("black")
      .text(`Period: ${moment(fromDate).format("DD MMM YYYY")} - ${moment(toDate).format("DD MMM YYYY")}`, {
        align: "center",
      });

    doc.moveDown(1);

    /* ========== TABLE HEADER ========== */
    const tableTop = doc.y;
    const col = { internId: 40, date: 100, in: 200, out: 300, duration: 400, status: 470 };

    doc.font("Helvetica-Bold").fontSize(11);
    doc.text("Intern ID", col.internId, tableTop);
    doc.text("Date", col.date, tableTop);
    doc.text("Punch In", col.in, tableTop);
    doc.text("Punch Out", col.out, tableTop);
    doc.text("Hours", col.duration, tableTop);
    doc.text("Status", col.status, tableTop);

    doc.moveDown(0.5);
    doc.font("Helvetica");

    /* ========== TABLE ROWS ========== */
    records.forEach((r) => {
      const y = doc.y;

      const punchIn = r.punchInTime ? moment(r.punchInTime).format("hh:mm A") : "--";
      const punchOut = r.punchOutTime ? moment(r.punchOutTime).format("hh:mm A") : "--";

      let status = "Absent";
      if (r.punchInTime && r.punchOutTime) {
        const mins = (new Date(r.punchOutTime) - new Date(r.punchInTime)) / 60000;
        status = mins < 360 ? "Short" : "Present";
      }

      doc.text(r.internId, col.internId, y);
      doc.text(moment(r.date).format("DD MMM YYYY"), col.date, y);
      doc.text(punchIn, col.in, y);
      doc.text(punchOut, col.out, y);
      doc.text(r.duration || "--", col.duration, y);
      doc.text(status, col.status, y);

      doc.moveDown(0.4);

      // Auto page break
      if (doc.y > 750) doc.addPage();
    });

    /* ========== FOOTER ========== */
    doc.moveDown(1);
    doc.fontSize(9).fillColor("gray").text("Generated by SoftPeople HRM", {
      align: "center",
    });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "PDF export failed" });
  }
});


module.exports = router;
