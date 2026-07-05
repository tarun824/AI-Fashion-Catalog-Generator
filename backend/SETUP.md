# Setup Instructions - Phase 1: Database Foundation

## What's Been Implemented

### ✅ Completed Features

1. **MongoDB Integration**
   - Database connection configuration (`src/config/database.js`)
   - GridFS bucket initialization for image storage
   - Automatic text search indexes creation

2. **Data Models (Mongoose Schemas)**
   - `Product` model - Full catalog with colors, images, search keywords
   - `Job` model - Batch upload tracking with progress
   - `Admin` model - Admin users with password hashing

3. **Services**
   - `imageStorage.js` - GridFS image upload/download/thumbnail generation
   - JWT authentication middleware with role-based access

4. **Dependencies Added**
   - `mongoose` - MongoDB ODM
   - `mongodb` - MongoDB driver
   - `bcryptjs` - Password hashing
   - `jsonwebtoken` - JWT authentication
   - `sharp` - Image thumbnail generation

---

## Setup Steps

### 1. Install MongoDB

**Windows:**

```bash
# Download MongoDB Community Edition from:
https://www.mongodb.com/try/download/community

# Or use Chocolatey:
choco install mongodb

# Start MongoDB service:
net start MongoDB
```

**Mac:**

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux (Ubuntu):**

```bash
sudo apt-get install -y mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

### 2. Install Node Dependencies

```bash
cd backend
npm install
```

New packages installed:

- `mongoose@^8.1.0`
- `mongodb@^6.3.0`
- `bcryptjs@^2.4.3`
- `jsonwebtoken@^9.0.2`
- `sharp@^0.33.2`

### 3. Configure Environment Variables

Create `.env` file from example:

```bash
cp env.example .env
```

Update these values in `.env`:

```env
# MongoDB (default for local installation)
MONGODB_URI=mongodb://localhost:27017/fashion-catalog
MONGODB_GRIDFS_BUCKET=product-images

# JWT Authentication (CHANGE THIS IN PRODUCTION!)
JWT_SECRET=your-super-secret-key-min-32-characters-long
JWT_EXPIRES_IN=7d

# Default Admin User (change after first login)
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=admin123

# OpenAI API (existing)
OPENAI_API_KEY=your_openai_key_here
```

⚠️ **IMPORTANT**: Change `JWT_SECRET` to a strong random string in production!

### 4. Verify MongoDB Connection

```bash
# Check MongoDB is running
mongosh
# Or
mongo

# Should connect without errors
# Type 'exit' to quit
```

### 5. Start the Backend Server

```bash
npm start
# Or for development with auto-reload:
npm run dev
```

**Expected console output:**

```
✓ MongoDB connected successfully
  Database: fashion-catalog
✓ GridFS bucket initialized: product-images
✓ Text search indexes created
✓ Default admin user created
  Email: admin@example.com
  Password: admin123
  ⚠️  CHANGE PASSWORD AFTER FIRST LOGIN!
✓ Backend server listening on port 5000
  API: http://localhost:5000/api/ai-fashion-generator
  Health: http://localhost:5000/api/ai-fashion-generator/health
```

---

## Test the Setup

### 1. Check Health Endpoint

```bash
curl http://localhost:5000/api/ai-fashion-generator/health
```

Should return: `{"status":"ok"}`

### 2. Verify MongoDB Collections

```bash
mongosh fashion-catalog

# List collections
show collections

# Should see:
# - admins
# - products (will be created on first product)
# - jobs (will be created on first upload)
# - product-images.files (GridFS)
# - product-images.chunks (GridFS)

# Check admin user
db.admins.find().pretty()
```

### 3. Test Admin Login (Coming Next)

We'll create admin authentication endpoints in the next step.

---

## Project Structure (Updated)

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js          ✅ NEW - MongoDB connection
│   │   └── prompt.js            (existing)
│   ├── models/
│   │   ├── Product.js           ✅ NEW - Product schema
│   │   ├── Job.js               ✅ NEW - Job schema
│   │   └── Admin.js             ✅ NEW - Admin schema
│   ├── services/
│   │   ├── imageStorage.js      ✅ NEW - GridFS image handling
│   │   ├── excel.js             (existing)
│   │   └── jobRunner.js         (existing - will update)
│   ├── middleware/
│   │   └── auth.js              ✅ NEW - JWT authentication
│   ├── routes/
│   │   └── routes.js            (existing - will update)
│   ├── jobs/                    (existing - will update)
│   └── workers/                 (existing)
├── .env                         ✅ UPDATED - MongoDB & JWT config
└── package.json                 ✅ UPDATED - New dependencies
```

---

## What's Next (Phase 1 Remaining)

### To Complete Phase 1:

1. **Create Admin Authentication Routes**
   - `POST /api/admin/auth/login` - Login endpoint
   - `POST /api/admin/auth/verify` - Token verification
   - `GET /api/admin/auth/me` - Get current admin info

2. **Create Admin CRUD Routes**
   - `GET /api/admin/products` - List products with filters
   - `POST /api/admin/products` - Create product manually
   - `GET /api/admin/products/:id` - Get single product
   - `PUT /api/admin/products/:id` - Update product
   - `DELETE /api/admin/products/:id` - Delete product
   - `GET /api/admin/products/:id/image` - Serve images from GridFS

3. **Update Batch Processor**
   - Modify `jobRunner.js` to save images to GridFS
   - Modify `jobProcessor.js` to create Product documents
   - Replace in-memory `jobStore.js` with MongoDB Job model

4. **Test End-to-End**
   - Upload batch → Images saved to GridFS
   - AI processing → Products created in MongoDB
   - Verify data persistence after server restart

---

## Troubleshooting

### MongoDB Connection Issues

**Error**: `MongoServerError: connect ECONNREFUSED`

**Solution**: MongoDB service not running

```bash
# Windows
net start MongoDB

# Mac
brew services start mongodb-community

# Linux
sudo systemctl start mongodb
```

### Port Already in Use

**Error**: `EADDRINUSE: address already in use :::5000`

**Solution**: Kill process on port 5000

```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5000 | xargs kill -9
```

### Sharp Installation Issues

**Error**: `Error: Could not load the "sharp" module`

**Solution**: Rebuild sharp for your platform

```bash
npm rebuild sharp
```

---

## Environment Variables Reference

| Variable                 | Default                                     | Description                                  |
| ------------------------ | ------------------------------------------- | -------------------------------------------- |
| `MONGODB_URI`            | `mongodb://localhost:27017/fashion-catalog` | MongoDB connection string                    |
| `MONGODB_GRIDFS_BUCKET`  | `product-images`                            | GridFS bucket name for images                |
| `JWT_SECRET`             | ⚠️ Must set                                 | Secret key for JWT signing (min 32 chars)    |
| `JWT_EXPIRES_IN`         | `7d`                                        | JWT token expiration time                    |
| `DEFAULT_ADMIN_EMAIL`    | `admin@example.com`                         | Initial admin email                          |
| `DEFAULT_ADMIN_PASSWORD` | `admin123`                                  | Initial admin password (change immediately!) |
| `PORT`                   | `5000`                                      | Server port                                  |
| `OPENAI_API_KEY`         | -                                           | OpenAI API key for AI processing             |

---

## Database Schema Overview

### Products Collection

- Stores all fashion catalog products
- Auto-generated SKU (e.g., `PRD-LX3K9-7H2P0`)
- Color analysis (names, percentages, families, hex palette)
- GridFS image references (original + thumbnail)
- Full-text search on name, description, keywords
- Status: draft, published, archived

### Jobs Collection

- Tracks batch upload jobs
- Progress tracking (total, completed, failed)
- Links files to created products
- Auto-expires after 7 days

### Admins Collection

- Admin users with bcrypt password hashing
- Role-based access (admin, super-admin)
- JWT authentication

---

## Security Notes

🔒 **Production Checklist:**

1. Change `JWT_SECRET` to strong random string (min 32 characters)
2. Change default admin password immediately after first login
3. Use HTTPS in production
4. Set strong MongoDB authentication if exposed
5. Add rate limiting to auth endpoints
6. Enable MongoDB access control
7. Use environment-specific `.env` files

---

## Next Steps After Phase 1

**Phase 2: Text & Color Search** (1-2 weeks)

- Enhanced AI color extraction (percentages, families, hex codes)
- Text search API with MongoDB text indexes
- Advanced color filtering API
- Search autocomplete/suggestions

**Phase 3: Admin Dashboard** (1-2 weeks)

- Frontend admin layout and routing
- Product listing with filters and pagination
- Product edit forms
- Bulk operations
- Search integration

---

**Status**: Phase 1 Foundation Complete ✅  
**Next**: Implement admin authentication routes and CRUD endpoints
