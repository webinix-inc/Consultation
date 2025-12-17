const mongoose = require('mongoose');
require('dotenv').config();

// Define minimal schemas for migration
const UserSchema = new mongoose.Schema({
    email: String,
    role: String
});
const User = mongoose.model('User', UserSchema);

const ConsultantSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    email: String
});
const Consultant = mongoose.model('Consultant', ConsultantSchema);

const ClientConsultantSchema = new mongoose.Schema({
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    consultant: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Target schema
    status: String
});
const ClientConsultant = mongoose.model('ClientConsultant', ClientConsultantSchema);

async function migrate() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/consultation');
        console.log('Connected successfully\n');

        console.log('Starting migration: Link ClientConsultant to User IDs...');

        const relationships = await ClientConsultant.find({}).lean();
        let updatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const rel of relationships) {
            try {
                const consultantId = rel.consultant;

                // Check if the current consultantId is already a User ID
                const userExists = await User.findById(consultantId);
                if (userExists && userExists.role === 'Consultant') {
                    console.log(`  Skipping relationship ${rel._id} - already linked to User ID ${consultantId}`);
                    skippedCount++;
                    continue;
                }

                // If not a User ID, assume it's a Consultant ID and try to find the linked User
                const consultantDoc = await Consultant.findById(consultantId);

                if (!consultantDoc) {
                    console.log(`  WARNING: Relationship ${rel._id} references non-existent Consultant ${consultantId}`);
                    errorCount++;
                    continue;
                }

                let userId = consultantDoc.user;

                // If consultant doc doesn't have a user field, try to find user by email
                if (!userId && consultantDoc.email) {
                    const userByEmail = await User.findOne({ email: consultantDoc.email, role: 'Consultant' });
                    if (userByEmail) {
                        userId = userByEmail._id;
                    }
                }

                if (!userId) {
                    console.log(`  WARNING: Could not find User for Consultant ${consultantId} (Email: ${consultantDoc.email})`);
                    errorCount++;
                    continue;
                }

                // Update the relationship to point to the User ID
                await ClientConsultant.updateOne(
                    { _id: rel._id },
                    { $set: { consultant: userId } }
                );

                console.log(`  ✓ Updated relationship ${rel._id}: Consultant ${consultantId} -> User ${userId}`);
                updatedCount++;

            } catch (err) {
                console.error(`  Error processing relationship ${rel._id}:`, err.message);
                errorCount++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('MIGRATION SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total relationships processed: ${relationships.length}`);
        console.log(`Updated: ${updatedCount}`);
        console.log(`Skipped (already correct): ${skippedCount}`);
        console.log(`Errors/Warnings: ${errorCount}`);
        console.log('\nMigration completed successfully!');

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\nDatabase connection closed');
    }
}

migrate();
