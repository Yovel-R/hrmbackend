const { Resend } = require("resend");

// In sendEmail.js - add attachments support
const sendEmail = async ({ to, subject, html, text, attachments = [] }) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    // Note: If you have a verified domain on Resend, make sure FROM_EMAIL points to an address at that domain.
    // If testing without a domain, you can temporarily change this to "onboarding@resend.dev" per Resend limits.
    const fromEmail = process.env.FROM_EMAIL || "onboarding@resend.dev"; 
    
    const emailConfig = {
      from: `"People Soft" <${fromEmail}>`,
      to,
      subject,
      replyTo: process.env.RECIVER_EMAIL_USER,
    };

    if (html) emailConfig.html = html;
    
    // Ensure we have a plain text version for better deliverability
    if (text) {
      emailConfig.text = text;
    } else if (html) {
      // Basic HTML to Text fallback (remove tags)
      emailConfig.text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    
    if (attachments.length > 0) {
      emailConfig.attachments = attachments;
    }

    const { data, error } = await resend.emails.send(emailConfig);

    if (error) {
       console.error("✖ Resend API returned error:", error);
       throw new Error(error.message);
    }

    console.log("✔ Email Sent Successfully (via Resend)", data);
  } catch (error) {
    console.error("✖ Email Error:", error.message);
    throw error; // Re-throw for route error handling
  }
};

module.exports = sendEmail;
