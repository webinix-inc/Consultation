/**
 * Email Service - BigFat AI Labs Email API
 * Uses templated emails via centralized email service
 */

const EMAIL_API_URL = process.env.EMAIL_API_URL;
const EMAIL_API_KEY = process.env.EMAIL_API_KEY;
const PROJECT_ID = process.env.PROJECT_ID;

console.log("Email Service Loaded (API-based).");

/**
 * Format sender with display name: "Company Name <email@domain.com>"
 * @returns {string} Formatted from address
 */
function getFromAddress() {
  const email = process.env.EMAIL_FROM;
  const name = process.env.EMAIL_FROM_NAME;
  return name ? `${name} <${email}>` : email;
}

/**
 * Send email using a pre-configured template
 * @param {Object} options - Email options
 * @param {string} options.template - Template name (e.g., 'reset-password')
 * @param {string} options.to - Recipient email (or options.email for backward compat)
 * @param {string} options.subject - Email subject
 * @param {Object} options.data - Template variables
 * @param {string} options.from - Sender email (optional, uses formatted EMAIL_FROM with EMAIL_FROM_NAME)
 */
async function sendEmail(options) {
  // Support both { to } and { email } for backward compatibility
  const recipient = options.to || options.email;
  const template = options.template || 'reset-password'; // default template
  const subject = options.subject || 'Notification';
  const data = options.data || {};
  const from = options.from || getFromAddress();

  if (!recipient) {
    throw new Error('Email recipient is required');
  }

  if (!EMAIL_API_URL || !EMAIL_API_KEY) {
    throw new Error('Email API configuration missing. Set EMAIL_API_URL and EMAIL_API_KEY in environment.');
  }

  console.log(`[EmailService] Sending email to: ${recipient}`);
  console.log(`[EmailService] Template: ${template}, From: ${from}`);

  try {
    const response = await fetch(`${EMAIL_API_URL}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': EMAIL_API_KEY,
      },
      body: JSON.stringify({
        template,
        to: recipient,
        from: from,
        subject,
        data: {
          brand_name: process.env.BRAND_NAME || 'BigFat AI Labs',
          support_email: process.env.SUPPORT_EMAIL || 'support@yourcompany.com',
          year: new Date().getFullYear().toString(),
          ...data,
        },
        projectId: PROJECT_ID,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Email sending failed' }));
      console.error(`[EmailService] API returned error: ${error.message}`);
      throw new Error(error.message || 'Email sending failed');
    }

    const result = await response.json();
    console.log(`[EmailService] Email sent successfully to: ${recipient}`);
    return result;
  } catch (error) {
    console.error(`[EmailService] Error: ${error.message}`);
    throw error;
  }
}

module.exports = { sendEmail };
