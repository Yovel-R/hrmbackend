const fs = require('fs');
const path = require('path');

const getSignature = () => {
  try {
    const logoPath = path.join(__dirname, 'assets/images/Softrate Logo.jpg');
    const logoBase64 = fs.readFileSync(logoPath, 'base64');
    const logoDataUrl = `data:image/jpeg;base64,${logoBase64}`;

    return `
      <div style="margin-top: 30px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #333; line-height: 1.5;">
        <p style="margin: 0;">Do follow us on <a href="https://www.instagram.com/softrate" style="color: #007bb6; text-decoration: underline;">Instagram</a> and <a href="https://linkedin.com/company/softrate" style="color: #007bb6; text-decoration: underline;">LinkedIn</a> to stay updated on future opportunities!</p>
        
        <p style="margin: 12px 0 24px 0;">Wishing you the best on your journey ahead!</p>
        
        <p style="margin: 0;">Cheers,</p>
        <p style="margin: 0 0 24px 0; font-weight: 500;">Early Careers Team</p>
        
        <img src="cid:company-logo" alt="Softrate Logo" width="160" style="display: block; border: 0;">
      </div>
    `;
  } catch (error) {
    console.error("Signature Error:", error);
    return "<p>Regards,<br>HR Team<br>Softrate Global</p>";
  }
};

module.exports = { getSignature };
