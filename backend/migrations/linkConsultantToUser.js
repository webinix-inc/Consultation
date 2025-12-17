/**
 * Migration Script: Link Consultant Settings and Profiles with User IDs
 * 
 * This script updates existing ConsultantSettings and Consultant documents
 * to use User IDs instead of Consultant IDs.
 * 
 * Run with: node migrations/linkConsultantToUser.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = mongoose.model('User', new mongoose.Schema({
    email: String,
    role: String,
    fullName: String
}));

const Consultant = mongoose.model('Consultant', new mongoose.Schema({
    email: String,
    user: mongoose.Schema.Types.ObjectId,
    name: String
}));



const ConsultantSettings = mongoose.model('ConsultantSettings', new mongoose.Schema({
    consultant: mongoose.Schema.Types.ObjectId
}));

async function migrate() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/consultation');
        console.log('Connected successfully\n');

        // Step 1: Update Consultant documents to add user field
        console.log('Step 1: Updating Consultant documents with user field...');
        const consultants = await Consultant.find({}).lean();
        let consultantUpdated = 0;
        let consultantSkipped = 0;

        for (const consultant of consultants) {
            if (consultant.user) {
                console.log(`  Skipping consultant ${consultant._id} - already has user field`);
                consultantSkipped++;
                continue;
            }

            if (!consultant.email) {
                console.log(`  WARNING: Consultant ${consultant._id} has no email, skipping`);
                consultantSkipped++;
                continue;
            }

            // Find matching user by email
            const user = await User.findOne({
                email: consultant.email.toLowerCase(),
                role: 'Consultant'
            });

            if (!user) {
                console.log(`  WARNING: No User found for consultant email ${consultant.email}`);
                consultantSkipped++;
                continue;
            }

            // Update consultant with user field
            await Consultant.updateOne(
                { _id: consultant._id },
                { $set: { user: user._id } }
            );

            console.log(`  ✓ Updated consultant ${consultant._id} -> User ${user._id} (${user.email})`);
            consultantUpdated++;
        }

        console.log(`\nConsultant updates: ${consultantUpdated} updated, ${consultantSkipped} skipped\n`);

        // Step 2: Update ConsultantSettings documents to use User IDs
        console.log('Step 2: Updating ConsultantSettings to use User IDs...');
        const settings = await ConsultantSettings.find({}).lean();
        let settingsUpdated = 0;
        let settingsSkipped = 0;

        for (const setting of settings) {
            // Find the consultant this setting references
            const consultant = await Consultant.findById(setting.consultant);

            if (!consultant) {
                console.log(`  WARNING: ConsultantSettings ${setting._id} references non-existent consultant ${setting.consultant}`);
                settingsSkipped++;
                continue;
            }

            if (!consultant.email) {
                console.log(`  WARNING: Consultant ${consultant._id} has no email, cannot find User`);
                settingsSkipped++;
                continue;
            }

            // Find the User by email
            const user = await User.findOne({
                email: consultant.email.toLowerCase(),
                role: 'Consultant'
            });

            if (!user) {
                console.log(`  WARNING: No User found for consultant email ${consultant.email}`);
                settingsSkipped++;
                continue;
            }

            // Check if already updated
            if (setting.consultant.toString() === user._id.toString()) {
                console.log(`  Skipping settings ${setting._id} - already uses User ID`);
                settingsSkipped++;
                continue;
            }

            // Update ConsultantSettings to reference User ID
            await ConsultantSettings.updateOne(
                { _id: setting._id },
                { $set: { consultant: user._id } }
            );

            console.log(`  ✓ Updated settings ${setting._id}: Consultant ${consultant._id} -> User ${user._id} (${user.email})`);
            settingsUpdated++;
        }

        console.log(`\nConsultantSettings updates: ${settingsUpdated} updated, ${settingsSkipped} skipped\n`);

        // Summary
        console.log('='.repeat(60));
        console.log('MIGRATION SUMMARY');
        console.log('='.repeat(60));
        console.log(`Consultants: ${consultantUpdated} updated, ${consultantSkipped} skipped`);
        console.log(`Settings: ${settingsUpdated} updated, ${settingsSkipped} skipped`);
        console.log('\nMigration completed successfully!');

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\nDatabase connection closed');
    }
}

// Run migration
migrate();
