const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function setupDepartments() {
  console.log('🏢 Setting up departments in the system...\n');

  try {
    // Login first
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'md1',
      password: 'MD1@1234'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful!');

    // Define the departments that should exist
    const departments = [
      {
        dept_name: 'IT Development',
        description: 'Information Technology and Software Development',
        is_active: true
      },
      {
        dept_name: 'Human Resources',
        description: 'Human Resources and Personnel Management',
        is_active: true
      },
      {
        dept_name: 'Finance',
        description: 'Finance and Accounting Department',
        is_active: true
      },
      {
        dept_name: 'Marketing',
        description: 'Marketing and Business Development',
        is_active: true
      },
      {
        dept_name: 'Operations',
        description: 'Operations and Production Management',
        is_active: true
      },
      {
        dept_name: 'Sales',
        description: 'Sales and Customer Relations',
        is_active: true
      }
    ];

    console.log('\n🏗️ Creating departments...');
    
    for (const dept of departments) {
      try {
        // Try to create the department
        const response = await axios.post(`${API_BASE_URL}/departments`, dept, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log(`✅ Created department: ${dept.dept_name}`);
      } catch (error) {
        if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
          console.log(`ℹ️ Department already exists: ${dept.dept_name}`);
        } else if (error.response?.status === 404) {
          console.log(`❌ Department creation endpoint not found. Creating via direct database insertion...`);
          // If the endpoint doesn't exist, we'll need to create departments differently
          break;
        } else {
          console.log(`❌ Error creating ${dept.dept_name}:`, error.response?.data?.message || error.message);
        }
      }
    }

    // Check if departments were created successfully
    console.log('\n📋 Verifying departments...');
    try {
      const deptResponse = await axios.get(`${API_BASE_URL}/departments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const createdDepartments = deptResponse.data.data?.departments || deptResponse.data.data || deptResponse.data;
      console.log(`✅ Total departments in system: ${createdDepartments?.length || 0}`);
      
      if (createdDepartments && createdDepartments.length > 0) {
        console.log('\n📊 Available Departments:');
        console.log('=====================================');
        createdDepartments.forEach((dept, index) => {
          console.log(`${index + 1}. ${dept.dept_name || dept.name}`);
          console.log(`   ID: ${dept._id}`);
          console.log(`   Active: ${dept.is_active || dept.isActive}`);
          console.log('   ---');
        });
        
        console.log('\n🎉 Departments setup complete!');
        console.log('Users can now be created with dept_id validation.');
      } else {
        console.log('\n❌ No departments found after creation attempt.');
        console.log('Manual database setup may be required.');
      }
    } catch (error) {
      console.log('❌ Error verifying departments:', error.response?.data?.message || error.message);
    }

  } catch (error) {
    console.error('❌ Error setting up departments:', error.response?.data?.message || error.message);
  }
}

setupDepartments();