const axios = require('axios');
const fs = require('fs');
const path = require('path');

let isBrevoConfigured = false;
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'billing@anraone.com';
const SENDER_NAME = process.env.SENDER_NAME || 'anraone Billing';

if (BREVO_API_KEY) {
  isBrevoConfigured = true;
  console.log("Brevo Transactional Email service configured successfully!");
} else {
  console.log("\n=====================================================================");
  console.warn("⚠️  BREVO EMAIL CONFIGURATION NOTICE:");
  console.warn("BREVO_API_KEY is missing from your .env file.");
  console.warn("The email service will run in MOCK MODE, printing outgoing emails to the console.");
  console.warn("This allows full application testing without live credentials!");
  console.warn("=====================================================================\n");
}

/**
 * Sends an email with an optional attachment
 * @param {string} recipientEmail - Recipient's email address
 * @param {string} recipientName - Recipient's name
 * @param {string} subject - Email subject line
 * @param {string} htmlContent - HTML content of the email
 * @param {string} attachmentPath - Local file path of the PDF attachment (optional)
 * @returns {Promise<boolean>} - True if sent successfully (or in mock mode)
 */
const sendInvoiceEmail = async (recipientEmail, recipientName, subject, htmlContent, attachmentPath = null) => {
  let attachmentData = null;

  if (attachmentPath && fs.existsSync(attachmentPath)) {
    const fileBuffer = fs.readFileSync(attachmentPath);
    attachmentData = {
      content: fileBuffer.toString('base64'),
      name: path.basename(attachmentPath)
    };
  }

  if (!isBrevoConfigured) {
    // Elegant console simulation for email delivery
    console.log("\n=====================================================================");
    console.log("✉️  [MOCK EMAIL DELIVERED]");
    console.log(`From:     "${SENDER_NAME}" <${SENDER_EMAIL}>`);
    console.log(`To:       "${recipientName}" <${recipientEmail}>`);
    console.log(`Subject:  ${subject}`);
    if (attachmentPath) {
      console.log(`Attached: ${path.basename(attachmentPath)} (${(fs.statSync(attachmentPath).size / 1024).toFixed(2)} KB)`);
    }
    console.log("---------------------------------------------------------------------");
    // Print first 300 characters of the HTML body stripped of HTML tags for clean reading
    const cleanBody = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').substring(0, 300);
    console.log(`Body Snippet: ${cleanBody}...`);
    console.log("=====================================================================\n");
    return true;
  }

  try {
    const postData = {
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      to: [{ email: recipientEmail, name: recipientName }],
      subject: subject,
      htmlContent: htmlContent
    };

    if (attachmentData) {
      postData.attachment = [
        {
          content: attachmentData.content,
          name: attachmentData.name
        }
      ];
    }

    const response = await axios.post('https://api.brevo.com/v3/smtp/email', postData, {
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'accept': 'application/json'
      }
    });

    if (response.status === 201 || response.status === 200) {
      console.log(`Email successfully delivered to ${recipientEmail} via Brevo!`);
      return true;
    } else {
      throw new Error(`Unsuccessful status code: ${response.status}`);
    }
  } catch (error) {
    console.error(`Brevo Email Send Failure to ${recipientEmail}:`, error.response?.data || error.message);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Helper to generate pre-styled HTML body for emails
 */
const getInvoiceEmailBody = (invoice, client, user) => {
  return `
    <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Invoice Created Successfully</h1>
        <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Billed by ${user.name}</p>
      </div>
      <div style="padding: 20px 30px;">
        <p style="font-size: 16px; color: #1e293b; margin-top: 0;">Dear <strong>${client.name}</strong>,</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
          An invoice has been generated for your recent business transactions. Please find the PDF invoice attached to this email.
        </p>
        
        <div style="background-color: #f8fafc; border-radius: 8px; padding: 15px; margin: 20px 0; border: 1px solid #f1f5f9;">
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr>
              <td style="padding: 5px 0; color: #64748b;">Invoice Number:</td>
              <td style="padding: 5px 0; text-align: right; font-weight: bold; color: #1e293b;">${invoice.invoice_number}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #64748b;">Due Date:</td>
              <td style="padding: 5px 0; text-align: right; font-weight: bold; color: #e11d48;">${new Date(invoice.due_date).toLocaleDateString()}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #64748b;">Total Amount:</td>
              <td style="padding: 5px 0; text-align: right; font-weight: bold; color: #4f46e5; font-size: 16px;">₹${parseFloat(invoice.total_amount).toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #64748b;">Balance Remaining:</td>
              <td style="padding: 5px 0; text-align: right; font-weight: bold; color: #dc2626;">₹${parseFloat(invoice.balance_amount).toFixed(2)}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
          You can download or view the PDF copy of this invoice using the attachment. For instant payments or questions, please respond to this email.
        </p>

        <p style="font-size: 14px; color: #475569; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
          Best regards,<br>
          <strong>${user.name}</strong><br>
          <span style="font-size: 12px; color: #94a3b8;">${user.email}</span>
        </p>
      </div>
      <div style="background-color: #f8fafc; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
        This is an automated invoice reminder. Thank you for your continued partnership.
      </div>
    </div>
  `;
};

module.exports = {
  sendInvoiceEmail,
  getInvoiceEmailBody
};
