require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db');
const User = require('../src/models/user.model');

async function listAdmins() {
    try {
        await connectDB();
        console.log('Connected to DB');

        const admins = await User.find({ role: 'Admin' });
        console.log(`Found ${admins.length} admins.`);
        admins.forEach(admin => {
            console.log(`Admin: ${admin.fullName}, Mobile: ${admin.mobile}, Email: ${admin.email}`);
        });

        if (admins.length === 0) {
            console.log("Creating a temporary admin for testing...");
            const newAdmin = await User.create({
                fullName: "Test Admin",
                email: "admin@test.com",
                mobile: "9000090000",
                role: "Admin",
                passwordHash: "password123", // dummy
                status: "Active"
            });
            console.log(`Created Admin: ${newAdmin.fullName}, Mobile: ${newAdmin.mobile}`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

listAdmins();
