const express = require("express");
const Attendance = require("../models/Employeeattendancemodel");
const PDFDocument = require("pdfkit");
const moment = require("moment");
const Employee = require("../models/EmployeeModel");

const router = express.Router();

/* ======================
   📌 Punch In
====================== */
router.post("/punch-in", async (req, res) => {
  try {
    const { employeeId, location } = req.body;

    const today = new Date().toISOString().slice(0, 10);

    let record = await Attendance.findOne({ employeeId, date: today });

    if (record && record.punchInTime) {
      return res.status(400).json({ message: "Already punched in today." });
    }

    if (!record) {
      record = new Attendance({
        employeeId,
        date: today,
      });
    }

    record.punchInTime = new Date();
    record.punchInLocation = location;

    await record.save();

    res.json({ message: "Punch In successful", record });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ======================
   📌 Punch Out
====================== */
router.post("/punch-out", async (req, res) => {
  try {
    const { employeeId, location } = req.body;

    const today = new Date().toISOString().slice(0, 10);

    let record = await Attendance.findOne({ employeeId, date: today });

    if (!record || !record.punchInTime) {
      return res.status(400).json({ message: "Punch-in not found for today" });
    }

    if (record.punchOutTime) {
      return res.status(400).json({ message: "Already punched out" });
    }

    record.punchOutTime = new Date();
    record.punchOutLocation = location;

    const diffMs = record.punchOutTime - record.punchInTime;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    record.duration = `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;

    await record.save();

    res.json({ message: "Punch Out successful", record });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ======================
   📌 Get Attendance by Employee ID
====================== */
router.get("/employee/:id", async (req, res) => {
  try {
    const employeeId = req.params.id;

    const attendance = await Attendance.find({ employeeId }).sort({
      date: -1,
    });

    res.json({ attendance });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ======================
   📌 Get Today's Attendance
====================== */
router.get("/today/:employeeId", async (req, res) => {
  const { employeeId } = req.params;
  const today = new Date().toISOString().slice(0, 10);

  const record = await Attendance.findOne({ employeeId, date: today });

  console.log("Today employee attendance:", record);
  res.json({ record });
});



/* ======================
   📌 Export Attendance PDF
====================== */
router.get("/export/pdf/employee/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ message: "from & to dates required" });
    }

    const records = await Attendance.find({
      employeeId,
      date: {
        $gte: from,
        $lte: to,
      },
    }).sort({ date: 1 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=attendance_${employeeId}.pdf`
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
      .text(`Employee ID : ${employeeId}`)
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

    /* ================= EMPTY STATE ================= */
    if (records.length === 0) {
      doc
        .moveDown(2)
        .fontSize(12)
        .fillColor("gray")
        .text("No attendance records found for selected date range.", {
          align: "center",
        });
    }

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



router.get("/export/pdf/all", async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ message: "from & to dates required" });
    }

    /* ================= FETCH DATA ================= */

    const attendances = await Attendance.find({
      date: { $gte: from, $lte: to },
    })
      .sort({ employeeId: 1, date: 1 })
      .lean();

    const employeeIds = [
      ...new Set(attendances.map((a) => a.employeeId)),
    ];

    const employees = await Employee.find(
      { employeeId: { $in: employeeIds } },
      { employeeId: 1, name: 1 }
    ).lean();

    const employeeMap = {};
    employees.forEach((e) => {
      employeeMap[e.employeeId] = e.name;
    });

    /* ================= PDF SETUP ================= */

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=attendance_${moment(from).format(
        "DDMMYY"
      )}_${moment(to).format("DDMMYY")}.pdf`
    );

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    doc.pipe(res);

    const PAGE_BOTTOM = 760;
    const ROW_HEIGHT = 18;
    const LEFT = 40;

    const col = {
      date: 40,
      in: 150,
      out: 260,
      hrs: 360,
      status: 450,
    };

    /* ================= REPORT HEADER ================= */

    doc
      .fontSize(18)
      .fillColor("#00657F")
      .text("All Employees Attendance Report", {
        align: "center",
        width: 520,
      });

    doc
      .moveDown(0.4)
      .fontSize(10)
      .fillColor("black")
      .text(
        `Period : ${moment(from).format("DD MMM YYYY")} - ${moment(to).format(
          "DD MMM YYYY"
        )}`,
        { align: "center", width: 520 }
      );

    doc.moveDown(1);

    /* ================= HELPERS ================= */

    const ensurePage = (space = 80) => {
      if (doc.y + space > PAGE_BOTTOM) {
        doc.addPage();
      }
    };

    const drawTableHeader = () => {
      const y = doc.y;

      doc.font("Helvetica-Bold").fontSize(10);
      doc.text("Date", col.date, y);
      doc.text("Punch In", col.in, y);
      doc.text("Punch Out", col.out, y);
      doc.text("Hours", col.hrs, y);
      doc.text("Status", col.status, y);

      doc
        .moveTo(LEFT, y + 14)
        .lineTo(555, y + 14)
        .stroke();

      doc.font("Helvetica");
      doc.y = y + 20;
    };

    /* ================= DATA LOOP ================= */

    let currentEmployee = null;

    for (const r of attendances) {
      if (currentEmployee !== r.employeeId) {
        currentEmployee = r.employeeId;

        ensurePage(120);

        doc
          .fontSize(12)
          .fillColor("#00657F")
          .text(
            `Employee Name : ${employeeMap[r.employeeId] || "-"}`,
            LEFT,
            doc.y,
            { align: "left", width: 500 }
          );

        doc
          .fontSize(11)
          .fillColor("black")
          .text(`Employee ID : ${r.employeeId}`, LEFT, doc.y, {
            align: "left",
            width: 500,
          });

        doc.moveDown(0.6);
        drawTableHeader();
      }

      ensurePage(ROW_HEIGHT);

      const y = doc.y;

      let status = "Absent";
      if (r.punchInTime && r.punchOutTime) {
        const mins =
          (new Date(r.punchOutTime) - new Date(r.punchInTime)) / 60000;
        status = mins < 360 ? "Short" : "Present";
      }

      doc.fontSize(10);
      doc.text(moment(r.date).format("DD MMM YYYY"), col.date, y);
      doc.text(
        r.punchInTime ? moment(r.punchInTime).format("hh:mm A") : "--",
        col.in,
        y
      );
      doc.text(
        r.punchOutTime ? moment(r.punchOutTime).format("hh:mm A") : "--",
        col.out,
        y
      );
      doc.text(r.duration || "--", col.hrs, y);
      doc.text(status, col.status, y);

      doc.y = y + ROW_HEIGHT;
    }

    if (attendances.length === 0) {
      doc
        .moveDown(3)
        .fontSize(12)
        .fillColor("gray")
        .text("No attendance records found.", { align: "center" });
    }

    /* ================= FOOTER ================= */

    doc
      .moveDown(2)
      .fontSize(9)
      .fillColor("gray")
      .text("Generated by SoftPeople HRM", { align: "center", width: 520 });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "PDF export failed" });
  }
});



module.exports = router;
