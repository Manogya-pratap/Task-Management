# Daily Activity Tracker

A comprehensive project management system for Yantrik Automation Pvt. Ltd. built with the MERN stack (MongoDB, Express.js, React, Node.js).

## Features

- Role-based authentication (MD, IT Admin, Team Lead, Employee)
- Project and task management with Kanban boards
- Timeline visualization and calendar integration
- Real-time status tracking
- Responsive design with maroon branding
- Secure data handling and audit logging

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (v5 or higher)
- npm or yarn package manager

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd daily-activity-tracker
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd client
   npm install
   cd ..
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` file with your configuration values.

5. **Run development setup script**
   ```bash
   node scripts/dev-setup.js
   ```

## Development

### Start the development servers

```bash
# Start both backend and frontend concurrently
npm run dev

# Or start them separately:
# Backend only
npm run server

# Frontend only (in another terminal)
npm run client
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run frontend tests
cd client && npm test
```

## Project Structure

```
daily-activity-tracker/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # API services
│   │   └── utils/          # Utility functions
│   └── package.json
├── server/                 # Express backend
│   ├── config/             # Configuration files
│   ├── controllers/        # Route controllers
│   ├── middleware/         # Custom middleware
│   ├── models/             # Mongoose models
│   ├── routes/             # API routes
│   ├── utils/              # Utility functions
│   └── index.js            # Server entry point
├── tests/                  # Test files
│   ├── integration/        # Integration tests
│   ├── property/           # Property-based tests
│   └── unit/               # Unit tests
├── scripts/                # Development scripts
└── package.json            # Root package.json
```

## API Endpoints

### Health Check
- `GET /api/health` - Server health status

### Authentication (Coming Soon)
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Verify token

### Users (Coming Soon)
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

### Projects (Coming Soon)
- `GET /api/projects` - Get projects
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project

### Tasks (Coming Soon)
- `GET /api/tasks` - Get tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `PATCH /api/tasks/:id/status` - Update task status

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/daily-activity-tracker` |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRE` | JWT expiration time | `7d` |
| `CLIENT_URL` | Frontend URL | `http://localhost:3000` |

## Contributing

1. Follow the existing code style and conventions
2. Write tests for new features
3. Update documentation as needed
4. Use meaningful commit messages

## License

MIT License - see LICENSE file for details

## Support

For support, contact the development team at Yantrik Automation Pvt. Ltd.