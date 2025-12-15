const nodemailer = require("nodemailer");

// In sendEmail.js - add attachments support
const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"HRM Team" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      attachments // Now supports attachments array
    });

    console.log("✔ Email Sent Successfully");
  } catch (error) {
    console.error("✖ Email Error:", error.message);
    throw error; // Re-throw for route error handling
  }
};


module.exports = sendEmail;
