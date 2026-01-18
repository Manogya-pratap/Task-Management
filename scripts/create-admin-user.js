const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// Generate admin user document
const generateAdminUser = async () => {
  try {
    console.log('\n🔐 Generating Admin User Document...\n');
    
    // Hash the password
    const password = 'Admin@123';
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create the admin user document
    const adminUser = {
      "_id": new mongoose.Types.ObjectId(),
      "username": "admin",
      "email": "admin@taskmanagement.com",
      "password": hashedPassword,
      "firstName": "System",
      "lastName": "Administrator",
      "role": "it_admin", // Changed to it_admin for full system access
      "department": "IT Development",
      "teamId": null,
      "isActive": true,
      "is_active": true,
      "name": "System Administrator",
      "unique_id": "ADMIN",
      "passwordChangedAt": new Date(),
      "createdAt": new Date(),
      "updatedAt": new Date(),
      "__v": 0
    };
    
    console.log('📋 Admin User Document (for MongoDB import):');
    console.log('=====================================');
    console.log(JSON.stringify(adminUser, null, 2));
    
    console.log('\n📋 Admin User Document (MongoDB Shell format):');
    console.log('===============================================');
    console.log(`db.users.insertOne(${JSON.stringify(adminUser, null, 2)});`);
    
    console.log('\n🔑 Login Credentials:');
    console.log('====================');
    console.log(`Username: admin`);
    console.log(`Password: Admin@123`);
    console.log(`Role: IT Admin (Full System Access)`);
    console.log(`Email: admin@taskmanagement.com`);
    
    console.log('\n✅ Admin user document generated successfully!');
    
    return adminUser;
  } catch (error) {
    console.error('❌ Error generating admin user:', error.message);
    throw error;
  }
};

// Main function
const main = async () => {
  try {
    await connectDB();
    const adminUser = await generateAdminUser();
    
    // Optionally insert directly into database
    const User = require('../server/models/User');
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('\n⚠️  Admin user already exists in database');
      console.log('Existing admin ID:', existingAdmin._id);
    } else {
      // Insert the admin user
      const newAdmin = await User.create({
        username: adminUser.username,
        email: adminUser.email,
        password: adminUser.password,
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        name: `${adminUser.firstName} ${adminUser.lastName}`, // Add the required name field
        role: adminUser.role,
        department: adminUser.department,
        isActive: adminUser.isActive,
        unique_id: adminUser.unique_id
      });
      
      console.log('\n✅ Admin user inserted into database!');
      console.log('New admin ID:', newAdmin._id);
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
};

// Run the script
if (require.main === module) {
  main();
}

module.exports = { generateAdminUser };