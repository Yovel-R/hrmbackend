const fs = require('fs');
const path = require('path');

const getSignature = () => {
  try {
    const logoPath = path.join(__dirname, 'assets/images/Softrate Logo.jpg');
    const logoBase64 = fs.readFileSync(logoPath, 'base64');
    const logoDataUrl = `data:image/jpeg;base64,${logoBase64}`;

    return `
      <div style="margin-top: 35px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 14px; color: #333; line-height: 1.6;">
        <p>Do follow us on <a href="https://www.instagram.com/softrate" style="color: #007bb6; text-decoration: underline;">Instagram</a> and <a href="https://linkedin.com/company/softrate" style="color: #007bb6; text-decoration: underline;">LinkedIn</a> to stay updated on future opportunities!</p>
        
        <p style="margin-bottom: 24px;">Wishing you the best on your journey ahead!</p>
        
        <p style="margin-bottom: 0px;">Cheers,</p>
        <p style="margin-bottom: 24px; font-weight: 500;">Early Careers Team</p>
        
        <img src="${logoDataUrl}" alt="Softrate Logo" width="160" style="display: block;">
      </div>
    `;
  } catch (error) {
    console.error("Signature Error:", error);
    return "<p>Regards,<br>HR Team<br>Softrate Global</p>";
  }
};

module.exports = { getSignature };
