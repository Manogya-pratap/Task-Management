// Demo user creation script - COMPLETED
// Demo user has been successfully created with admin privileges
// Login: demo / Demo@123

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import the User model
const User = require('../server/models/User');

async function createDemoUser() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if demo user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { username: 'demo' },
        { email: 'demo@taskmanagement.com' }
      ]
    });

    if (existingUser) {
      console.log('⚠️  Demo user already exists');
      console.log('   Username:', existingUser.username);
      console.log('   Email:', existingUser.email);
      console.log('   Role:', existingUser.role);
      console.log('   Active:', existingUser.is_active);
      
      // Update the existing user to ensure it has admin privileges
      existingUser.role = 'it_admin';
      existingUser.is_active = true;
      existingUser.isActive = true;
      existingUser.password = await bcrypt.hash('Demo@123', 12);
      existingUser.passwordChangedAt = new Date();
      
      await existingUser.save();
      console.log('✅ Updated existing demo user with admin privileges');
    } else {
      // Create new demo user
      console.log('👤 Creating demo user...');
      
      const demoUser = new User({
        unique_id: 'DEMO',
        name: 'Demo User',
        email: 'demo@taskmanagement.com',
        password: 'Demo@123', // Will be hashed by pre-save middleware
        role: 'it_admin', // Same role as admin
        dept_id: null, // Admin roles don't require department
        team_id: null,
        is_active: true,
        isActive: true,
        lastLogin: null,
        username: 'demo',
        firstName: 'Demo',
        lastName: 'User',
        department: 'IT Administration',
        passwordChangedAt: new Date()
      });

      await demoUser.save();
      console.log('✅ Demo user created successfully!');
    }

    // Verify the demo user
    const demoUser = await User.findOne({ username: 'demo' });
    console.log('\n📋 Demo User Details:');
    console.log('   ID:', demoUser._id);
    console.log('   Username:', demoUser.username);
    console.log('   Email:', demoUser.email);
    console.log('   Name:', demoUser.name);
    console.log('   Role:', demoUser.role);
    console.log('   Department:', demoUser.department);
    console.log('   Active (is_active):', demoUser.is_active);
    console.log('   Active (isActive):', demoUser.isActive);
    console.log('   Created:', demoUser.createdAt);

    console.log('\n🎉 Demo user setup completed!');
    console.log('\n🔑 Login Credentials:');
    console.log('   Username: demo');
    console.log('   Password: Demo@123');
    console.log('   Authority: IT Admin (same as admin user)');

  } catch (error) {
    console.error('❌ Error creating demo user:', error.message);
    if (error.code === 11000) {
      console.error('   Duplicate key error - user might already exist');
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
createDemoUser();