const mongoose = require("mongoose");
require("dotenv").config();

async function findConsultant() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(uri);

        const Consultant = mongoose.connection.collection("consultants");
        const User = mongoose.connection.collection("users");

        console.log("Searching 'consultants' for 'Test'...");

        const profiles = await Consultant.find({
            $or: [
                { name: { $regex: "Test", $options: "i" } }
            ]
        }).limit(1).toArray();

        if (profiles.length === 0) {
            console.log("No profile found with name 'Test'");
        }

        for (const p of profiles) {
            console.log("CONSULTANT FOUND:");
            console.log(`_id: ${p._id}`);
            console.log(`user: ${p.user}`);
            console.log(`name: ${p.name}`);
            console.log(`firstName: ${p.firstName}`);
            console.log(`lastName: ${p.lastName}`);

            if (p.user) {
                console.log("LOOKING UP USER...");
                const u = await User.findOne({ _id: p.user });
                if (u) {
                    console.log("USER FOUND:");
                    console.log(`_id: ${u._id}`);
                    console.log(`name: ${u.name}`);
                    console.log(`fullName: ${u.fullName}`);
                    console.log(`displayName: ${u.displayName}`);
                    console.log(`firstName: ${u.firstName}`);
                } else {
                    console.log("USER NOT FOUND");
                }
            }
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

findConsultant();
