require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('./src/config/db');
// Load models
const User = require('./src/models/user.model');
const Client = require('./src/models/client.model');

async function checkId() {
    await connectDB();
    const id = '695e5abc5cd972278507d1e5';

    const userDoc = await User.findById(id);
    const clientDoc = await Client.findById(id);

    console.log(`Checking ID: ${id}`);
    console.log(`Found in User: ${!!userDoc}`);
    console.log(`Found in Client: ${!!clientDoc}`);

    process.exit();
}
checkId();
