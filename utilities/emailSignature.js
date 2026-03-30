const fs = require("fs");
const path = require("path");

let cachedDataUri = null;

const getLogoDataUri = () => {
  if (!cachedDataUri) {
    const imgPath = path.join(__dirname, "../assets/images/Softrate Logo.jpg");
    if (fs.existsSync(imgPath)) {
      const base64 = fs.readFileSync(imgPath).toString("base64");
      cachedDataUri = `data:image/jpeg;base64,${base64}`;
    }
  }
  return cachedDataUri;
};

const getSignature = () => {
  try {
    const logoSrc = getLogoDataUri();
    const logoHtml = logoSrc
      ? `<a href="https://www.softrateglobal.com/" style="text-decoration: none; display: inline-block;">
          <img src="${logoSrc}" alt="Softrate Logo" width="145" style="display: block; border: 0;">
        </a>`
      : `<p style="margin: 0; font-weight: 600; color: #333;">Softrate Global</p>`;

    return `
      <div style="margin-top: 30px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #333; line-height: 1.5;">
        <p style="margin: 0;">Do follow us on <a href="https://www.instagram.com/softrate" style="color: #007bb6; text-decoration: underline;">Instagram</a> and <a href="https://linkedin.com/company/softrate" style="color: #007bb6; text-decoration: underline;">LinkedIn</a> to stay updated on future opportunities!</p>
        <p style="margin: 12px 0 24px 0;">Wishing you the best on your journey ahead!</p>
        <p style="margin: 0;">Cheers,</p>
        <p style="margin: 0 0 15px 0; font-weight: 500;">Early Careers Team</p>
        ${logoHtml}
      </div>
    `;
  } catch (error) {
    console.error("Signature Error:", error);
    return "<p>Regards,<br>Early Careers Team<br>Softrate Global</p>";
  }
};

module.exports = { getSignature };