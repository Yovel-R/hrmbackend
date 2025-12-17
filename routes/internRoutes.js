const express = require("express");
const Intern = require("../models/Intern");
const Resignation = require("../models/resignation.model.js");  
const bcrypt = require("bcryptjs");
const router = express.Router();
const multer = require('multer');
const upload = multer();



router.post("/add", async (req, res) => {
  try {
    const {
      fullName,
      college,
      year,
      department,
      role,
      email,
      contact,
      emergencyContact,
      onboardingDate,
      endDate,
      linkedin
    } = req.body;

    const intern = new Intern({
      fullName,
      college,
      year,
      department,
      role,
      email,
      contact,
      emergencyContact,
      onboardingDate,
      endDate,
      linkedin,

      // backend-generated field
      status: "initial",
    });

    await intern.save();

    res.status(200).json({
      message: "Intern stored successfully",
      intern,
    });

  } catch (err) {
    console.error("Save Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// GET intern by internid
router.get("/all/initial", async (req, res) => {
  try {
    const interns = await Intern.find({ status: "initial" });
    res.json(interns);
  } catch (error) {
    console.error("Fetch Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});



// Get all approved or ongoing interns
// Get all approved or ongoing interns with filters
router.get("/all/active", async (req, res) => {
  try {
    const { range = "thisMonth", status = "all" } = req.query;

    const statusFilter =
      status === "all" ? ["approved", "ongoing"] : [status];

    const query = { status: { $in: statusFilter } };

    const now = new Date();
    let start, end;

    if (range === "thisMonth") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (range === "sixMonths") {
      start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    if (start && end) {
      query.createdAt = { $gte: start, $lte: end }; // <‑ use createdAt
    }

    const interns = await Intern.find(query).sort({ createdAt: -1 });
    res.json(interns);
  } catch (err) {
    console.error("Fetch Active Interns Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});




// router.put("/accept/:id", async (req, res) => {
//   try {
//     const intern = await Intern.findById(req.params.id);
//     if (!intern) return res.status(404).json({ message: "Intern not found" });

//     const newId = await generateInternId();

//     intern.internid = newId;
//     intern.status = "approved";

//     await intern.save();

//     res.json({ message: "Intern approved", intern });
//   } catch (err) {
//     console.error("Approve Error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// });
const sendEmail = require("../utilities/sendEmail");

router.put("/accept/:id", upload.fields([{ name: 'pdf' }, { name: 'pdf_1' }, { name: 'pdf_2' }]), async (req, res) => {
  try {
  const { onboardingDate, endDate } = req.body;
  const intern = await Intern.findById(req.params.id);
  if (!intern) return res.status(404).json({ message: "Intern not found" });

  // Correct multer file access
  const pdfBuffer = req.files['pdf']?.[0]?.buffer;
  const pdf1Buffer = req.files['pdf_1']?.[0]?.buffer;
  const pdf2Buffer = req.files['pdf_2']?.[0]?.buffer;

  if (!pdfBuffer || !pdf1Buffer) {
    return res.status(400).json({ message: "PDF files missing" });
  }

  const newId = await generateInternId();
  intern.internid = newId;
  intern.status = "approved";

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
  };

  intern.onboardingDate = formatDate(onboardingDate);
  intern.endDate = formatDate(endDate);
  await intern.save();

  // Fix email attachments - use buffers directly
  await sendEmail({
    to: intern.email,
    subject: "Your Intern ID is Ready",
    html: `
      <h2>Hi ${intern.fullName},</h2>
      <p>Your profile has been <b>approved</b> 🎉</p>
      <p>Your new <b>Intern ID</b> is: <b>${newId}</b></p>
      <p>Onboarding Date: <b>${intern.onboardingDate}</b></p>
      <p>End Date: <b>${intern.endDate}</b></p>
      <p>Please save this ID — you'll use it for login.</p>
      <br><p>Regards,<br>HR Team</p>
    `,
    attachments: [
      { filename: `${newId} -Softrate Internship Offer Letter.pdf`, content: pdfBuffer },
      { filename: `${newId} -Softrate Internship Annexure.pdf`, content: pdf1Buffer },
      { filename: `${newId} - Softrate Internship NDA.pdf`, content: pdf2Buffer }
    ]
  });

  res.json({ message: "Intern approved & email sent", intern });
} catch (err) {
  console.error("Approve Error:", err);
  res.status(500).json({ message: "Server error", error: err.message });
}
});


router.put("/reject/:id", async (req, res) => {
  try {
    const intern = await Intern.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true }
    );

    if (!intern) return res.status(404).json({ message: "Intern not found" });

    res.json({ message: "Intern rejected", intern });
  } catch (err) {
    console.error("Reject Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});



// id generator

async function generateInternId() {
  const yearShort = new Date().getFullYear() % 100; // 25 as number
  const year = yearShort.toString();                // "25" as string


  const lastIntern = await Intern.findOne({
    internid: { $regex: "^" + year }
  }).sort({ internid: -1 });

  let next = 1;

  if (lastIntern) {
    const lastNumber = parseInt(lastIntern.internid.slice(4)); 
    next = lastNumber + 1;
  }

  return `${year}${String(next).padStart(3, "0")}`;
}


router.post("/login", async (req, res) => {
  const { internid, password } = req.body;

  const intern = await Intern.findOne({ internid });

  if (!intern) {
    return res.status(404).json({ message: "Intern not found" });
  }

  // First-time login
  if (intern.password === "") {
    intern.password = password; // No encryption
    await intern.save();
    return res.json({
      message: "Password set",
      firstTime: true,
      intern,
    });
  }

  // Normal login
  if (intern.password !== password) {
    return res.status(401).json({ message: "Wrong password" });
  }

  res.json({ message: "Login successful", firstTime: false, intern });
});



// Get intern by internid
router.get("/get/:internid", async (req, res) => {
  try {
    const internid = req.params.internid;
    const intern = await Intern.findOne({ internid });

    if (!intern) {
      return res.status(404).json({ message: "Intern not found" });
    }

    res.json({ intern });
  } catch (err) {
    console.error("Fetch Intern Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// changing approved to ongoing

// in intern.routes.js
router.get("/pastout", async (req, res) => {
  try {
    const year = parseInt(req.query.year);
    const month = parseInt(req.query.month); // 0 = all

    // 1️⃣ Fetch accepted resignations
    const resignations = await Resignation.find({ status: "accepted" });

    // 2️⃣ Filter by lastWorkingDay
    const filtered = resignations.filter((r) => {
      if (!r.lastWorkingDay) return false;

      // "16 Dec 2025"
      const date = new Date(r.lastWorkingDay);
      if (isNaN(date)) return false;

      if (year && date.getFullYear() !== year) return false;
      if (month && month !== 0 && date.getMonth() + 1 !== month) return false;

      return true;
    });

    // 3️⃣ Get intern details
    const internIds = filtered.map((r) => r.internId);

    const interns = await Intern.find({
      internid: { $in: internIds },
    });

    // 4️⃣ Merge resignation + intern data
    const result = filtered.map((r) => {
      const intern = interns.find((i) => i.internid === r.internId);

      return {
        internId: r.internId,
        fullName: intern?.fullName ?? r.internName,
        department: intern?.department ?? "",
        endDate: r.lastWorkingDay,
        status: "drop",
        exitType: r.exitType,
        exitReason: r.exitReason,
      };
    });

    res.status(200).json(result);
  } catch (err) {
    console.error("Past-out error:", err);
    res.status(500).json({ message: "Server error" });
  }
});




module.exports = router;