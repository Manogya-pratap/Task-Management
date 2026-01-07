const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('Testing environment loading from server directory...');
console.log('Current directory:', __dirname);
console.log('Env file path:', path.join(__dirname, '../.env'));
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('MONGODB_URI length:', process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 0);