const express = require("express");
const Employee = require("../models/EmployeeModel");
const sendEmail = require("../utilities/sendEmail");
const multer = require("multer");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/* ============================
   ADD / ONBOARD (INITIAL)
============================ */
const RECEIVER_EMAIL = process.env.RECIVER_EMAIL_USER;

router.post(
  "/add",
  upload.any(), // parse multipart/form-data
  async (req, res) => {
    try {
      console.log("BODY:", req.body);   // employee fields
      console.log("FILES:", req.files); // uploaded files

      // Optional: save employee info
      const employee = new Employee({
        ...req.body,
        status: "initial", // you can skip if you don't want to store
      });

      await employee.save(); // optional

      // Map uploaded files to attachments
      const attachments = req.files?.map(file => ({
        filename: file.originalname,
        content: file.buffer,
      }));

      // Send email to receiver
      await sendEmail({
        to: RECEIVER_EMAIL,
        subject: "New Employee Submission",
        html: `
          <h3>New employee submission received</h3>
          <p>Name: ${employee.fullName}</p>
          <p>Email: ${employee.email}</p>
          <p>Phone: ${employee.phone}</p>
        `,
        attachments,
      });

      res.status(200).json({ message: "Employee submitted & email sent" });
    } catch (err) {
      console.error("Employee Add Error:", err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

module.exports = router;
/* ============================
   GET INITIAL EMPLOYEES
============================ */
router.get("/all/initial", async (req, res) => {
  const employees = await Employee.find({ status: "initial" });
  res.json(employees);
});

/* ============================
   GET ACTIVE EMPLOYEES
============================ */
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
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (range === "sixMonths") {
      start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    if (start && end) {
      query.createdAt = { $gte: start, $lte: end };
    }

    const employees = await Employee.find(query).sort({ createdAt: -1 });
    res.json(employees);
  } catch (err) {
    console.error("Fetch Active Employees Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ============================
   ACCEPT EMPLOYEE (PDF + MAIL)
============================ */
router.put(
  "/accept/:id",
  upload.fields([
    { name: "offerLetter" },
    { name: "appointmentLetter" },
    { name: "nda" },
  ]),
  async (req, res) => {
    try {
      const { onboardingDate } = req.body;

      const employee = await Employee.findById(req.params.id);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      const offer = req.files?.offerLetter?.[0]?.buffer;
      const appointment = req.files?.appointmentLetter?.[0]?.buffer;
      const nda = req.files?.nda?.[0]?.buffer;

      if (!offer || !appointment || !nda) {
        return res.status(400).json({ message: "All PDFs required" });
      }

      const newEmployeeId = await generateEmployeeId();

      employee.EmployeeId = newEmployeeId;
      employee.status = "approved";
      employee.onboardingDate = onboardingDate;

      await employee.save();

      await sendEmail({
        to: employee.email,
        subject: "Your Employee ID is Ready",
        html: `
          <h2>Hi ${employee.fullName},</h2>
          <p>Your profile has been <b>approved</b> 🎉</p>
          <p><b>Employee ID:</b> ${newEmployeeId}</p>
          <p><b>Onboarding Date:</b> ${onboardingDate}</p>
          <br><p>Regards,<br>HR Team</p>
        `,
        attachments: [
          { filename: `${newEmployeeId}-Offer-Letter.pdf`, content: offer },
          { filename: `${newEmployeeId}-Appointment.pdf`, content: appointment },
          { filename: `${newEmployeeId}-NDA.pdf`, content: nda },
        ],
      });

      res.json({ message: "Employee approved & email sent", employee });
    } catch (err) {
      console.error("Employee Accept Error:", err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

/* ============================
   REJECT EMPLOYEE
============================ */
router.put("/reject/:id", async (req, res) => {
  const employee = await Employee.findByIdAndUpdate(
    req.params.id,
    { status: "rejected" },
    { new: true }
  );

  if (!employee) {
    return res.status(404).json({ message: "Employee not found" });
  }

  res.json({ message: "Employee rejected", employee });
});

/* ============================
   LOGIN (SAME AS INTERN)
============================ */
router.post("/login", async (req, res) => {
  const { employeeId, password } = req.body;

  const employee = await Employee.findOne({ EmployeeId: employeeId });
  if (!employee) {
    return res.status(404).json({ message: "Employee not found" });
  }

  if (!employee.password) {
    employee.password = password;
    await employee.save();
    return res.json({
      message: "Password set",
      firstTime: true,
      employee,
    });
  }

  if (employee.password !== password) {
    return res.status(401).json({ message: "Wrong password" });
  }

  res.json({ message: "Login successful", firstTime: false, employee });
});

/* ============================
   GET EMPLOYEE BY ID
============================ */
router.get("/get/:employeeId", async (req, res) => {
  const employee = await Employee.findOne({
    EmployeeId: req.params.employeeId,
  });

  if (!employee) {
    return res.status(404).json({ message: "Employee not found" });
  }

  res.json({ employee });
});


/* ============================
   EMPLOYEE ID GENERATOR
============================ */
async function generateEmployeeId() {
  const year = new Date().getFullYear() % 100; // 25
  const prefix = `STP${year}`;

  const last = await Employee.findOne({
    EmployeeId: { $regex: `^${prefix}` },
  }).sort({ EmployeeId: -1 });

  let next = 1;
  if (last?.EmployeeId) {
    next = parseInt(last.EmployeeId.slice(prefix.length)) + 1;
  }

  return `${prefix}${String(next).padStart(3, "0")}`;
}

module.exports = router;
