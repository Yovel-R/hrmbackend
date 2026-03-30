const fs = require('fs');
const path = require('path');

const getSignature = () => {
  try {
    const logoPath = path.join(__dirname, '../public/assets/images/logo.png');
    // Using base64 for embedding directly. In production, a hosted URL is better.
    const logoBase64 = fs.readFileSync(logoPath, 'base64');
    const logoDataUrl = `data:image/png;base64,${logoBase64}`;

    return `
      <div style="margin-top: 30px; font-family: Arial, sans-serif; color: #333;">
        <table border="0" cellpadding="0" cellspacing="0" style="min-width: 350px;">
          <tr>
            <td style="vertical-align: middle; padding-right: 20px; border-right: 2px solid #e0e0e0;">
              <img src="${logoDataUrl}" alt="Softrate Logo" width="130" style="display: block;">
            </td>
            <td style="vertical-align: middle; padding-left: 20px; line-height: 1.4;">
              <div style="font-weight: bold; font-size: 20px; color: #444; margin-bottom: 2px;">Shubhadeepa</div>
              <div style="font-size: 16px; color: #333; margin-bottom: 4px;">Human Resources Manager</div>
              <div style="font-size: 16px; color: #007bb6; font-weight: bold; margin-bottom: 6px;">Softrate Tech Park, Chennai</div>
              <div style="font-size: 15px; color: #444;"><strong>Mobile:</strong> +91 8148633580</div>
              <div style="font-size: 15px; color: #444;"><strong>eMail :</strong> <a href="mailto:hr@softrateglobal.com" style="color: #007bb6; text-decoration: underline; font-weight: bold; background-color: #fff9c4;">hr@softrateglobal.com</a></div>
            </td>
          </tr>
        </table>
        <div style="font-size: 10px; color: #888; margin-top: 10px;">A Multi-faced Technology Company</div>
      </div>
    `;
  } catch (error) {
    console.error("Signature Error:", error);
    return "<p>Regards,<br>HR Team<br>Softrate Global</p>";
  }
};

module.exports = { getSignature };
