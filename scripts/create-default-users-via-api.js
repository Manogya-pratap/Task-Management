#!/usr/bin/env node

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function createDefaultUsers() {
  try {
    console.log('🔍 Checking API health...');
    
    // Check API health
    const healthResponse = await axios.get(`${API_BASE}/health`);
    console.log('✅ API is running:', healthResponse.data.message);
    
    // Check database health
    try {
      const dbHealthResponse = await axios.get(`${API_BASE}/health/db`);
      console.log('✅ Database connected:', dbHealthResponse.data.database);
    } catch (dbError) {
      console.log('❌ Database connection issue:', dbError.response?.data || dbError.message);
      return;
    }
    
    // Default users to create
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
    
    console.log('\n🔧 Creating default users via API...');
    
    for (const userData of defaultUsers) {
      try {
        const response = await axios.post(`${API_BASE}/auth/signup`, userData);
        console.log(`✅ Created user: ${userData.username} (${userData.role})`);
      } catch (error) {
        if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
          console.log(`⚠️  User ${userData.username} already exists`);
        } else {
          console.log(`❌ Failed to create user ${userData.username}:`, error.response?.data?.message || error.message);
        }
      }
    }
    
    console.log('\n🎉 User creation complete!');
    console.log('\n🔑 Default Login Credentials:');
    console.log('   Managing Director: admin / Admin123');
    console.log('   Team Lead: teamlead / TeamLead123');
    console.log('   Employee: employee / Employee123');
    
  } catch (error) {
    console.error('❌ API connection failed:', error.message);
    console.log('\n💡 Make sure the server is running: npm start');
  }
}

// Run the script
createDefaultUsers();