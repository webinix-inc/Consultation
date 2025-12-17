/**
 * Migration Script: Generate Slots for Consultant Settings
 * 
 * This script iterates over all ConsultantSettings and populates the 'generatedSlots'
 * field based on the existing 'slots' and 'sessionSettings'.
 * 
 * Run with: node migrations/generateSlots.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const ConsultantSettings = mongoose.model('ConsultantSettings', new mongoose.Schema({
    availability: {
        sessionSettings: {
            defaultDuration: { type: Number, default: 60 },
            bufferTime: { type: Number, default: 0 }
        },
        workingHours: {
            monday: { enabled: Boolean, slots: [], generatedSlots: [] },
            tuesday: { enabled: Boolean, slots: [], generatedSlots: [] },
            wednesday: { enabled: Boolean, slots: [], generatedSlots: [] },
            thursday: { enabled: Boolean, slots: [], generatedSlots: [] },
            friday: { enabled: Boolean, slots: [], generatedSlots: [] },
            saturday: { enabled: Boolean, slots: [], generatedSlots: [] },
            sunday: { enabled: Boolean, slots: [], generatedSlots: [] }
        }
    }
}, { strict: false }));

function calculateGeneratedSlots(availability) {
    if (!availability || !availability.workingHours) return availability;

    const sessionSettings = availability.sessionSettings || {};
    const durationMin = sessionSettings.defaultDuration || 60;
    const bufferMin = sessionSettings.bufferTime || 0;
    const interval = durationMin + bufferMin;

    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

    days.forEach(day => {
        const dayConfig = availability.workingHours[day];
        if (dayConfig && dayConfig.enabled && dayConfig.slots && dayConfig.slots.length > 0) {
            const generated = [];

            dayConfig.slots.forEach(slot => {
                if (!slot.start || !slot.end) return;

                const [startH, startM] = slot.start.split(":").map(Number);
                const [endH, endM] = slot.end.split(":").map(Number);

                let currentH = startH;
                let currentM = startM;

                // Convert to minutes for easier calculation
                let currentTotalMin = currentH * 60 + currentM;
                const endTotalMin = endH * 60 + endM;

                while (currentTotalMin + durationMin <= endTotalMin) {
                    const slotStartH = Math.floor(currentTotalMin / 60);
                    const slotStartM = currentTotalMin % 60;

                    const slotEndTotalMin = currentTotalMin + durationMin;
                    const slotEndH = Math.floor(slotEndTotalMin / 60);
                    const slotEndM = slotEndTotalMin % 60;

                    const startStr = `${String(slotStartH).padStart(2, "0")}:${String(slotStartM).padStart(2, "0")}`;
                    const endStr = `${String(slotEndH).padStart(2, "0")}:${String(slotEndM).padStart(2, "0")}`;

                    generated.push(`${startStr} - ${endStr}`);

                    currentTotalMin += interval;
                }
            });

            dayConfig.generatedSlots = generated;
        } else if (dayConfig) {
            dayConfig.generatedSlots = [];
        }
    });

    return availability;
}

async function migrate() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/consultation');
        console.log('Connected successfully\n');

        console.log('Fetching all ConsultantSettings...');
        const settingsList = await ConsultantSettings.find({});
        console.log(`Found ${settingsList.length} settings documents.\n`);

        let updatedCount = 0;

        for (const settings of settingsList) {
            if (!settings.availability) continue;

            console.log(`Processing settings for ${settings._id}...`);

            // Calculate slots
            const updatedAvailability = calculateGeneratedSlots(settings.availability);

            // Update document
            // We use updateOne to ensure we don't trigger validation errors if schema differs
            await ConsultantSettings.updateOne(
                { _id: settings._id },
                { $set: { availability: updatedAvailability } }
            );

            updatedCount++;
        }

        console.log(`\nSuccessfully updated ${updatedCount} documents with generated slots.`);

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\nDatabase connection closed');
    }
}

migrate();
