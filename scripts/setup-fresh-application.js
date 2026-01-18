/**
 * Fresh Application Setup Script
 * 
 * This script initializes a fresh Daily Activity Tracker application with:
 * - 2 Managing Directors (MD1 and MD2)
 * - No projects initially
 * - Clean database ready for MD to add Team Leads
 * - Team Leads will then add Employees
 * - Team Leads will create and manage projects
 * 
 * Usage: node scripts/setup-fresh-application.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../server/models/User');
const Department = require('../server/models/Department');
const Team = require('../server/models/Team');
const Project = require('../server/models/Project');
const Task = require('../server/models/Task');

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/daily-activity-tracker';
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    return false;
  }
};

// Clear all existing data
const clearDatabase = async () => {
  try {
    console.log('\n🗑️  Clearing existing data...');
    
    await Task.deleteMany({});
    console.log('   ✓ Tasks cleared');
    
    await Project.deleteMany({});
    console.log('   ✓ Projects cleared');
    
    await Team.deleteMany({});
    console.log('   ✓ Teams cleared');
    
    await User.deleteMany({});
    console.log('   ✓ Users cleared');
    
    await Department.deleteMany({});
    console.log('   ✓ Departments cleared');
    
    console.log('✅ Database cleared successfully\n');
  } catch (error) {
    console.error('❌ Error clearing database:', error.message);
    throw error;
  }
};

// Create default departments
const createDepartments = async () => {
  try {
    console.log('📁 Creating departments...');
    
    const departments = [
      {
        dept_name: 'Management',
        name: 'Management',
        description: 'Executive management and administration',
        is_active: true,
        isActive: true
      },
      {
        dept_name: 'IT Development',
        name: 'IT Development',
        description: 'Software development and IT infrastructure',
        is_active: true,
        isActive: true
      },
      {
        dept_name: 'Human Resources',
        name: 'Human Resources',
        description: 'HR and employee management',
        is_active: true,
        isActive: true
      },
      {
        dept_name: 'Finance',
        name: 'Finance',
        description: 'Financial operations and accounting',
        is_active: true,
        isActive: true
      },
      {
        dept_name: 'Marketing',
        name: 'Marketing',
        description: 'Marketing and business development',
        is_active: true,
        isActive: true
      },
      {
        dept_name: 'Operations',
        name: 'Operations',
        description: 'Operations and logistics',
        is_active: true,
        isActive: true
      },
      {
        dept_name: 'Sales',
        name: 'Sales',
        description: 'Sales and customer relations',
        is_active: true,
        isActive: true
      }
    ];
    
    const createdDepts = await Department.insertMany(departments);
    console.log(`✅ Created ${createdDepts.length} departments\n`);
    
    return createdDepts;
  } catch (error) {
    console.error('❌ Error creating departments:', error.message);
    throw error;
  }
};

// Create Managing Directors
const createManagingDirectors = async (managementDept) => {
  try {
    console.log('👔 Creating Managing Directors...');
    
    const md1 = await User.create({
      username: 'md1',
      email: 'md1@yantrik.com',
      password: 'Admin@123',
      firstName: 'Managing',
      lastName: 'Director 1',
      role: 'managing_director',
      department: 'Management',
      isActive: true,
      unique_id: 'MD001',
      name: 'Managing Director 1'
    });
    console.log('   ✓ MD1 created - Username: md1, Password: Admin@123');
    
    const md2 = await User.create({
      username: 'md2',
      email: 'md2@yantrik.com',
      password: 'Admin@123',
      firstName: 'Managing',
      lastName: 'Director 2',
      role: 'managing_director',
      department: 'Management',
      isActive: true,
      unique_id: 'MD002',
      name: 'Managing Director 2'
    });
    console.log('   ✓ MD2 created - Username: md2, Password: Admin@123');
    
    console.log('✅ Managing Directors created successfully\n');
    
    return [md1, md2];
  } catch (error) {
    console.error('❌ Error creating Managing Directors:', error.message);
    throw error;
  }
};

// Main setup function
const setupFreshApplication = async () => {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   Daily Activity Tracker - Fresh Application Setup        ║');
  console.log('║   Yantrik Automation Pvt. Ltd.                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  try {
    // Connect to database
    const connected = await connectDB();
    if (!connected) {
      console.error('❌ Failed to connect to database. Exiting...');
      process.exit(1);
    }
    
    // Clear existing data
    await clearDatabase();
    
    // Create departments
    const departments = await createDepartments();
    const managementDept = departments.find(d => d.name === 'Management');
    
    // Create Managing Directors
    const [md1, md2] = await createManagingDirectors(managementDept);
    
    // Summary
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    SETUP COMPLETE! ✅                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    console.log('📊 Application Setup Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('👥 Users Created:');
    console.log('   • MD1 (Managing Director)');
    console.log('     - Username: md1');
    console.log('     - Email: md1@yantrik.com');
    console.log('     - Password: Admin@123');
    console.log('     - Role: Admin (Managing Director)\n');
    
    console.log('   • MD2 (Managing Director)');
    console.log('     - Username: md2');
    console.log('     - Email: md2@yantrik.com');
    console.log('     - Password: Admin@123');
    console.log('     - Role: Admin (Managing Director)\n');
    
    console.log('📁 Departments Created:');
    departments.forEach(dept => {
      console.log(`   • ${dept.name}`);
    });
    console.log('');
    
    console.log('📋 Next Steps:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('1️⃣  Login as MD1 or MD2:');
    console.log('   • Navigate to: http://localhost:3000/login');
    console.log('   • Use credentials above\n');
    
    console.log('2️⃣  Create Team Leads:');
    console.log('   • Go to User Management');
    console.log('   • Click "Add New User"');
    console.log('   • Select Role: "Team Lead"');
    console.log('   • Assign to appropriate department\n');
    
    console.log('3️⃣  Team Leads will then:');
    console.log('   • Login with their credentials');
    console.log('   • Create Employee accounts');
    console.log('   • Create and manage projects');
    console.log('   • Assign tasks to employees\n');
    
    console.log('4️⃣  Workflow:');
    console.log('   • MD creates Team Leads');
    console.log('   • Team Leads create Employees');
    console.log('   • Team Leads create Projects');
    console.log('   • Team Leads assign Tasks to Employees');
    console.log('   • Employees update task progress');
    console.log('   • Team Leads approve task completion\n');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🎉 Your Daily Activity Tracker is ready to use!\n');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run setup
setupFreshApplication();
