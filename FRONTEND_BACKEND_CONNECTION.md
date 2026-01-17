# 🔗 Frontend-Backend Connection Guide

## 🎯 **WHERE THE CONNECTION HAPPENS**

Your React frontend connects to the Express backend in **3 main places**:

### 1️⃣ **HTTP API Calls** (REST API)
### 2️⃣ **WebSocket Connection** (Real-time)
### 3️⃣ **Authentication System** (JWT)

---

## 📡 **1. HTTP API CONNECTION**

### **File:** `client/src/services/api.js`
```javascript
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
  withCredentials: true,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});
```

### **How it works:**
- **Development:** `http://localhost:5000/api`
- **Production:** `https://your-app.onrender.com/api`
- **Used for:** Login, CRUD operations, data fetching

### **Example API Calls:**
```javascript
// Login
api.post("/auth/login", credentials)

// Get users
api.get("/users")

// Create project
api.post("/projects", projectData)

// Update task
api.put("/tasks/123", taskData)
```

---

## ⚡ **2. WEBSOCKET CONNECTION**

### **File:** `client/src/contexts/SocketContext.jsx`
```javascript
const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
const socketInstance = io(socketUrl, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
  autoConnect: true
});
```

### **How it works:**
- **Development:** `http://localhost:5000`
- **Production:** `https://your-app.onrender.com`
- **Used for:** Real-time updates, notifications, live data

### **Example Socket Events:**
```javascript
// Join rooms for real-time updates
socket.emit('join-room', { userId, role, deptId, projectId });

// Listen for task updates
socket.on('task-updated', (data) => {
  // Update UI in real-time
});
```

---

## 🔐 **3. AUTHENTICATION CONNECTION**

### **File:** `client/src/services/authService.js`
```javascript
// Login to backend
async login(credentials) {
  const response = await api.post("/auth/login", credentials);
  // Store JWT token
  localStorage.setItem("token", token);
}

// Verify token with backend
async verifyToken() {
  const response = await api.get("/auth/verify");
  return response.data;
}
```

### **How it works:**
- Frontend sends credentials to `/api/auth/login`
- Backend returns JWT token
- Frontend stores token and sends it with every request
- Backend verifies token for protected routes

---

## 🏗️ **CONNECTION ARCHITECTURE**

```
┌─────────────────────────────────────────────────────────────┐
│                    REACT FRONTEND                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   HTTP API      │  │   WebSocket     │  │    Auth     │ │
│  │   (api.js)      │  │ (SocketContext) │  │ (authService│ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   EXPRESS BACKEND                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   REST API      │  │   Socket.IO     │  │  JWT Auth   │ │
│  │   (/api/*)      │  │   (WebSocket)   │  │ Middleware  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    MONGODB DATABASE                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 **CONNECTION CONFIGURATION**

### **Environment Variables:**

#### **Development (.env):**
```bash
# Backend serves on port 5000
PORT=5000

# Frontend connects to backend
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000

# Backend allows frontend
CLIENT_URL=http://localhost:3000
```

#### **Production (Render):**
```bash
# Backend serves on port 10000
PORT=10000

# Frontend connects to production backend
REACT_APP_API_URL=https://your-app.onrender.com/api
REACT_APP_SOCKET_URL=https://your-app.onrender.com

# Backend allows production frontend
CLIENT_URL=https://your-app.onrender.com
```

---

## 📋 **CONNECTION FLOW**

### **1. App Startup:**
```javascript
// App.js wraps everything with providers
<AuthProvider>          // Manages authentication
  <SocketProvider>       // Manages WebSocket connection
    <AppProvider>        // Manages app state
      <AppContent />     // Your app components
    </AppProvider>
  </SocketProvider>
</AuthProvider>
```

### **2. Authentication Flow:**
```
1. User enters credentials
2. Frontend → POST /api/auth/login → Backend
3. Backend validates & returns JWT token
4. Frontend stores token in localStorage
5. Frontend sends token with every API request
6. Backend verifies token for protected routes
```

### **3. API Request Flow:**
```
1. Component needs data
2. Component calls service (e.g., userService.getUsers())
3. Service uses api.js to make HTTP request
4. api.js adds JWT token to request headers
5. Backend receives request, verifies token
6. Backend processes request & returns data
7. Frontend receives data & updates UI
```

### **4. Real-time Updates Flow:**
```
1. Frontend connects to WebSocket on app load
2. User joins rooms based on role/department
3. Backend emits events when data changes
4. Frontend receives events & updates UI
5. No page refresh needed - live updates!
```

---

## 🔍 **WHERE TO FIND CONNECTIONS IN CODE**

### **Frontend Connection Points:**

| File | Purpose | Connects To |
|------|---------|-------------|
| `client/src/services/api.js` | HTTP API calls | `http://localhost:5000/api` |
| `client/src/contexts/SocketContext.jsx` | WebSocket | `http://localhost:5000` |
| `client/src/services/authService.js` | Authentication | `/api/auth/*` endpoints |
| `client/src/services/userService.js` | User operations | `/api/users/*` endpoints |
| `client/src/services/projectService.js` | Project operations | `/api/projects/*` endpoints |
| `client/src/services/taskService.js` | Task operations | `/api/tasks/*` endpoints |

### **Backend Connection Points:**

| File | Purpose | Serves |
|------|---------|--------|
| `server/index.js` | Main server entry | HTTP + WebSocket server |
| `server/app.js` | Express app config | REST API routes |
| `server/config/socket.js` | WebSocket config | Real-time connections |
| `server/routes/auth.js` | Auth endpoints | `/api/auth/*` |
| `server/routes/users.js` | User endpoints | `/api/users/*` |
| `server/routes/projects.js` | Project endpoints | `/api/projects/*` |

---

## 🌐 **DEPLOYMENT CONNECTION**

### **Development (localhost):**
```
Frontend (React): http://localhost:3000
Backend (Express): http://localhost:5000
Database (MongoDB): Cloud Atlas
```

### **Production (Render):**
```
Frontend + Backend: https://your-app.onrender.com
Database (MongoDB): Cloud Atlas
```

**Note:** In production, the Express server serves both the API and the React build files from the same domain.

---

## 🔧 **TESTING CONNECTIONS**

### **Check API Connection:**
```javascript
// In browser console
console.log('API URL:', process.env.REACT_APP_API_URL);

// Test API call
fetch(process.env.REACT_APP_API_URL + '/health')
  .then(r => r.json())
  .then(console.log);
```

### **Check WebSocket Connection:**
```javascript
// In browser console
console.log('Socket URL:', process.env.REACT_APP_SOCKET_URL);

// Check socket status in SocketContext
// Look for "✅ Socket connected" in console
```

### **Check Backend Health:**
```bash
# Development
curl http://localhost:5000/api/health

# Production
curl https://your-app.onrender.com/api/health
```

---

## 🎯 **SUMMARY**

### **Connection Points:**
1. **HTTP API** - `client/src/services/api.js` → `server/app.js` routes
2. **WebSocket** - `client/src/contexts/SocketContext.jsx` → `server/config/socket.js`
3. **Authentication** - `client/src/services/authService.js` → `server/routes/auth.js`

### **Environment Variables Control:**
- `REACT_APP_API_URL` - Where frontend sends API requests
- `REACT_APP_SOCKET_URL` - Where frontend connects WebSocket
- `CLIENT_URL` - What backend allows for CORS

### **Key Files:**
- **Frontend:** `api.js`, `SocketContext.jsx`, `authService.js`
- **Backend:** `index.js`, `app.js`, `socket.js`

Your frontend and backend are properly connected through these three channels, allowing for complete functionality including authentication, data operations, and real-time updates! 🚀