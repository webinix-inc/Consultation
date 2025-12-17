require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db');
const Client = require('../src/models/client.model');

async function fixIndexes() {
    try {
        await connectDB();
        console.log('Connected to DB');

        console.log('Listing indexes for Client collection...');
        try {
            const indexes = await Client.collection.getIndexes();
            console.log(JSON.stringify(indexes, null, 2));
        } catch (e) {
            console.log('Could not get indexes (maybe collection does not exist yet)');
        }

        // Explicitly drop user_1 index to ensure it is recreated with sparse: true
        try {
            await Client.collection.dropIndex('user_1');
            console.log('Dropped user_1 index successfully');
        } catch (e) {
            console.log('user_1 index drop failed (probably did not exist):', e.message);
        }

        // Sync indexes
        console.log('Syncing indexes...');
        await Client.syncIndexes();
        console.log('Indexes synced');

        try {
            const newIndexes = await Client.collection.getIndexes();
            console.log('New Indexes:', JSON.stringify(newIndexes, null, 2));
        } catch (e) {
            console.log('Error getting new indexes:', e.message);
        }

        process.exit(0);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixIndexes();
