#!/usr/bin/env node

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// Login and get token
async function loginAndGetToken() {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'Admin123'
    });
    return response.data.token;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data?.message || error.message);
    throw error;
  }
}

// Create sample projects and tasks
async function createSampleData() {
  try {
    console.log('🔍 Logging in as admin...');
    const token = await loginAndGetToken();
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('✅ Login successful!');
    
    // Get users for task assignment
    const usersResponse = await axios.get(`${API_BASE}/users`, { headers });
    const users = usersResponse.data.data.users;
    console.log('📋 Users found:', users.length);
    
    const teamLead = users.find(u => u.username === 'teamlead');
    const employee = users.find(u => u.username === 'employee');
    console.log('👤 Team Lead:', teamLead?.username);
    console.log('👤 Employee:', employee?.username);
    
    // Get teams for project assignment
    let defaultTeam = null;
    try {
      const teamsResponse = await axios.get(`${API_BASE}/teams`, { headers });
      console.log('🏢 Teams response:', JSON.stringify(teamsResponse.data, null, 2));
      
      // Handle different response structures
      let teams = [];
      if (teamsResponse.data.data && teamsResponse.data.data.teams) {
        teams = teamsResponse.data.data.teams;
      } else if (teamsResponse.data.data && Array.isArray(teamsResponse.data.data)) {
        teams = teamsResponse.data.data;
      } else if (Array.isArray(teamsResponse.data)) {
        teams = teamsResponse.data;
      }
      
      console.log('🏢 Teams found:', teams.length);
      defaultTeam = teams[0]; // Use first team
      if (defaultTeam) {
        console.log('✅ Using team:', defaultTeam.name, 'ID:', defaultTeam._id);
      }
    } catch (error) {
      console.log('❌ Teams endpoint error:', error.response?.data?.message || error.message);
      console.log('⚠️  Will try to create projects without team assignment');
    }
    
    // Sample projects
    const projects = [
      {
        name: 'Website Redesign',
        description: 'Complete redesign of company website with modern UI/UX',
        status: 'active',
        priority: 'high',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        budget: 50000,
        ...(defaultTeam && { teamId: defaultTeam._id })
      },
      {
        name: 'Mobile App Development',
        description: 'Native mobile application for iOS and Android',
        status: 'active',
        priority: 'medium',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days from now
        budget: 75000,
        ...(defaultTeam && { teamId: defaultTeam._id })
      },
      {
        name: 'Database Migration',
        description: 'Migrate legacy database to new cloud infrastructure',
        status: 'planning',
        priority: 'urgent',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), // 21 days from now
        budget: 25000,
        ...(defaultTeam && { teamId: defaultTeam._id })
      }
    ];
    
    console.log('\n🏗️ Creating sample projects...');
    const createdProjects = [];
    
    for (const projectData of projects) {
      try {
        const response = await axios.post(`${API_BASE}/projects`, projectData, { headers });
        const project = response.data.data.project || response.data.data || response.data;
        createdProjects.push(project);
        console.log(`✅ Created project: ${project.name} (ID: ${project._id})`);
      } catch (error) {
        console.log(`❌ Failed to create project ${projectData.name}:`, error.response?.data?.message || error.message);
      }
    }
    
    // Sample tasks for each project
    console.log('\n📋 Creating sample tasks...');
    
    for (const project of createdProjects) {
      const tasks = [
        {
          title: `${project.name} - Planning Phase`,
          description: 'Initial planning and requirement gathering',
          status: 'completed',
          priority: 'high',
          projectId: project._id,
          ...(teamLead && { assignedTo: teamLead._id }),
          scheduledDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
          dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
          estimatedHours: 16
        },
        {
          title: `${project.name} - Design Phase`,
          description: 'Create wireframes and design mockups',
          status: 'in_progress',
          priority: 'medium',
          projectId: project._id,
          scheduledDate: new Date().toISOString(), // Today
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
          estimatedHours: 24
        },
        {
          title: `${project.name} - Development Phase`,
          description: 'Implementation and coding',
          status: 'scheduled',
          priority: 'high',
          projectId: project._id,
          ...(teamLead && { assignedTo: teamLead._id }),
          scheduledDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days from now
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
          estimatedHours: 80
        },
        {
          title: `${project.name} - Testing Phase`,
          description: 'Quality assurance and testing',
          status: 'new',
          priority: 'medium',
          projectId: project._id,
          scheduledDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days from now
          dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days from now
          estimatedHours: 32
        }
      ];
      
      for (const taskData of tasks) {
        try {
          const response = await axios.post(`${API_BASE}/tasks`, taskData, { headers });
          const task = response.data.data.task || response.data.data || response.data;
          console.log(`✅ Created task: ${task.title} (Project: ${project.name})`);
        } catch (error) {
          console.log(`❌ Failed to create task ${taskData.title}:`, error.response?.data?.message || error.message);
        }
      }
    }
    
    console.log('\n🎉 Sample data creation complete!');
    console.log('\n📊 Summary:');
    console.log(`   Projects: ${createdProjects.length}`);
    console.log(`   Tasks: ${createdProjects.length * 4} (4 per project)`);
    console.log('\n💡 You can now test the calendar and timeline features with this sample data!');
    
  } catch (error) {
    console.error('❌ Failed to create sample data:', error.message);
  }
}

// Run the script
createSampleData();