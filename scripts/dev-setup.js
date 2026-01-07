#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Daily Activity Tracker development environment...\n');

// Check if .env exists, if not copy from .env.example
if (!fs.existsSync('.env')) {
  if (fs.existsSync('.env.example')) {
    fs.copyFileSync('.env.example', '.env');
    console.log('✅ Created .env file from .env.example');
  } else {
    console.log('⚠️  .env.example not found, please create .env manually');
  }
} else {
  console.log('✅ .env file already exists');
}

// Create necessary directories
const directories = [
  'server/models',
  'server/routes',
  'server/middleware',
  'server/controllers',
  'server/utils',
  'client/src/components',
  'client/src/contexts',
  'client/src/hooks',
  'client/src/services',
  'client/src/utils',
  'tests/unit',
  'tests/integration',
  'tests/property'
];

directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

console.log('\n🎉 Development environment setup complete!');
console.log('\nNext steps:');
console.log('1. Install dependencies: npm install');
console.log('2. Install client dependencies: cd client && npm install');
console.log('3. Start development: npm run dev');
console.log('4. Make sure MongoDB is running on your system');