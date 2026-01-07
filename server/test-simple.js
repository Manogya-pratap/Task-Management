const express = require('express');
const cors = require('cors');

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// Auth test route
app.post('/api/auth/login', (req, res) => {
  res.json({ 
    status: 'success',
    message: 'Login endpoint working',
    token: 'test-token',
    data: { user: { username: 'test' } }
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});