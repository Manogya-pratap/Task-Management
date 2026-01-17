# 📁 .env File Structure - Complete Guide

## 🎯 **SINGLE .env FILE SETUP**

Your project uses **ONE .env file** in the **root directory** that serves both server and client:

```
project-root/
├── .env                 ✅ SINGLE FILE (both server + client)
├── .env.example         ✅ PRODUCTION TEMPLATE
├── server/              ✅ BACKEND (reads root .env)
│   ├── index.js         ✅ Loads: require("dotenv").config()
│   └── app.js
├── client/              ✅ FRONTEND (reads root .env automatically)
│   ├── src/
│   └── package.json
└── package.json
```

---

## 🔧 **HOW IT WORKS**

### Server (Node.js/Express):
- Reads `.env` from root via: `require("dotenv").config({ path: "../.env" })`
- Uses variables directly: `process.env.MONGODB_URI`

### Client (React):
- Automatically reads `.env` from root directory
- Only reads variables prefixed with `REACT_APP_`
- Uses variables: `process.env.REACT_APP_API_URL`

---

## 📝 **CURRENT .env FILE STRUCTURE**

Your updated `.env` file now contains:

### 🖥️ **SERVER VARIABLES** (Backend):
```bash
# Server Environment
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret
CLIENT_URL=http://localhost:3000
# ... other server configs
```

### 🌐 **CLIENT VARIABLES** (Frontend):
```bash
# React App Variables (must start with REACT_APP_)
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
REACT_APP_NODE_ENV=development
REACT_APP_APP_NAME=Daily Activity Tracker
```

---

## 🔍 **VARIABLE USAGE IN CODE**

### Server Usage (`server/index.js`):
```javascript
// Server reads all variables
const PORT = process.env.PORT || 5000;
const mongoUri = process.env.MONGODB_URI;
const jwtSecret = process.env.JWT_SECRET;
```

### Client Usage (`client/src/services/api.js`):
```javascript
// Client only reads REACT_APP_ variables
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api"
});
```

### Client Usage (`client/src/contexts/SocketContext.jsx`):
```javascript
// Socket connection
const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
const socketInstance = io(socketUrl);
```

---

## 🌍 **ENVIRONMENT-SPECIFIC CONFIGURATIONS**

### 🏠 **LOCALHOST (.env)**
```bash
# SERVER
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://...your-dev-db...
CLIENT_URL=http://localhost:3000

# CLIENT
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
REACT_APP_NODE_ENV=development
```

### 🚀 **PRODUCTION (Render Environment Variables)**
```bash
# SERVER
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://...your-prod-db...
CLIENT_URL=https://your-app.onrender.com

# CLIENT
REACT_APP_API_URL=https://your-app.onrender.com/api
REACT_APP_SOCKET_URL=https://your-app.onrender.com
REACT_APP_NODE_ENV=production
```

---

## ⚠️ **IMPORTANT RULES**

### ✅ **DO:**
- Keep ONE .env file in root directory
- Use `REACT_APP_` prefix for client variables
- Never commit .env to git (already in .gitignore)
- Use .env.example as template

### ❌ **DON'T:**
- Create separate .env files in server/ or client/
- Use server variables in client code
- Commit secrets to git
- Forget REACT_APP_ prefix for client variables

---

## 🔄 **DEPLOYMENT PROCESS**

### 1. **Local Development:**
- Use `.env` file in root
- Contains development values
- Both server and client read from same file

### 2. **Production (Render):**
- Set environment variables in Render dashboard
- No .env file needed on server
- Same variable names, production values

---

## 🛠️ **TESTING YOUR SETUP**

### Test Server Variables:
```bash
# In server code, add console.log
console.log('MongoDB URI:', process.env.MONGODB_URI);
console.log('JWT Secret:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
```

### Test Client Variables:
```bash
# In client code, add console.log
console.log('API URL:', process.env.REACT_APP_API_URL);
console.log('Socket URL:', process.env.REACT_APP_SOCKET_URL);
```

---

## 📊 **VARIABLE SUMMARY**

| Variable | Used By | Purpose |
|----------|---------|---------|
| `NODE_ENV` | Server | Environment mode |
| `PORT` | Server | Server port |
| `MONGODB_URI` | Server | Database connection |
| `JWT_SECRET` | Server | Authentication |
| `CLIENT_URL` | Server | CORS configuration |
| `REACT_APP_API_URL` | Client | API endpoint |
| `REACT_APP_SOCKET_URL` | Client | WebSocket connection |
| `REACT_APP_NODE_ENV` | Client | Environment mode |

---

## 🎯 **FINAL ANSWER**

### **Server .env file:** 
- Location: `project-root/.env`
- Contains: All server variables (NODE_ENV, MONGODB_URI, JWT_SECRET, etc.)

### **Client .env file:** 
- Location: **SAME FILE** `project-root/.env`
- Contains: Variables prefixed with `REACT_APP_`

### **Key Point:**
**There is only ONE .env file** in the root directory that serves both server and client. The client automatically reads variables that start with `REACT_APP_`, while the server reads all variables.

---

## ✅ **YOUR CURRENT SETUP IS CORRECT**

Your `.env` file is now properly configured with both server and client variables in a single file at the root level. This is the standard and recommended approach for MERN stack applications.