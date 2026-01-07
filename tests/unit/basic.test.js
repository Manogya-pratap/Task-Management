describe('Basic Setup Tests', () => {
  test('Environment variables are loaded', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.JWT_SECRET).toBe('test-jwt-secret');
  });

  test('Required dependencies are available', () => {
    const express = require('express');
    const mongoose = require('mongoose');
    const bcrypt = require('bcryptjs');
    const jwt = require('jsonwebtoken');
    
    expect(express).toBeDefined();
    expect(mongoose).toBeDefined();
    expect(bcrypt).toBeDefined();
    expect(jwt).toBeDefined();
  });

  test('Server module can be imported', () => {
    const app = require('../../server/app');
    expect(app).toBeDefined();
    expect(typeof app).toBe('function'); // Express app is a function
  });
});