const express = require("express");
const multer = require("multer");
const nodemailer = require("nodemailer");
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() }); // store files in RAM

// SEND EMAIL API
router.post(
  "/send-documents",
  upload.array("files"), // receives: files[]
  async (req, res) => {
    try {
      const { internName, internId } = req.body;

      // Gmail Transporter
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.SENDER_EMAIL_USER,
          pass: process.env.SENDER_EMAIL_PASS,
        },
      });

      // Prepare attachments
      const attachments = req.files.map((file) => ({
        filename: file.originalname,
        content: file.buffer,
        contentType: "application/pdf",
      }));

      // Email options
      const mailOptions = {
        from: process.env.SENDER_EMAIL_USER,
        to: process.env.RECIVER_EMAIL_USER,
        subject: `Intern Documents - ${internName} (${internId})`,
        text: `Hi Admin,\n\nPlease find attached all internship documents for ${internName}.\n\nThanks.`,
        attachments,
      };

      await transporter.sendMail(mailOptions);

      res.status(200).json({ message: "Email sent successfully!" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Email sending failed." });
    }
  }
);

module.exports = router;
