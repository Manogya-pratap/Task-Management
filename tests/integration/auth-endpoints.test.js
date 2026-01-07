const request = require('supertest');
const app = require('../../server/app');
const User = require('../../server/models/User');

describe('Authentication Endpoints', () => {
  let testUser;
  let authToken;

  beforeEach(async () => {
    // Create a test user
    testUser = await User.createUser({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123',
      firstName: 'Test',
      lastName: 'User',
      role: 'employee',
      department: 'IT'
    });
  });

  afterEach(async () => {
    // Clean up test data
    await User.deleteMany({});
  });

  describe('POST /api/auth/signup', () => {
    test('should create a new user with valid data', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'Password123',
        firstName: 'New',
        lastName: 'User',
        role: 'employee',
        department: 'HR'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.token).toBeDefined();
      expect(response.body.data.user.username).toBe(userData.username);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.password).toBeUndefined();
    });

    test('should reject signup with invalid email', async () => {
      const userData = {
        username: 'invaliduser',
        email: 'invalid-email',
        password: 'Password123',
        firstName: 'Invalid',
        lastName: 'User',
        department: 'IT'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Validation failed');
    });

    test('should reject signup with duplicate username', async () => {
      const userData = {
        username: 'testuser', // Same as existing user
        email: 'different@example.com',
        password: 'Password123',
        firstName: 'Different',
        lastName: 'User',
        department: 'IT'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('already exists');
    });

    test('should reject signup with weak password', async () => {
      const userData = {
        username: 'weakpassuser',
        email: 'weak@example.com',
        password: 'weak',
        firstName: 'Weak',
        lastName: 'User',
        department: 'IT'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('POST /api/auth/login', () => {
    test('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'Password123'
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.token).toBeDefined();
      expect(response.body.data.user.username).toBe('testuser');
      expect(response.body.data.user.password).toBeUndefined();

      authToken = response.body.token;
    });

    test('should login with email instead of username', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'test@example.com', // Using email as username
          password: 'Password123'
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.token).toBeDefined();
    });

    test('should reject login with invalid username', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'Password123'
        })
        .expect(401);

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Incorrect username or password');
    });

    test('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Incorrect username or password');
    });

    test('should reject login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body.status).toBe('fail');
    });

    test('should reject login for inactive user', async () => {
      // Deactivate user
      testUser.isActive = false;
      await testUser.save();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'Password123'
        })
        .expect(401);

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Incorrect username or password');
    });
  });

  describe('POST /api/auth/logout', () => {
    test('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Logged out successfully');
    });
  });

  describe('GET /api/auth/verify', () => {
    beforeEach(async () => {
      // Login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'Password123'
        });
      authToken = loginResponse.body.token;
    });

    test('should verify valid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.isValid).toBe(true);
      expect(response.body.user.username).toBe('testuser');
    });

    test('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);

      expect(response.body.status).toBe('fail');
      expect(response.body.isValid).toBe(false);
    });

    test('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .expect(401);

      expect(response.body.status).toBe('fail');
      expect(response.body.isValid).toBe(false);
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    beforeEach(async () => {
      // Login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'Password123'
        });
      authToken = loginResponse.body.token;
    });

    test('should refresh valid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.token).toBeDefined();
      // Note: Token might be the same if still valid, which is acceptable behavior
    });

    test('should reject refresh with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);

      expect(response.body.status).toBe('fail');
    });
  });

  describe('GET /api/auth/me', () => {
    beforeEach(async () => {
      // Login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'Password123'
        });
      authToken = loginResponse.body.token;
    });

    test('should get current user profile', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user.username).toBe('testuser');
      expect(response.body.data.user.password).toBeUndefined();
    });

    test('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.status).toBe('fail');
    });
  });

  describe('PATCH /api/auth/update-password', () => {
    beforeEach(async () => {
      // Login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'Password123'
        });
      authToken = loginResponse.body.token;
    });

    test('should update password with valid data', async () => {
      const response = await request(app)
        .patch('/api/auth/update-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'Password123',
          newPassword: 'NewPassword123',
          confirmPassword: 'NewPassword123'
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.token).toBeDefined();

      // Verify old password no longer works
      await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'Password123'
        })
        .expect(401);

      // Verify new password works
      await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'NewPassword123'
        })
        .expect(200);
    });

    test('should reject password update with wrong current password', async () => {
      const response = await request(app)
        .patch('/api/auth/update-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'WrongPassword',
          newPassword: 'NewPassword123',
          confirmPassword: 'NewPassword123'
        })
        .expect(401);

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Your current password is incorrect');
    });

    test('should reject password update without authentication', async () => {
      const response = await request(app)
        .patch('/api/auth/update-password')
        .send({
          currentPassword: 'Password123',
          newPassword: 'NewPassword123',
          confirmPassword: 'NewPassword123'
        })
        .expect(401);

      expect(response.body.status).toBe('fail');
    });
  });
});