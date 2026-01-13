const ExcelJS = require("exceljs");
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

router.get("/today/all", async (req, res) => {
  try {
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

    // Aggregation: join interns with today's attendance
    const attendanceData = await Intern.aggregate([
      {
        // Exclude interns with state 'initial' or 'drop'
        $match: { state: { $nin: ["initial", "drop"] } }
      },
      {
        // Lookup today's attendance
        $lookup: {
          from: "attendances", // your attendance collection name
          let: { internId: "$internid" },
          pipeline: [
            { 
              $match: { 
                $expr: { $eq: ["$internId", "$$internId"] },
                date: today,
                punchInTime: { $exists: true }
              } 
            }
          ],
          as: "attendance"
        }
      },
      {
        // Flatten attendance array
        $unwind: {
          path: "$attendance",
          preserveNullAndEmptyArrays: true // keep interns with no attendance
        }
      },
      {
        // Project fields for frontend
        $project: {
          internId: "$internid",
          name: { $concat: [
            { $toUpper: { $substrCP: ["$fullName", 0, 1] } }, // capitalize first letter
            { $substrCP: ["$fullName", 1, { $strLenCP: "$fullName" }] }
          ]},
          contact: 1, // 🔹 include contact number
          punchInTime: "$attendance.punchInTime",
          punchOutTime: "$attendance.punchOutTime",
          duration: { $ifNull: ["$attendance.duration", "--"] }
        }
      },
      {
        $sort: { punchInTime: 1 } 
      }
    ]);

    res.json({
      date: today,
      count: attendanceData.filter(a => a.punchInTime).length, // only count present
      attendance: attendanceData
    });

  } catch (err) {
    console.error("Error in /today/all:", err);
    res.status(500).json({ message: "Server error" });
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

router.get("/export/excel/all-interns", async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ message: "from & to dates required" });
    }

    // Parse dates and normalize to start/end of day
    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    // Fetch attendance records within date range
    const records = await Attendance.find({
      date: { $gte: fromDate, $lte: toDate },
    }).sort({ internId: 1, date: 1 }).lean();

    console.log("Attendance records count:", records.length);

    if (records.length === 0) {
      return res.status(404).json({ message: "No attendance records found for the selected period." });
    }

    // Get unique intern IDs
    const internIds = [...new Set(records.map(r => r.internId))];

    // Fetch intern details
    const interns = await Intern.find(
      { internid: { $in: internIds } },
      { internid: 1, fullName: 1 }
    ).lean();

    const internMap = {};
    interns.forEach(i => {
      internMap[i.internid] = i.fullName;
    });

    console.log("Intern mapping:", internMap);

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Attendance Report");

    // Header
    sheet.mergeCells("A1:G1");
    sheet.getCell("A1").value = "All Interns Attendance Report";
    sheet.getCell("A1").alignment = { horizontal: "center" };
    sheet.getCell("A1").font = { size: 16, bold: true, color: { argb: "FF00657F" } };

    sheet.mergeCells("A2:G2");
    sheet.getCell("A2").value = `Period: ${moment(fromDate).format("DD MMM YYYY")} - ${moment(toDate).format("DD MMM YYYY")}`;
    sheet.getCell("A2").alignment = { horizontal: "center" };
    sheet.getCell("A2").font = { size: 12 };

    sheet.addRow([]);

    // Table columns
    sheet.columns = [
      { header: "Intern Name", key: "name", width: 25 },
      { header: "Intern ID", key: "internId", width: 15 },
      { header: "Date", key: "date", width: 15 },
      { header: "Punch In", key: "punchIn", width: 12 },
      { header: "Punch Out", key: "punchOut", width: 12 },
      { header: "Hours", key: "duration", width: 10 },
      { header: "Status", key: "status", width: 12 },
    ];

    // Table rows
    records.forEach(r => {
      const punchIn = r.punchInTime ? moment(r.punchInTime).format("hh:mm A") : "--";
      const punchOut = r.punchOutTime ? moment(r.punchOutTime).format("hh:mm A") : "--";

      let status = "Absent";
      if (r.punchInTime && r.punchOutTime) {
        const mins = (new Date(r.punchOutTime) - new Date(r.punchInTime)) / 60000;
        status = mins < 360 ? "Short" : "Present";
      }

      sheet.addRow({
        name: internMap[r.internId] || "-",
        internId: r.internId,
        date: moment(r.date).format("DD MMM YYYY"),
        punchIn,
        punchOut,
        duration: r.duration || "--",
        status,
      });
    });

    // Footer
    sheet.addRow([]);
    const footerRow = sheet.addRow(["Generated by SoftPeople HRM"]);
    footerRow.getCell(1).alignment = { horizontal: "center" };
    footerRow.font = { color: { argb: "FF808080" }, italic: true };

    // Send Excel
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=All_Interns_Attendance_${moment(fromDate).format("DDMMMyy")}_${moment(toDate).format("DDMMMyy")}.xlsx`
    );
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error("Excel export failed:", err);
    res.status(500).json({ message: "Excel export failed" });
  }
});




module.exports = router;
