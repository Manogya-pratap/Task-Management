const mongoose = require('mongoose');
require('dotenv').config();

async function createSampleTasks() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected! Creating sample tasks...');
    
    const Task = require('../server/models/Task');
    const Project = require('../server/models/Project');
    const User = require('../server/models/User');
    
    // Get first project and user
    const project = await Project.findOne();
    const user = await User.findOne();
    
    if (!project || !user) {
      console.log('❌ No project or user found. Cannot create tasks.');
      mongoose.connection.close();
      return;
    }
    
    console.log(`📁 Using project: ${project.name}`);
    console.log(`👤 Using user: ${user.firstName} ${user.lastName}`);
    
    // Create sample tasks with different statuses
    const sampleTasks = [
      {
        title: 'Setup Development Environment',
        description: 'Configure development tools and environment',
        project_id: project._id,
        assigned_to: user._id,
        created_by: user._id,
        req_dept_id: project.dept_id,
        exec_dept_id: project.dept_id,
        status: 'Done', // Backend status
        priority: 'High',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        start_date: new Date(),
        completed_date: new Date(),
        estimated_hours: 8
      },
      {
        title: 'Database Design',
        description: 'Design database schema and relationships',
        project_id: project._id,
        assigned_to: user._id,
        created_by: user._id,
        req_dept_id: project.dept_id,
        exec_dept_id: project.dept_id,
        status: 'Done', // Backend status
        priority: 'High',
        due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        start_date: new Date(),
        completed_date: new Date(),
        estimated_hours: 12
      },
      {
        title: 'API Development',
        description: 'Develop REST API endpoints',
        project_id: project._id,
        assigned_to: user._id,
        created_by: user._id,
        req_dept_id: project.dept_id,
        exec_dept_id: project.dept_id,
        status: 'In Progress', // Backend status
        priority: 'Medium',
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        start_date: new Date(),
        estimated_hours: 20
      },
      {
        title: 'Frontend Implementation',
        description: 'Build user interface components',
        project_id: project._id,
        assigned_to: user._id,
        created_by: user._id,
        req_dept_id: project.dept_id,
        exec_dept_id: project.dept_id,
        status: 'Pending', // Backend status
        priority: 'Medium',
        due_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        estimated_hours: 25
      }
    ];
    
    // Create tasks
    for (const taskData of sampleTasks) {
      const task = new Task(taskData);
      await task.save();
      console.log(`✅ Created task: ${task.title} (Status: ${task.status})`);
    }
    
    console.log('\n📊 Task creation summary:');
    const taskCounts = await Task.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    taskCounts.forEach(({ _id, count }) => {
      console.log(`  ${_id}: ${count} tasks`);
    });
    
    mongoose.connection.close();
    console.log('\n🎉 Sample tasks created successfully!');
  } catch (error) {
    console.error('❌ Error creating sample tasks:', error);
    mongoose.connection.close();
  }
}

createSampleTasks();