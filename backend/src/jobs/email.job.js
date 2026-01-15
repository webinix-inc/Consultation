const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  secure: true, // true for 465, false for other ports
  host: "smtp.gmail.com",
  port: 465, // 465 for secure, 587 for TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

console.log("Email Job Loaded.");

module.exports = async function sendEmail(to, subject, html) {
  let recipient = to;
  let emailSubject = subject;
  let emailHtml = html;

  // Support object argument { email, subject, html, message }
  if (typeof to === 'object' && to !== null) {
    recipient = to.email || to.to;
    emailSubject = to.subject;
    emailHtml = to.html || to.message;
  }

  console.log(`Sending email to: ${recipient}`);

  return transporter.sendMail({
    from: `NexFutrr Admin <${process.env.EMAIL_USER}>`,
    to: recipient,
    subject: emailSubject,
    html: emailHtml,
  });
};
