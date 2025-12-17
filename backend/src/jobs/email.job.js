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

module.exports = async function sendEmail(to, subject, html) {
  return transporter.sendMail({
    from: `NexFutrr Admin <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};
