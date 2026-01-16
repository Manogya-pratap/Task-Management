/**
 * Cleanup Broken Tasks Script
 * 
 * This script finds and removes tasks with invalid references to:
 * - Non-existent users (assigned_to, created_by)
 * - Non-existent projects (project_id)
 * - Non-existent departments (req_dept_id, exec_dept_id)
 * 
 * Usage: node scripts/cleanup-broken-tasks.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Task = require('../server/models/Task');
const User = require('../server/models/User');
const Project = require('../server/models/Project');
const Department = require('../server/models/Department');

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/daily-activity-tracker';
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB connected successfully\n');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    return false;
  }
};

// Check and cleanup broken tasks
const cleanupBrokenTasks = async () => {
  console.log('🔍 Checking for broken tasks...\n');
  
  try {
    const tasks = await Task.find({}).lean();
    console.log(`Found ${tasks.length} total tasks\n`);
    
    const brokenTasks = [];
    const validTasks = [];
    
    for (const task of tasks) {
      let isBroken = false;
      const issues = [];
      
      // Check assigned_to
      if (task.assigned_to) {
        const user = await User.findById(task.assigned_to);
        if (!user) {
          isBroken = true;
          issues.push(`assigned_to user not found: ${task.assigned_to}`);
        }
      } else {
        isBroken = true;
        issues.push('assigned_to is null');
      }
      
      // Check created_by
      if (task.created_by) {
        const user = await User.findById(task.created_by);
        if (!user) {
          isBroken = true;
          issues.push(`created_by user not found: ${task.created_by}`);
        }
      } else {
        isBroken = true;
        issues.push('created_by is null');
      }
      
      // Check project_id
      if (task.project_id) {
        const project = await Project.findById(task.project_id);
        if (!project) {
          isBroken = true;
          issues.push(`project_id not found: ${task.project_id}`);
        }
      } else {
        isBroken = true;
        issues.push('project_id is null');
      }
      
      // Check req_dept_id
      if (task.req_dept_id) {
        const dept = await Department.findById(task.req_dept_id);
        if (!dept) {
          isBroken = true;
          issues.push(`req_dept_id not found: ${task.req_dept_id}`);
        }
      } else {
        isBroken = true;
        issues.push('req_dept_id is null');
      }
      
      // Check exec_dept_id
      if (task.exec_dept_id) {
        const dept = await Department.findById(task.exec_dept_id);
        if (!dept) {
          isBroken = true;
          issues.push(`exec_dept_id not found: ${task.exec_dept_id}`);
        }
      } else {
        isBroken = true;
        issues.push('exec_dept_id is null');
      }
      
      if (isBroken) {
        brokenTasks.push({ task, issues });
      } else {
        validTasks.push(task);
      }
    }
    
    console.log('📊 Analysis Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`✅ Valid tasks: ${validTasks.length}`);
    console.log(`❌ Broken tasks: ${brokenTasks.length}\n`);
    
    if (brokenTasks.length > 0) {
      console.log('🔴 Broken Tasks Details:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      brokenTasks.forEach((item, index) => {
        console.log(`Task ${index + 1}:`);
        console.log(`  ID: ${item.task._id}`);
        console.log(`  Title: ${item.task.title || 'N/A'}`);
        console.log(`  Issues:`);
        item.issues.forEach(issue => {
          console.log(`    - ${issue}`);
        });
        console.log('');
      });
      
      // Ask for confirmation to delete
      console.log('⚠️  These broken tasks will be DELETED.\n');
      console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Delete broken tasks
      const taskIds = brokenTasks.map(item => item.task._id);
      const result = await Task.deleteMany({ _id: { $in: taskIds } });
      
      console.log(`✅ Deleted ${result.deletedCount} broken tasks\n`);
    } else {
      console.log('✅ No broken tasks found! Database is clean.\n');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Cleanup complete!\n');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
};

// Main function
const main = async () => {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         Task Cleanup Script - Remove Broken Tasks         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  try {
    const connected = await connectDB();
    if (!connected) {
      console.error('❌ Failed to connect to database. Exiting...');
      process.exit(1);
    }
    
    await cleanupBrokenTasks();
    
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run cleanup
main();
