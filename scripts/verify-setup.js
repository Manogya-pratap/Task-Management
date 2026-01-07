#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Daily Activity Tracker setup...\n');

const checks = [
  {
    name: 'Root package.json exists',
    check: () => fs.existsSync('package.json'),
  },
  {
    name: 'Client package.json exists',
    check: () => fs.existsSync('client/package.json'),
  },
  {
    name: 'Server entry point exists',
    check: () => fs.existsSync('server/index.js'),
  },
  {
    name: 'Server app module exists',
    check: () => fs.existsSync('server/app.js'),
  },
  {
    name: 'Environment configuration exists',
    check: () => fs.existsSync('.env'),
  },
  {
    name: 'Database configuration exists',
    check: () => fs.existsSync('server/config/database.js'),
  },
  {
    name: 'Jest configuration exists',
    check: () => fs.existsSync('jest.config.js'),
  },
  {
    name: 'Test setup files exist',
    check: () => fs.existsSync('tests/setup.js') && fs.existsSync('tests/env-setup.js'),
  },
  {
    name: 'Client React app exists',
    check: () => fs.existsSync('client/src/App.js'),
  },
  {
    name: 'Client test setup exists',
    check: () => fs.existsSync('client/src/setupTests.js'),
  },
  {
    name: 'Directory structure created',
    check: () => {
      const dirs = [
        'server/models', 'server/routes', 'server/middleware', 'server/controllers',
        'client/src/components', 'client/src/contexts', 'client/src/services',
        'tests/unit', 'tests/integration', 'tests/property'
      ];
      return dirs.every(dir => fs.existsSync(dir));
    },
  },
];

let passed = 0;
let failed = 0;

checks.forEach(({ name, check }) => {
  try {
    if (check()) {
      console.log(`✅ ${name}`);
      passed++;
    } else {
      console.log(`❌ ${name}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ ${name} (Error: ${error.message})`);
    failed++;
  }
});

console.log(`\n📊 Setup Verification Results:`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);

if (failed === 0) {
  console.log('\n🎉 All setup checks passed! Your development environment is ready.');
  console.log('\nNext steps:');
  console.log('1. Start MongoDB service on your system');
  console.log('2. Run: npm run dev (to start both backend and frontend)');
  console.log('3. Open http://localhost:3000 in your browser');
  console.log('4. Begin implementing the next task in the task list');
} else {
  console.log('\n⚠️  Some setup checks failed. Please review and fix the issues above.');
  process.exit(1);
}