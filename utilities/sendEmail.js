const { Resend } = require("resend");
const fs = require("fs");
const path = require("path");
const { getSignature } = require("./emailSignature");

// Load logo once at module start
const logoPath = path.join(__dirname, 'assets/images/Softrate Logo.jpg');
const logoBuffer = fs.readFileSync(logoPath);
const LOGO_CID = 'softrate_logo';

// Inline attachment object — reused on every email
const logoInlineAttachment = {
  filename: 'softrate-logo.jpg',
  content: logoBuffer,
  content_type: 'image/jpeg',
  content_id: LOGO_CID,
  disposition: 'inline',
};

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

    // Always include the logo as an inline attachment so cid:softrate_logo resolves
    emailConfig.attachments = [logoInlineAttachment, ...attachments];

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

module.exports = { sendEmail, LOGO_CID };