#!/usr/bin/env node

const mongoose = require('mongoose');
const User = require('../server/models/User');
const Team = require('../server/models/Team');
require('dotenv').config();

async function checkDatabaseAndCreateUsers() {
  try {
    console.log('🔍 Checking database connection...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database connected successfully!');
    console.log(`📍 Connected to: ${mongoose.connection.host}`);
    console.log(`📊 Database: ${mongoose.connection.name}`);
    
    // Check if users already exist
    const existingUsers = await User.find({});
    console.log(`\n👥 Found ${existingUsers.length} existing users in database`);
    
    if (existingUsers.length > 0) {
      console.log('\n📋 Existing users:');
      existingUsers.forEach(user => {
        console.log(`   - ${user.username} (${user.email}) - Role: ${user.role}`);
      });
    }
    
    // Create default users if they don't exist
    const defaultUsers = [
      {
        username: 'admin',
        email: 'admin@yantrik.com',
        password: 'Admin123',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'managing_director',
        department: 'Management'
      },
      {
        username: 'teamlead',
        email: 'teamlead@yantrik.com',
        password: 'TeamLead123',
        firstName: 'Team',
        lastName: 'Leader',
        role: 'team_lead',
        department: 'IT'
      },
      {
        username: 'employee',
        email: 'employee@yantrik.com',
        password: 'Employee123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'employee',
        department: 'IT'
      }
    ];
    
    console.log('\n🔧 Creating default users...');
    
    for (const userData of defaultUsers) {
      try {
        const existingUser = await User.findOne({ 
          $or: [
            { username: userData.username },
            { email: userData.email }
          ]
        });
        
        if (!existingUser) {
          const newUser = await User.createUser(userData);
          console.log(`✅ Created user: ${newUser.username} (${newUser.role})`);
        } else {
          console.log(`⚠️  User ${userData.username} already exists`);
        }
      } catch (error) {
        console.log(`❌ Failed to create user ${userData.username}: ${error.message}`);
      }
    }
    
    // Create a default team if it doesn't exist
    console.log('\n🏢 Checking teams...');
    const existingTeams = await Team.find({});
    console.log(`Found ${existingTeams.length} existing teams`);
    
    if (existingTeams.length === 0) {
      try {
        const teamLead = await User.findOne({ username: 'teamlead' });
        if (teamLead) {
          const defaultTeam = await Team.create({
            name: 'IT Development Team',
            department: 'IT',
            teamLead: teamLead._id,
            members: [teamLead._id],
            description: 'Main development team for IT projects'
          });
          
          // Update team lead's teamId
          await User.findByIdAndUpdate(teamLead._id, { teamId: defaultTeam._id });
          
          console.log(`✅ Created default team: ${defaultTeam.name}`);
        }
      } catch (error) {
        console.log(`❌ Failed to create default team: ${error.message}`);
      }
    }
    
    // Final summary
    console.log('\n📊 Database Summary:');
    const totalUsers = await User.countDocuments();
    const totalTeams = await Team.countDocuments();
    console.log(`   Users: ${totalUsers}`);
    console.log(`   Teams: ${totalTeams}`);
    
    console.log('\n🎉 Database check complete!');
    console.log('\n🔑 Default Login Credentials:');
    console.log('   Managing Director: admin / Admin123');
    console.log('   Team Lead: teamlead / TeamLead123');
    console.log('   Employee: employee / Employee123');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    
    if (error.message.includes('IP')) {
      console.log('\n💡 Possible solutions:');
      console.log('   1. Check if your IP is whitelisted in MongoDB Atlas');
      console.log('   2. Verify the connection string in .env file');
      console.log('   3. Check your internet connection');
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the script
checkDatabaseAndCreateUsers();