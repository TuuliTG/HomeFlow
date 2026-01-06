# HomeFlow Backend

Backend API server for the HomeFlow task management system.

## Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- PostgreSQL (via Docker)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment configuration:
```bash
cp .env.example .env
```

3. Start PostgreSQL database:
```bash
docker-compose up -d postgres
```

4. Run database migrations:
```bash
npm run migrate:up
```

5. Start the development server:
```bash
npm run dev
```

## Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run migrate:up` - Run database migrations
- `npm run migrate:down` - Rollback database migrations
- `npm run migrate:create <name>` - Create new migration
- `npm run lint` - Run ESLint

## Database Management

### Start Database
```bash
docker-compose up -d postgres
```

### Stop Database
```bash
docker-compose down
```

### Reset Database (Clean State)
```bash
docker-compose down -v --remove-orphans
docker-compose up -d postgres
npm run migrate:up
```

### Create Migration
```bash
npm run migrate:create create_tasks_table
```

## API Endpoints

### Health Check
- `GET /api/health` - Server health status

### Tasks (Coming Soon)
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create new task
- `GET /api/tasks/:id` - Get task by ID
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `PATCH /api/tasks/:id/claim` - Claim task
- `PATCH /api/tasks/:id/unclaim` - Unclaim task
- `PATCH /api/tasks/:id/complete` - Complete task

## Project Structure

```
src/
├── app.js              # Main application entry point
├── config/
│   └── database.js     # Database configuration
├── routes/             # API route handlers
├── services/           # Business logic services
├── models/             # Data models
├── middleware/         # Custom middleware
└── utils/
    └── logger.js       # Logging configuration
migrations/             # Database migrations
tests/                  # Test files
logs/                   # Application logs
```

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `TEST_DATABASE_URL` - Test database connection string
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/test/production)
- `LOG_LEVEL` - Logging level (debug/info/warn/error)

## Testing

Run tests with:
```bash
npm test
```

For test database setup:
```bash
docker-compose up -d postgres-test
```