const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("./models/User");

const checkUsers = async () => {
  try {
    // Connect to MongoDB (same as server)
    const connectionString = process.env.MONGODB_URI;
    console.log("Connecting to MongoDB...");

    await mongoose.connect(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    // Count all users
    const userCount = await User.countDocuments();
    console.log(`Total users in database: ${userCount}`);

    // List all users
    const users = await User.find({}, "username email role isActive");
    console.log("\nAll users:");
    users.forEach((user) => {
      console.log(
        `- ${user.username} (${user.email}) - Role: ${user.role} - Active: ${user.isActive}`
      );
    });

    // Check specific users
    const employee = await User.findOne({ username: "employee" });
    console.log(`\nEmployee user found: ${employee ? "YES" : "NO"}`);
    if (employee) {
      console.log(
        `Employee details: ${employee.username} - ${employee.role} - Active: ${employee.isActive}`
      );
    }

    const johnDoe = await User.findOne({ username: "john_doe" });
    console.log(`John Doe user found: ${johnDoe ? "YES" : "NO"}`);
    if (johnDoe) {
      console.log(
        `John Doe details: ${johnDoe.username} - ${johnDoe.role} - Active: ${johnDoe.isActive}`
      );
    }
  } catch (error) {
    console.error("❌ Error checking users:", error);
  } finally {
    await mongoose.disconnect();
    console.log("📴 Disconnected from MongoDB");
    process.exit(0);
  }
};

// Run check function
checkUsers();
