# streaming LIVE - Video Streaming Platform API

This is a Node.js/Express API project for streaming LIVE, a high-performance real-time video streaming platform designed to support **20,000+ concurrent users** with dual 1080p high-definition video streams.

## Project Overview

streaming LIVE is a scalable video streaming platform with the following user roles:

1. **Admin** - Manages the platform, users, content, and system settings
2. **Streamers** - Content creators who broadcast live video streams
3. **Users** - Viewers who watch streams and interact with streamers

The platform supports:

- Real-time video streaming with dual 1080p HD streams
- User management and authentication
- Membership plans and credit system
- CMS (Content Management System) for managing site content
- Email templates management
- FAQ management
- Security monitoring and alerts

## Requirements

Below requirements must be fulfilled in order to run the project successfully:

### For Local Development:

- **Node.js** version **24.0.0** or above (check with `node --version`)
- **NPM** must be installed and version must be equal or above **v10.0.0** (check with `npm --version`)
- **PostgreSQL** version **12.0** or above
- **TypeScript** (installed via npm)

### For Docker Deployment:

- **Docker** version **20.10** or above
- **Docker Compose** version **2.0** or above
- **PostgreSQL** (can be on host or in separate container)

## PostgreSQL Installation

**download from official website**:

- Visit: https://www.pgadmin.org/download/pgadmin-4-macos/
- Download and install PostgreSQL
- Follow the installation wizard

### Verify PostgreSQL Installation:

```bash
psql --version
```

## Installation

### Option 1: Local Development Setup

1. **Clone the repository:**

```bash
git clone https://example.git/streaming-api.git
cd streaming-api
```

2. **Install Node.js dependencies:**

```bash
npm install
```

3. **Create environment file:**

Create a copy of the `.env.example` file and rename it to `.env`. Update the configuration settings such as database credentials, mail driver, etc., in the `.env` file OR you can run below command.

```bash
cp .env.example .env
```

4.**Create database:**

After installing PostgreSQL, create a new database:

```bash

# Create database
CREATE DATABASE streaming_live;

# Note: Make sure the database name is the same in the .env file as well.
```

5. **Verify database connection:**

```bash
npm run dev
```

6. **Run database migrations:**

This will create all necessary tables in the database:

```bash
npm run knex:migrate
```

Or using Knex directly:

```bash
npx knex migrate:latest --knexfile knexfile.ts
```

7. **Run database seeds (Add Admin):**

This will create the default admin user:

```bash
npm run knex:seed
```

Or using Knex directly:

```bash
npx knex seed:run --knexfile knexfile.ts
```

**Default Admin Credentials:**

- **Email:** streamingadmin@getnada.com
- **Password:** Admin@123

8. **Build the project:**

```bash
npm run build
```

9. **Start the development server:**

```bash
npm run dev
```

Or start the production server:

```bash
npm start
```

The API will be available at `http://localhost:3003`

## API Documentation (Swagger)

The project includes comprehensive Swagger/OpenAPI 3.x documentation.

### Access Swagger UI:

After starting the server, visit:

- **Swagger UI:** `http://localhost:3003/api/docs`
- **Swagger JSON:** `http://localhost:3003/api/swagger.json`

### Features:

- Interactive API documentation
- Try out endpoints directly from the browser
- JWT authentication support
- Complete request/response schemas
- All endpoints documented with examples

### Using Swagger:

1. Start the server: `npm run dev`
2. Open browser: `http://localhost:3003/api/docs`
3. Click "Authorize" button to add JWT token (obtained from login)
4. Explore and test all API endpoints

## Database Commands

### Migration Commands:

```bash
# Run all pending migrations
npm run knex:migrate

# Rollback the last migration
npm run knex:migrate:rollback

# Check migration status
npm run knex:migrate:status

# Create a new migration
npm run knex:migrate:make migration_name
```

### Seed Commands:

```bash
# Run all seeds
npm run knex:seed

# Create a new seed
npm run knex:seed:make seed_name
```

## Project Structure

```
streaming-api/
├── src/
│   ├── controllers/        # Request handlers
│   │   ├── admin/          # Admin panel controllers
│   │   └── streamer/       # Streamer API controllers
│   │   └── user/           # User API controllers
│   ├── routes/             # API routes
│   ├── middleware/         # Express middleware
│   ├── migrations/         # Database migrations
│   ├── seeds/              # Database seeds
│   ├── models/             # Data models
│   ├── services/           # Business logic services
│   ├── utils/              # Utility functions
│   ├── validators/         # Joi validation schemas
│   │   ├── admin.validator.ts    # Admin validation schemas
│   │   ├── user.validator.ts     # User validation schemas
│   │   └── streamer.validator.ts # Streamer validation schemas
│   ├── config/             # Configuration files
│   └── types/              # TypeScript type definitions
├── dist/                   # Compiled JavaScript (generated)
├── public/                 # Static files
├── docker-compose.yml      # Docker Compose configuration
├── Dockerfile              # Docker image definition
├── knexfile.ts             # Knex configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Project dependencies
```

## API Endpoints

### Admin Endpoints:

- `/api/admin/auth/login` - Admin login
- `/api/admin/streamer/getAllStreamer` - Get all streamers
- `/api/admin/user/getAllUsers` - Get all users
- `/api/admin/membership/getAllMemberships` - Get all membership plans
- `/api/admin/cms/getAllContent` - Get all CMS content
- `/api/admin/email/getAllTemplate` - Get all email templates
- `/api/admin/faq/getAllFaqs` - Get all FAQs

### User Endpoints:

- `/api/user/auth/register` - User registration
- `/api/user/auth/login` - User login
- `/api/user/home/getStreamers` - Get streamers list

## Configuration

You can customize the application's configuration by modifying the `.env` file. Available configuration options include:

- Database connection settings (PostgreSQL)
- JWT secret key for authentication
- Email/SMTP configuration
- Application port and environment

## Usage

### Access Admin Panel:

1. Start the server:

```bash
npm run dev
```

2. Login to admin panel using the API endpoint:

```bash
POST http://localhost:3003/api/admin/auth/login
```

**Login Credentials:**

- **Email:** streamingadmin@getnada.com
- **Password:** Admin@123

### Development Commands:

```bash
# Run in development mode with auto-reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Watch for changes and rebuild
npm run watch

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Migration Issues:

If migrations fail, you can check the status:

```bash
npm run knex:migrate:status
```

To rollback and re-run:

```bash
npm run knex:migrate:rollback
npm run knex:migrate
```

### Port Already in Use:

If port 3000 is already in use, change it in your `.env` file:

```env
PORT=3001
```

## License

streaming LIVE Inc.

## Support

For issues and questions, please contact the development team or create an issue in the repository.
