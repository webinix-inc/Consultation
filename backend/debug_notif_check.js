require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('./src/config/db');
const Notification = require('./src/models/notification.model');
const fs = require('fs');

async function check() {
    await connectDB();
    const notifs = await Notification.find({ relatedId: '695fd0e1331e078775699c30' }).lean();

    let out = `Found ${notifs.length} notifications for Appointment 695fd0e1331e078775699c30:\n`;
    notifs.forEach(n => {
        out += `- ID: ${n._id}, Recipient: ${n.recipient}, Message: "${n.message}", Type: ${n.type}, CreatedAt: ${n.createdAt}\n`;
    });

    fs.writeFileSync('debug_notif_check.txt', out);
    console.log(out);
    process.exit();
}
check();
