# 🚀 Quick Start Guide - AI Fashion Catalog Generator

## Phase 1 Implementation Complete! ✅

All core backend infrastructure is now ready with MongoDB integration, admin authentication, and product management APIs.

---

## 📋 Prerequisites

1. **Node.js** v18+ installed
2. **MongoDB** installed and running
3. **OpenAI API Key**

---

## ⚡ Quick Setup (5 Minutes)

### 1. Install MongoDB

**Windows:**

```bash
# Download from https://www.mongodb.com/try/download/community
# Or use Chocolatey:
choco install mongodb

# Start service:
net start MongoDB
```

**Mac:**

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux:**

```bash
sudo apt-get install -y mongodb
sudo systemctl start mongodb
```

**OR Use Docker:**

```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 2. Install Dependencies

```bash
cd backend
npm install
```

New packages installed:

- `mongoose` - MongoDB ODM
- `mongodb` - Native MongoDB driver
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT auth
- `sharp` - Image processing

### 3. Configure Environment

```bash
# Copy example .env file
cp env.example .env
```

Edit `.env` with your settings:

```env
# OpenAI (required)
OPENAI_API_KEY=sk-your-openai-key-here

# MongoDB (defaults work for local)
MONGODB_URI=mongodb://localhost:27017/fashion-catalog
MONGODB_GRIDFS_BUCKET=product-images

# JWT Secret (⚠️ CHANGE THIS!)
JWT_SECRET=your-super-secret-key-at-least-32-characters-long

# Default Admin (change password after first login!)
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=admin123

# Server
PORT=5000
ALLOWED_ORIGINS=http://localhost:5173
```

### 4. Start the Server

```bash
npm start
# Or for development with auto-reload:
npm run dev
```

**Expected Output:**

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

## 🧪 Test the Setup

### 1. Health Check

```bash
curl http://localhost:5000/api/ai-fashion-generator/health
# Response: {"status":"ok"}
```

### 2. Admin Login

```bash
curl -X POST http://localhost:5000/api/ai-fashion-generator/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "admin": {
      "id": "...",
      "email": "admin@example.com",
      "name": "Default Admin",
      "role": "super-admin"
    }
  }
}
```

**Save the token** - you'll need it for authenticated requests!

### 3. List Products (with Auth)

```bash
curl http://localhost:5000/api/ai-fashion-generator/api/admin/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. Upload Test Batch (Existing Feature)

The existing batch upload still works! Just upload images and they'll now be:

- ✅ Saved to MongoDB
- ✅ Stored in GridFS with thumbnails
- ✅ Auto-created as draft products
- ✅ Searchable via new search API

---

## 📡 API Endpoints Reference

### Authentication (`/api/admin/auth`)

| Method | Endpoint           | Description             |
| ------ | ------------------ | ----------------------- |
| `POST` | `/login`           | Login and get JWT token |
| `GET`  | `/me`              | Get current admin info  |
| `POST` | `/verify`          | Verify token validity   |
| `POST` | `/change-password` | Change admin password   |

### Product Management (`/api/admin/products`)

**All require `Authorization: Bearer <token>` header**

| Method   | Endpoint         | Description                              |
| -------- | ---------------- | ---------------------------------------- |
| `GET`    | `/`              | List products (with filters, pagination) |
| `GET`    | `/:id`           | Get single product                       |
| `POST`   | `/`              | Create product manually                  |
| `PUT`    | `/:id`           | Update product                           |
| `DELETE` | `/:id`           | Delete product + images                  |
| `PATCH`  | `/:id/status`    | Change status (draft/published/archived) |
| `POST`   | `/bulk-delete`   | Delete multiple products                 |
| `PATCH`  | `/bulk-status`   | Update status for multiple               |
| `GET`    | `/stats/summary` | Get product statistics                   |

### Search (`/api/search`)

**Public endpoints (optional auth)**

| Method | Endpoint              | Description                      |
| ------ | --------------------- | -------------------------------- |
| `POST` | `/products`           | Search with text + color filters |
| `POST` | `/color`              | Search by color only             |
| `GET`  | `/suggestions?q=silk` | Autocomplete suggestions         |
| `GET`  | `/colors`             | Get all unique colors            |
| `GET`  | `/tags`               | Get all unique tags              |

### Images (`/api/images`)

| Method | Endpoint | Description             |
| ------ | -------- | ----------------------- |
| `GET`  | `/:id`   | Serve image from GridFS |

### Batch Upload (`/api/jobs`)

**Existing endpoints - now save to MongoDB!**

| Method | Endpoint         | Description                   |
| ------ | ---------------- | ----------------------------- |
| `POST` | `/`              | Upload batch, create products |
| `GET`  | `/:jobId`        | Get job status                |
| `GET`  | `/:jobId/stream` | Real-time updates (SSE)       |
| `GET`  | `/:jobId/export` | Download Excel                |

---

## 🔑 Example API Usage

### Login and Get Token

```javascript
const response = await fetch(
  "http://localhost:5000/api/ai-fashion-generator/api/admin/auth/login",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@example.com",
      password: "admin123",
    }),
  },
);

const { data } = await response.json();
const token = data.token;
```

### Search Products

```javascript
const response = await fetch(
  "http://localhost:5000/api/ai-fashion-generator/api/search/products",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: "silk saree",
      colors: ["Red", "Gold"],
      colorMode: "all",
      status: "published",
      page: 1,
      limit: 20,
    }),
  },
);

const { data, pagination } = await response.json();
```

### Update Product

```javascript
const response = await fetch(
  `http://localhost:5000/api/ai-fashion-generator/api/admin/products/${productId}`,
  {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: "Updated Product Name",
      status: "published",
      tags: ["festive", "traditional"],
    }),
  },
);
```

---

## 🗄️ MongoDB Database Structure

### Collections Created

1. **products** - All fashion catalog items
2. **jobs** - Batch upload job tracking
3. **admins** - Admin users
4. **product-images.files** - GridFS image metadata
5. **product-images.chunks** - GridFS image data

### View Data in MongoDB

```bash
mongosh fashion-catalog

# List collections
show collections

# View products
db.products.find().pretty()

# View jobs
db.jobs.find().pretty()

# View admins (password hashes hidden)
db.admins.find().pretty()

# Count products by status
db.products.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
])
```

---

## 🎯 What Works Now

### ✅ Database & Storage

- MongoDB connection with auto-retry
- GridFS image storage with thumbnails
- Text search indexes on products
- TTL index (jobs expire after 7 days)

### ✅ Authentication

- JWT token-based auth
- Password hashing with bcrypt
- Role-based access control
- Default admin auto-created

### ✅ Product Management

- Create, read, update, delete products
- Bulk operations (delete, status update)
- Status workflow (draft → published → archived)
- Image serving from GridFS

### ✅ Search

- Full-text search on name, description, tags
- Color filtering (names, families, percentages)
- Combined filters (text + colors + status)
- Autocomplete suggestions
- Pagination & sorting

### ✅ Batch Processing

- Upload images → Save to GridFS
- AI processing → Auto-create products
- Excel export (with GridFS image download)
- Real-time progress updates
- Job persistence across server restarts

---

## 🐛 Troubleshooting

### MongoDB Won't Connect

**Error**: `MongoServerError: connect ECONNREFUSED`

```bash
# Check if MongoDB is running
mongosh
# If fails, start MongoDB:

# Windows
net start MongoDB

# Mac
brew services start mongodb-community

# Linux
sudo systemctl start mongodb

# Docker
docker start mongodb
```

### Port 5000 Already in Use

```bash
# Windows - Kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5000 | xargs kill -9

# OR change port in .env
PORT=5001
```

### Sharp Installation Fails

```bash
npm rebuild sharp
# Or
npm install --platform=win32 --arch=x64 sharp
```

### Default Admin Not Created

```bash
# Delete existing admins and restart
mongosh fashion-catalog
db.admins.deleteMany({})
exit
npm start
```

---

## 🔒 Security Checklist

Before deploying to production:

- [ ] Change `JWT_SECRET` to strong random string (32+ chars)
- [ ] Change default admin password immediately
- [ ] Enable MongoDB authentication
- [ ] Use HTTPS (not HTTP)
- [ ] Set restrictive CORS origins
- [ ] Add rate limiting to auth endpoints
- [ ] Enable MongoDB access control
- [ ] Use environment-specific `.env` files
- [ ] Never commit `.env` to git

---

## 📚 Next Steps

### Immediate

1. Test batch upload with sample images
2. Login to admin and change password
3. Create some test products manually
4. Test search with different filters

### Phase 2 (Next)

- Enhanced color extraction (percentages, hex codes)
- Frontend admin dashboard
- Product list/edit UI
- Advanced search interface

### Phase 3

- Public product browsing
- Shopping cart
- Order management
- Customer accounts

---

## 📝 Notes

- **Data Persistence**: All data now persists across server restarts
- **Image Storage**: Images stored in GridFS (not file system)
- **Auto-Products**: Batch uploads automatically create draft products
- **Search Ready**: Text search indexes created automatically
- **Scalable**: Can switch to MongoDB Atlas for cloud deployment

---

## 🆘 Need Help?

1. **Check logs** - Server console shows detailed error messages
2. **Verify MongoDB** - `mongosh` should connect successfully
3. **Test endpoints** - Use curl or Postman to test API
4. **Check .env** - Ensure all required variables are set

---

**Status**: Phase 1 Complete ✅  
**Database**: MongoDB + GridFS  
**Authentication**: JWT-based  
**Next**: Frontend admin dashboard
