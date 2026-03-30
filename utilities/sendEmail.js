const { Resend } = require("resend");
const fs = require("fs");
const path = require("path");

const sendEmail = async ({ to, subject, html, text, attachments = [] }) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.FROM_EMAIL || "onboarding@resend.dev";

    const emailConfig = {
      from: `"PeopleSoft" <${fromEmail}>`,
      to,
      subject,
      replyTo: process.env.RECIVER_EMAIL_USER,
    };

    if (html) emailConfig.html = html;

    if (text) {
      emailConfig.text = text;
    } else if (html) {
      emailConfig.text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // Inline logo attachment for email signature
    const logoPath = path.join(__dirname, 'assets/images/Softrate Logo.jpg');
    const logoBase64 = fs.readFileSync(logoPath).toString('base64');

    emailConfig.attachments = [
      {
        filename: 'Softrate Logo.jpg',
        content: logoBase64,          // base64 string
        content_type: 'image/jpeg',   // Resend uses content_type
        inline: true,                 // makes it inline (cid usable)
        content_id: 'company-logo',   // matches cid:company-logo in signature
      },
      ...attachments,                 // keep any other attachments passed in
    ];

    const { data, error } = await resend.emails.send(emailConfig);

    if (error) {
      console.error("✖ Resend API returned error:", error);
      throw new Error(error.message);
    }

    console.log("✔ Email Sent Successfully (via Resend)", data);
  } catch (error) {
    console.error("✖ Email Error:", error.message);
    throw error;
  }
};

module.exports = sendEmail;