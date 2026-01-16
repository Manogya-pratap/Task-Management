# API Documentation - Daily Activity Tracker

## Base URL
```
http://localhost:5000/api
```

---

## Authentication

All routes except `/auth/login` and `/auth/signup` require authentication.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

---

## 🆕 NEW ENDPOINTS (Phase 2)

### Departments

#### Get All Departments
```http
GET /api/departments
```
**Access:** All authenticated users

**Response:**
```json
{
  "status": "success",
  "results": 6,
  "data": {
    "departments": [
      {
        "_id": "...",
        "dept_name": "Design",
        "active_project": {...},
        "description": "..."
      }
    ]
  }
}
```

#### Get Department by ID
```http
GET /api/departments/:id
```

#### Get Department by Name
```http
GET /api/departments/name/:name
```
Example: `/api/departments/name/Mechanical`

#### Update Department
```http
PATCH /api/departments/:id
```
**Access:** ADMIN, MD only

**Body:**
```json
{
  "active_project": "project_id",
  "description": "Updated description"
}
```

#### Get Department Users
```http
GET /api/departments/:id/users
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "department": "Mechanical",
    "users": [...],
    "usersByRole": {
      "TEAM_LEAD": [...],
      "EMPLOYEE": [...]
    }
  }
}
```

#### Get Department Projects
```http
GET /api/departments/:id/projects
```

#### Get Department Statistics
```http
GET /api/departments/:id/stats
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "department": "Mechanical",
    "stats": {
      "users": 15,
      "projects": {
        "total": 10,
        "notStarted": 2,
        "inProgress": 5,
        "completed": 3
      },
      "tasks": {
        "requesting": 45,
        "executing": 38,
        "crossDepartment": 12
      }
    }
  }
}
```

---

### Task Logs (Daily Updates)

#### Create Daily Update
```http
POST /api/task-logs/task/:taskId
```

**Body:**
```json
{
  "progress": 75,
  "remark": "Completed motor installation, testing pending",
  "hours_worked": 4
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "taskLog": {
      "_id": "...",
      "task_id": "...",
      "updated_by": {...},
      "date": "2026-01-15",
      "progress": 75,
      "remark": "...",
      "hours_worked": 4
    },
    "task": {
      "_id": "...",
      "title": "...",
      "progress": 75
    }
  }
}
```

**Rules:**
- Can only submit one update per task per day
- Updates task progress automatically
- Creates TaskLog entry
- Emits WebSocket event

#### Get Task Logs
```http
GET /api/task-logs/task/:taskId?limit=30
```

#### Get Task Logs by Date Range
```http
GET /api/task-logs/task/:taskId/date-range?startDate=2026-01-01&endDate=2026-01-15
```

#### Get Task Progress History (for charts)
```http
GET /api/task-logs/task/:taskId/progress-history
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "task": {
      "_id": "...",
      "title": "...",
      "currentProgress": 75
    },
    "history": [
      {
        "date": "2026-01-10",
        "progress": 25,
        "updatedBy": "John Doe"
      },
      {
        "date": "2026-01-12",
        "progress": 50,
        "updatedBy": "John Doe"
      }
    ]
  }
}
```

#### Get My Daily Logs
```http
GET /api/task-logs/my-daily-logs?date=2026-01-15
```

#### Get Team Daily Logs
```http
GET /api/task-logs/team-daily-logs?date=2026-01-15
```
**Access:** TEAM_LEAD, MD, ADMIN only

#### Update Task Log
```http
PATCH /api/task-logs/:id
```
**Note:** Can only update today's log

#### Delete Task Log
```http
DELETE /api/task-logs/:id
```
**Access:** ADMIN, MD only

---

### Kanban Board

#### Get Kanban Board for Project
```http
GET /api/kanban/project/:projectId
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "project": {
      "_id": "...",
      "name": "Project Alpha",
      "progress": 65
    },
    "board": {
      "Backlog": [...tasks...],
      "Todo": [...tasks...],
      "In Progress": [...tasks...],
      "Review": [...tasks...],
      "Done": [...tasks...]
    },
    "stats": {
      "total": 25,
      "byStage": {
        "Backlog": 5,
        "Todo": 8,
        "In Progress": 7,
        "Review": 3,
        "Done": 2
      }
    }
  }
}
```

#### Move Task to Different Stage
```http
PATCH /api/kanban/task/:taskId/move
```

**Body:**
```json
{
  "newStage": "In Progress"
}
```

**Valid Stages:**
- `Backlog`
- `Todo`
- `In Progress`
- `Review`
- `Done`

**Rules:**
- Employees can move tasks freely (except Review → Done)
- Only TEAM_LEAD, MD, ADMIN can move Review → Done
- Moving to Review triggers approval request notification
- Moving to Done updates project progress

**Response:**
```json
{
  "status": "success",
  "data": {
    "task": {...},
    "movement": {
      "from": "Todo",
      "to": "In Progress"
    }
  }
}
```

#### Approve Task Completion
```http
POST /api/kanban/task/:taskId/approve
```
**Access:** TEAM_LEAD, MD, ADMIN only

**Action:** Moves task from Review → Done

**Response:**
```json
{
  "status": "success",
  "message": "Task approved and marked as complete",
  "data": {
    "task": {...},
    "project": {
      "_id": "...",
      "name": "...",
      "progress": 70
    }
  }
}
```

#### Reject Task
```http
POST /api/kanban/task/:taskId/reject
```
**Access:** TEAM_LEAD, MD, ADMIN only

**Body:**
```json
{
  "reason": "Testing incomplete, please verify all test cases"
}
```

**Action:** Moves task from Review → In Progress

#### Get Tasks by Stage
```http
GET /api/kanban/stage/:stage?projectId=...&deptId=...
```

Example: `/api/kanban/stage/Review?projectId=123`

#### Get Pending Approvals
```http
GET /api/kanban/pending-approvals
```
**Access:** TEAM_LEAD, MD, ADMIN only

**Response:** All tasks in Review stage

---

## WebSocket Events

### Client → Server

#### Join Rooms
```javascript
socket.emit('join-room', {
  userId: 'user123',
  role: 'TEAM_LEAD',
  deptId: 'dept456',
  projectId: 'proj789'
});
```

### Server → Client

#### Task Events
```javascript
// Task updated
socket.on('task-updated', (task) => {
  console.log('Task updated:', task);
});

// Kanban moved
socket.on('kanban-moved', ({ task, oldStage, newStage, timestamp }) => {
  console.log(`Task moved from ${oldStage} to ${newStage}`);
});

// Task assigned
socket.on('task-assigned', ({ task, message, timestamp }) => {
  console.log('New task assigned:', message);
});

// Daily update added
socket.on('daily-update-added', ({ taskLog, task, timestamp }) => {
  console.log('Daily update added:', taskLog);
});

// Approval requested
socket.on('approval-requested', ({ task, message, timestamp }) => {
  console.log('Approval needed:', message);
});
```

#### Project Events
```javascript
// Project updated
socket.on('project-updated', (project) => {
  console.log('Project updated:', project);
});

// Progress updated
socket.on('project-progress-updated', ({ project, oldProgress, newProgress, timestamp }) => {
  console.log(`Progress: ${oldProgress}% → ${newProgress}%`);
});

// Project created
socket.on('project-created', ({ project, message, timestamp }) => {
  console.log('New project:', message);
});

// Project completed
socket.on('project-completed', ({ project, message, timestamp }) => {
  console.log('Project completed:', message);
});
```

---

## Workflow Examples

### 1. Employee Daily Update Flow
```javascript
// 1. Employee submits daily update
POST /api/task-logs/task/task123
{
  "progress": 60,
  "remark": "Completed design review",
  "hours_worked": 3
}

// 2. System creates TaskLog entry
// 3. Updates task progress to 60%
// 4. Emits WebSocket event 'daily-update-added'
// 5. Team Lead receives notification
```

### 2. Kanban Task Movement Flow
```javascript
// 1. Employee moves task to Review
PATCH /api/kanban/task/task123/move
{
  "newStage": "Review"
}

// 2. System emits 'kanban-moved' event
// 3. System emits 'approval-requested' to Team Leads
// 4. Team Lead sees task in pending approvals

// 5. Team Lead approves
POST /api/kanban/task/task123/approve

// 6. Task moves to Done
// 7. Project progress recalculated
// 8. WebSocket events emitted
```

### 3. Cross-Department Task Flow
```javascript
// 1. Mechanical Team Lead creates task for Vendor
POST /api/tasks
{
  "title": "Procure motors",
  "project_id": "proj123",
  "assigned_to": "vendor_employee_id",
  "req_dept_id": "mechanical_dept_id",
  "exec_dept_id": "vendor_dept_id",
  "kanban_stage": "Backlog"
}

// 2. Task visible to:
//    - Mechanical department (requesting)
//    - Vendor department (executing)
//    - MD (all tasks)

// 3. Vendor employee updates progress
POST /api/task-logs/task/task123
{
  "progress": 50,
  "remark": "Motors ordered, delivery in 2 days"
}

// 4. Both departments see update in real-time
```

---

## Error Responses

### 400 Bad Request
```json
{
  "status": "fail",
  "message": "Invalid Kanban stage"
}
```

### 401 Unauthorized
```json
{
  "status": "fail",
  "message": "Unauthorized. Please log in."
}
```

### 403 Forbidden
```json
{
  "status": "fail",
  "message": "Only Team Lead can approve task completion"
}
```

### 404 Not Found
```json
{
  "status": "fail",
  "message": "Task not found"
}
```

### 500 Server Error
```json
{
  "status": "error",
  "message": "Something went wrong!"
}
```

---

## Role-Based Access Summary

| Endpoint | ADMIN | MD | TEAM_LEAD | EMPLOYEE |
|----------|-------|----|-----------| ---------|
| GET /departments | ✅ | ✅ | ✅ | ✅ |
| PATCH /departments/:id | ✅ | ✅ | ❌ | ❌ |
| POST /task-logs/task/:id | ✅ | ✅ | ✅ | ✅ (own tasks) |
| GET /task-logs/team-daily-logs | ✅ | ✅ | ✅ | ❌ |
| PATCH /kanban/task/:id/move | ✅ | ✅ | ✅ | ✅ (own tasks) |
| POST /kanban/task/:id/approve | ✅ | ✅ | ✅ | ❌ |
| GET /kanban/pending-approvals | ✅ | ✅ | ✅ | ❌ |

---

## Testing with cURL

### Create Daily Update
```bash
curl -X POST http://localhost:5000/api/task-logs/task/TASK_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "progress": 75,
    "remark": "Completed testing phase",
    "hours_worked": 4
  }'
```

### Move Task in Kanban
```bash
curl -X PATCH http://localhost:5000/api/kanban/task/TASK_ID/move \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "newStage": "Review"
  }'
```

### Approve Task
```bash
curl -X POST http://localhost:5000/api/kanban/task/TASK_ID/approve \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

**Phase 2 API Complete ✅**
**Total New Endpoints: 25+**
**WebSocket Events: 10**
