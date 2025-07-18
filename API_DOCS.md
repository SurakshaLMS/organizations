# Organization Service API

A secure, industrial-grade system for managing organizations, users, lectures, and causes using NestJS and Prisma.

## 🚀 Features

- **🔐 Secure Authentication**: JWT-based authentication with separate login system
- **🏢 Organization Management**: Institute-level and global organizations
- **👥 User Management**: Role-based access control (RBAC)
- **📚 Content Management**: Causes, lectures, assignments, and documentation
- **🔒 Security First**: OWASP best practices, rate limiting, input validation
- **📊 Daily Sync**: Automated user synchronization from external systems
- **⚡ Performance**: Optimized database queries with proper indexing

## 📋 Installation & Setup

### Prerequisites

- Node.js 18+ 
- PostgreSQL 13+
- npm or yarn

### Quick Start

1. **Clone and install**
   ```bash
   git clone <repository-url>
   cd organization-service
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database Setup**
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

4. **Start the application**
   ```bash
   npm run start:dev
   ```

## 🔌 API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/setup-password` - Setup password (first time)
- `POST /api/v1/auth/change-password` - Change password
- `POST /api/v1/auth/profile` - Get user profile

### Organizations
- `GET /api/v1/organizations` - Get all organizations
- `POST /api/v1/organizations` - Create organization
- `PUT /api/v1/organizations/:id` - Update organization
- `POST /api/v1/organizations/enroll` - Enroll in organization

### Causes & Lectures
- `GET /api/v1/causes` - Get all causes
- `POST /api/v1/causes` - Create cause
- `GET /api/v1/lectures` - Get all lectures
- `POST /api/v1/lectures` - Create lecture

## 🔐 Security Features

- JWT authentication with separate login system
- Role-based access control (RBAC)
- Rate limiting and request throttling
- Input validation and sanitization
- OWASP security headers
- bcrypt password hashing

## 🏗️ Architecture

### Database Schema
- **External Tables**: `user`, `institute`, `institute_users` (read-only)
- **Internal Tables**: `organization`, `cause`, `lecture`, `assignment`, `documentation`, `user_auth`

### User Roles
- **MEMBER**: Basic access
- **MODERATOR**: Create/edit content
- **ADMIN**: User verification + moderator permissions
- **PRESIDENT**: Full organization management

## 🚀 Development

```bash
# Development
npm run start:dev

# Testing
npm run test

# Database management
npx prisma studio
```

For detailed documentation, see the full API reference.
