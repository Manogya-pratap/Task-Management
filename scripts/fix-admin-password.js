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

// Fix admin password
const fixAdminPassword = async () => {
  try {
    console.log('\n🔧 Fixing Admin Password...\n');
    
    const User = require('../server/models/User');
    
    // Find the admin user
    const adminUser = await User.findOne({ username: 'admin' });
    
    if (!adminUser) {
      console.log('❌ Admin user not found in database');
      return;
    }
    
    console.log('📋 Current Admin User Info:');
    console.log('==========================');
    console.log(`ID: ${adminUser._id}`);
    console.log(`Username: ${adminUser.username}`);
    console.log(`Email: ${adminUser.email}`);
    console.log(`Role: ${adminUser.role}`);
    console.log(`Name: ${adminUser.name || adminUser.firstName + ' ' + adminUser.lastName}`);
    console.log(`Current Password Hash: ${adminUser.password.substring(0, 20)}...`);
    
    // Generate new password hash
    const newPassword = 'Admin@123';
    const saltRounds = 12;
    const newHashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    console.log('\n🔐 Generating New Password Hash...');
    console.log(`New Password: ${newPassword}`);
    console.log(`New Hash: ${newHashedPassword.substring(0, 20)}...`);
    
    // Test the new hash
    const testComparison = await bcrypt.compare(newPassword, newHashedPassword);
    console.log(`Hash Test: ${testComparison ? '✅ PASS' : '❌ FAIL'}`);
    
    if (!testComparison) {
      console.log('❌ Hash generation failed - aborting');
      return;
    }
    
    // Update the admin user password directly in database (bypass pre-save middleware)
    const result = await User.updateOne(
      { username: 'admin' },
      { 
        $set: {
          password: newHashedPassword,
          passwordChangedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`\n✅ Admin password updated successfully! (${result.modifiedCount} document modified)`);
    console.log('\n🔑 Login Credentials:');
    console.log('====================');
    console.log(`Username: admin`);
    console.log(`Password: Admin@123`);
    console.log(`Role: ${adminUser.role}`);
    
    // Verify the update worked
    const updatedUser = await User.findOne({ username: 'admin' });
    const verifyPassword = await bcrypt.compare('Admin@123', updatedUser.password);
    
    console.log('\n🧪 Verification Test:');
    console.log('====================');
    console.log(`Password Verification: ${verifyPassword ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    if (verifyPassword) {
      console.log('\n🎉 Admin login should now work!');
      console.log('Try logging in with: admin / Admin@123');
    } else {
      console.log('\n❌ Something went wrong - password still not working');
      console.log('Trying alternative approach...');
      
      // Alternative: Set password to plain text and let middleware hash it
      const adminUserForUpdate = await User.findOne({ username: 'admin' });
      adminUserForUpdate.password = 'Admin@123'; // Plain text - middleware will hash it
      await adminUserForUpdate.save();
      
      console.log('✅ Used Mongoose middleware to hash password');
      
      // Test again
      const finalUser = await User.findOne({ username: 'admin' });
      const finalTest = await bcrypt.compare('Admin@123', finalUser.password);
      console.log(`Final Test: ${finalTest ? '✅ SUCCESS' : '❌ FAILED'}`);
    }
    
  } catch (error) {
    console.error('❌ Error fixing admin password:', error.message);
    throw error;
  }
};

// Main function
const main = async () => {
  try {
    await connectDB();
    await fixAdminPassword();
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

module.exports = { fixAdminPassword };