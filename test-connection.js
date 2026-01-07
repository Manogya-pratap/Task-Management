const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('Testing MongoDB connection...');
console.log('MONGODB_URI:', process.env.MONGODB_URI);

const connectDB = async () => {
  try {
    const connectionString = 'mongodb+srv://mpsingh1932000_db_user:SjdO4YMSoN3s0Nr2@task-management.4t1yxy0.mongodb.net/?appName=task-management';
    console.log('Connection string length:', connectionString ? connectionString.length : 0);
    console.log('Attempting to connect...');
    
    const conn = await mongoose.connect(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    process.exit(0);
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};

connectDB();