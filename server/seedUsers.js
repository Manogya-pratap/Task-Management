const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("./models/User");

// Sample users to seed
const sampleUsers = [
  {
    username: "admin",
    email: "admin@taskmanagement.com",
    password: "admin123",
    firstName: "System",
    lastName: "Administrator",
    role: "managing_director",
    department: "IT",
    isActive: true,
  },
  {
    username: "itadmin",
    email: "itadmin@taskmanagement.com",
    password: "itadmin123",
    firstName: "IT",
    lastName: "Admin",
    role: "it_admin",
    department: "IT",
    isActive: true,
  },
  {
    username: "teamlead",
    email: "teamlead@taskmanagement.com",
    password: "teamlead123",
    firstName: "Team",
    lastName: "Lead",
    role: "team_lead",
    department: "Development",
    isActive: true,
  },
  {
    username: "employee",
    email: "employee@taskmanagement.com",
    password: "employee123",
    firstName: "Regular",
    lastName: "Employee",
    role: "employee",
    department: "Development",
    isActive: true,
  },
  {
    username: "john_doe",
    email: "john.doe@taskmanagement.com",
    password: "john123",
    firstName: "John",
    lastName: "Doe",
    role: "employee",
    department: "Development",
    isActive: true,
  },
];

const seedUsers = async () => {
  try {
    // Connect to MongoDB (same as server)
    const connectionString =
      process.env.MONGODB_URI ||
      "mongodb+srv://mpsingh1932000_db_user:SjdO4YMSoN3s0Nr2@task-management.4t1yxy0.mongodb.net/?appName=task-management";
    console.log("Connecting to MongoDB...");

    await mongoose.connect(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    // Clear existing users (optional - comment out if you want to keep existing users)
    console.log("Clearing existing users...");
    await User.deleteMany({});
    console.log("✅ Cleared existing users");

    // Create users (password will be hashed automatically by User model pre-save middleware)
    console.log("Creating sample users...");
    for (const userData of sampleUsers) {
      // Create user with plain password (User model will hash it automatically)
      const user = new User({
        ...userData,
        password: userData.password, // Plain password - will be hashed by pre-save middleware
      });

      await user.save();
      console.log(`✅ Created user: ${userData.username} (${userData.role})`);
    }

    console.log("\n🎉 User seeding completed successfully!");
    console.log("\nLogin credentials:");
    console.log("==================");
    sampleUsers.forEach((user) => {
      console.log(`${user.username}: ${user.password} (${user.role})`);
    });
  } catch (error) {
    console.error("❌ Error seeding users:", error);
  } finally {
    await mongoose.disconnect();
    console.log("📴 Disconnected from MongoDB");
    process.exit(0);
  }
};

// Run the seeding function
seedUsers();
