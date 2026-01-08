const mongoose = require("mongoose");
require("dotenv").config();

async function checkUser() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(uri);

        const User = mongoose.connection.collection("users");
        const Consultant = mongoose.connection.collection("consultants");

        console.log("Listing first 5 users with role 'Consultant'...");

        const users = await User.find({ role: "Consultant" }).limit(5).toArray();

        console.log(`Found ${users.length} consultant users.`);

        for (const user of users) {
            console.log("\n-------------------------");
            console.log(`USER [${user._id}]:`);
            console.log("  name:", user.name);
            console.log("  fullName:", user.fullName);
            console.log("  displayName:", user.displayName);
            console.log("  firstName:", user.firstName);
            console.log("  lastName:", user.lastName);
            console.log("  email:", user.email);

            const consultant = await Consultant.findOne({ user: user._id });
            if (consultant) {
                console.log(`CONSULTANT PROFILE [${consultant._id}]:`);
                console.log("  name:", consultant.name);
                console.log("  displayName:", consultant.displayName);
                console.log("  firstName:", consultant.firstName);
                console.log("  lastName:", consultant.lastName);
            } else {
                console.log("  No linked Consultant Profile found.");
            }
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

checkUser();
