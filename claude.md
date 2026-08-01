# AI Fashion Catalog Generator - Development Guide

## Project Overview

This is a full-stack application that processes fashion garment images using AI (OpenAI Vision API) to generate catalog descriptions and color analysis. The system handles batch uploads of up to 200 images, processes them concurrently using a worker pool pattern, and exports results to Excel.

### Core Purpose

- **Batch Image Processing**: Upload multiple fashion garment images
- **AI-Powered Analysis**: Generate descriptions and extract color information using GPT-4 Vision
- **Real-time Progress**: Live updates on processing status
- **Excel Export**: Download processed catalog data in Excel format

---

## User Context & Principles

### Target Users

**Primary Users: Fashion Vendors & Small Business Owners**

- **Age Range**: 25-50 years
- **Technical Skill**: Low to medium (not developers)
- **Device Usage**: 65% mobile, 30% desktop, 5% tablet
- **Primary Device**: Android smartphones (70%), iOS (30%)
- **Connection**: Often 3G/4G, not always stable
- **Location**: Primarily India - WhatsApp is primary communication tool
- **Language**: English + regional languages (future consideration)

**Secondary Users: Fashion Catalog Managers**

- Manage large inventories (100-1000+ products)
- Need fast bulk operations
- Use desktop for data entry, mobile for quick checks
- Value speed over complex features

### Core UX Principles

These principles guide ALL design and feature decisions:

1. **Mobile-First, Always**: 65% of traffic is mobile - design for small screens first, scale up for desktop

2. **Speed is Non-Negotiable**: Users abandon after 3 seconds. Every loading state matters.

3. **Simple Over Complex**: Every additional step loses ~20% of users. One-click actions win.

4. **WhatsApp Culture**: In India, WhatsApp is THE sharing method. Not email, not SMS - WhatsApp.

5. **Visual Hierarchy = Usage Frequency**: Most important action = biggest, brightest, first on screen

6. **No Hidden Features**: If users can't see it immediately, they won't use it. Avoid excessive dropdowns/menus.

7. **Assume Low Bandwidth**: Optimize images, minimize API calls, show immediate feedback

8. **Error Messages Must Be Actionable**: "Something went wrong" is useless. Tell users what to do next.

### User Behavior Patterns

**Observed Usage Patterns:**

- **WhatsApp Sharing**: 80% of all product shares (primary use case)
- **Copy Link**: 15% of shares (for social media posts)
- **QR Code Download**: 5% of shares (for printed catalogs only)
- **Dark Mode**: 40% enable dark mode (evening browsing)
- **Bulk Actions**: Vendors upload 20-50 products at once, not individually
- **Quick Edits**: Users return to edit prices/status more than descriptions
- **Category Browsing**: Users prefer visual browsing over search for discovery

**Drop-off Points (Where Users Leave):**

- Multi-step forms (lose 30% per extra step)
- Slow loading (>3 seconds = 50% abandonment)
- Hidden primary actions (if scroll required, 40% miss it)
- Unclear error messages (users close app instead of retrying)
- Complex navigation (>2 clicks to primary features)

### Known Pain Points

Problems observed in production or reported by users:

1. **Scrolling for Primary Actions**: Users won't scroll to reach important buttons (e.g., WhatsApp share). Critical actions must be "above the fold"

2. **Dark Mode Text Visibility**: Dark backgrounds with dark text = invisible UI. Always test dark mode.

3. **API Response Inconsistencies**: Some endpoints return `response.data`, others return parsed JSON directly. Always check actual structure.

4. **Mobile Keyboard Issues**: On mobile, keyboard covers input fields. Ensure scroll-to-view on focus.

5. **Loading State Confusion**: Users don't know if app is working or frozen. Always show spinners/progress.

6. **Complex URLs**: Long, ugly URLs don't get shared. Simple, readable URLs perform 3x better.

7. **File Upload Failures**: Users on mobile/3G often lose connection during upload. Need resume capability (future).

### Design Decision Framework

**When making UX decisions, ask:**

1. Is the most common action immediately visible and accessible?
2. Does this work on a small mobile screen (320px width)?
3. Can a non-technical user understand this without instructions?
4. Will this work on a slow 3G connection?
5. What happens if the user's internet cuts out mid-action?
6. Is the feedback immediate and clear?

**Trade-off Philosophy:**

- ✅ Prioritize speed over features
- ✅ Prioritize clarity over aesthetics
- ✅ Prioritize mobile over desktop
- ✅ Prioritize common actions over power-user features

---

## Architecture & Tech Stack

### Backend (Node.js + Express)

- **Runtime**: Node.js with ES Modules (type: "module")
- **Framework**: Express v5.2.1
- **AI Integration**: OpenAI API v6.15.0 (GPT-4o-mini Vision model)
- **Excel Generation**: ExcelJS v4.4.0
- **File Upload**: Multer v2.0.2
- **Environment**: dotenv v17.2.3
- **Logging**: morgan v1.10.1

### Frontend (React + Vite)

- **Framework**: React 19.2.0
- **Build Tool**: Vite v7.2.4
- **Styling**: Tailwind CSS v3.4.17
- **Linting**: ESLint v9.39.1

### Key Architectural Patterns

1. **Worker Pool Pattern**: CPU-intensive AI processing offloaded to worker threads
2. **Job Queue System**: In-memory job management with state tracking
3. **Event-Driven Updates**: Real-time progress via SSE/polling
4. **Three-Tier Architecture**: Routes → Services → Workers
5. **Stateless Design**: Jobs stored in-memory (resets on restart)

---

## Project Structure & Conventions

### Backend Structure

```
backend/
├── src/
│   ├── index.js              # Express app initialization
│   ├── config/
│   │   └── prompt.js         # AI system prompts
│   ├── routes/
│   │   └── routes.js         # API endpoints
│   ├── services/
│   │   ├── jobRunner.js      # Job orchestration
│   │   └── excel.js          # Excel generation
│   ├── jobs/
│   │   ├── jobStore.js       # In-memory state management
│   │   ├── jobProcessor.js   # Job lifecycle management
│   │   ├── workerPool.js     # Worker thread pool
│   │   └── excelExporter.js  # Excel file building
│   └── workers/
│       ├── imageWorker.js    # Worker thread entry
│       └── processImage.js   # OpenAI API calls
├── storage/
│   └── uploads/              # Temporary upload storage
└── package.json
```

### Frontend Structure

```
frontend/
├── src/
│   ├── App.jsx               # Main application component
│   ├── components/
│   │   ├── BatchUploader.jsx    # File upload UI
│   │   ├── ProgressPanel.jsx    # Processing status
│   │   └── ResultsPanel.jsx     # Results display & filtering
│   └── utils/
│       └── colorFamilies.js     # Color categorization logic
├── public/
└── package.json
```

---

## Coding Standards & Best Practices

### JavaScript/Node.js Standards

#### 1. Use ES Modules Throughout

```javascript
// ✅ GOOD
import express from "express";
import { processImage } from "./workers/processImage.js";

// ❌ AVOID
const express = require("express");
```

#### 2. Async/Await Over Callbacks

```javascript
// ✅ GOOD
const result = await openai.chat.completions.create(params);

// ❌ AVOID
openai.chat.completions.create(params, (err, result) => {
  // callback hell
});
```

#### 3. Destructuring for Clarity

```javascript
// ✅ GOOD
const { jobId, files, systemPrompt } = req.body;

// ❌ AVOID
const jobId = req.body.jobId;
const files = req.body.files;
```

#### 4. Const > Let, Never Var

```javascript
// ✅ GOOD
const MAX_FILES = 200;
let currentCount = 0;

// ❌ AVOID
var MAX_FILES = 200;
```

#### 5. Arrow Functions for Callbacks

```javascript
// ✅ GOOD
files.forEach((file) => processFile(file));

// ❌ AVOID (unless you need 'this' binding)
files.forEach(function (file) {
  processFile(file);
});
```

#### 6. Early Returns for Guard Clauses

```javascript
// ✅ GOOD
function getJob(jobId) {
  if (!jobId) return null;
  if (!jobStore.has(jobId)) return null;
  return jobStore.get(jobId);
}

// ❌ AVOID deep nesting
function getJob(jobId) {
  if (jobId) {
    if (jobStore.has(jobId)) {
      return jobStore.get(jobId);
    }
  }
  return null;
}
```

### React/Frontend Standards

#### 1. Functional Components with Hooks

```javascript
// ✅ GOOD
function ResultCard({ file, description, colors }) {
  const [expanded, setExpanded] = useState(false);
  // component logic
}

// ❌ AVOID class components for new code
class ResultCard extends React.Component {
  // ...
}
```

#### 2. UseMemo for Expensive Computations

```javascript
// ✅ GOOD
const filteredResults = useMemo(() => {
  return results.filter((r) => matchesSearch(r));
}, [results, searchQuery]);
```

#### 3. Descriptive State Variable Names

```javascript
// ✅ GOOD
const [isUploading, setIsUploading] = useState(false);

// ❌ AVOID
const [flag, setFlag] = useState(false);
```

---

## Error Handling Patterns

### Distinguish Error Types

#### Operational Errors (Expected)

- Invalid user input
- File too large
- OpenAI API rate limits
- Missing configuration

```javascript
// ✅ GOOD
if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY is not set. Generation requests will fail.");
}

// Return meaningful errors to client
if (!file.mimetype.startsWith("image/")) {
  return res.status(400).json({
    error: "Only image uploads are supported.",
  });
}
```

#### Catastrophic Errors (Unexpected)

- Code bugs
- Memory exhaustion
- Unhandled exceptions

```javascript
// ✅ GOOD - Centralized error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong." });
});
```

### Always Handle Promise Rejections

```javascript
// ✅ GOOD
workerPool
  .runTask(params)
  .then((result) => markImageCompleted(jobId, result))
  .catch((error) => markImageFailed(jobId, error.message));

// ✅ GOOD with async/await
try {
  const result = await workerPool.runTask(params);
  markImageCompleted(jobId, result);
} catch (error) {
  markImageFailed(jobId, error.message);
}
```

### Don't Swallow Errors

```javascript
// ❌ AVOID
try {
  await criticalOperation();
} catch (error) {
  console.log(error); // Not enough!
}

// ✅ GOOD
try {
  await criticalOperation();
} catch (error) {
  console.error("Critical operation failed:", error);
  // Notify monitoring service
  // Update job status
  // Return error to client if appropriate
}
```

---

## File Naming & Organization

### Backend Conventions

- **Routes**: Descriptive, RESTful (`routes.js`)
- **Services**: Domain-specific (`jobRunner.js`, `excel.js`)
- **Workers**: Task-specific (`imageWorker.js`, `processImage.js`)
- **Config**: Feature-based (`prompt.js`)

### Frontend Conventions

- **Components**: PascalCase (`BatchUploader.jsx`, `ProgressPanel.jsx`)
- **Utils**: camelCase (`colorFamilies.js`)
- **Hooks**: Prefix with `use` (`useJobPolling.js`)

### File Organization Principles

1. **Group by Feature, Not Type**: Related files live together
2. **Single Responsibility**: Each file has one clear purpose
3. **Explicit Exports**: Named exports preferred for clarity

---

## Environment Configuration

### Required Environment Variables

#### Backend (.env)

```bash
# API Configuration
OPENAI_API_KEY=sk-...
OPENAI_VISION_MODEL=gpt-4o-mini  # Default if not set

# Server Configuration
PORT=5000
API_PREFIX=/api/ai-fashion-generator

# CORS Origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:5173,https://yourdomain.com

# Processing Configuration
WORKER_POOL_SIZE=4  # Number of concurrent workers
WORKER_CONCURRENCY=4  # Parallel processing limit
MAX_BATCH_SIZE=200  # Maximum files per upload
MAX_IMAGE_MB=20  # Max file size in MB

# AI Prompt Configuration
DESCRIPTION_PROMPT="Analyze this garment image..."  # Override default
```

#### Frontend (.env)

```bash
VITE_API_BASE_URL=http://localhost:5000
```

### Configuration Best Practices

- ✅ Use `.env.example` as template (committed to repo)
- ✅ Never commit actual `.env` files
- ✅ Validate required env vars on startup
- ✅ Provide sensible defaults where possible
- ✅ Document all environment variables

---

## State Management Patterns

### Backend Job State

```javascript
// Job lifecycle states
{
  id: "uuid",
  status: "pending" | "processing" | "completed" | "failed",
  files: [
    {
      id: "file-uuid",
      status: "pending" | "processing" | "completed" | "failed",
      originalName: "shirt.jpg",
      size: 123456,
      mimeType: "image/jpeg",
      buffer: Buffer | null  // Cleared after processing
    }
  ],
  results: [
    {
      fileId: "file-uuid",
      description: "...",
      colors: ["Red", "Blue"],
      tokens: 1500
    }
  ],
  excel: {
    ready: false,
    building: false,
    filePath: "/path/to/output.xlsx",
    error: null
  }
}
```

### Frontend State Management

- **App-level state**: `useState` in `App.jsx`
- **Derived state**: `useMemo` for filtering/transformations
- **Refs for persistence**: `useRef` for event sources, intervals
- **Cleanup**: Always clean up event listeners, timers in `useEffect`

```javascript
useEffect(() => {
  const interval = setInterval(() => pollJobStatus(), 2000);
  return () => clearInterval(interval); // ✅ CRITICAL
}, [jobId]);
```

---

## Performance Guidelines

### Backend Performance

#### 1. Worker Pool for Concurrency

```javascript
// ✅ GOOD - Current implementation
const workerPool = new WorkerPool({
  size: process.env.WORKER_POOL_SIZE || 4,
  workerPath,
  workerData: { apiKey, defaultModel },
});
```

#### 2. Release Memory After Processing

```javascript
// ✅ GOOD
const releaseFileBuffers = (job) => {
  job.files.forEach((file) => {
    if (file && file.buffer) {
      file.buffer = null; // Allow GC to collect
    }
  });
};
```

#### 3. Limit Concurrent Network Requests

```javascript
// ✅ GOOD - Queue pattern
class WorkerQueue {
  constructor(limit) {
    this.limit = limit;
    this.active = 0;
    this.queue = [];
  }
  // ... implementation
}
```

### Frontend Performance

#### 1. Memoize Expensive Computations

```javascript
// ✅ GOOD
const filteredEntries = useMemo(() => {
  return derivedEntries.filter(
    (entry) => matchesSearch(entry) && matchesColorFilter(entry),
  );
}, [derivedEntries, searchQuery, selectedColors]);
```

#### 2. Avoid Inline Function Definitions

```javascript
// ❌ AVOID (creates new function each render)
<button onClick={() => handleClick(id)}>Click</button>;

// ✅ BETTER (when callback needs params)
const handleButtonClick = useCallback(() => handleClick(id), [id, handleClick]);
<button onClick={handleButtonClick}>Click</button>;
```

#### 3. Debounce Search Inputs

```javascript
// ✅ GOOD
const debouncedSearch = useMemo(
  () => debounce((query) => setSearchQuery(query), 300),
  [],
);
```

---

## Security Best Practices

### API Security

#### 1. CORS Configuration

```javascript
// ✅ GOOD - Explicit origins
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

// ❌ AVOID in production
app.use(cors({ origin: "*" }));
```

#### 2. File Upload Validation

```javascript
// ✅ GOOD
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: MAX_FILES,
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image uploads are supported."));
      return;
    }
    cb(null, true);
  },
});
```

#### 3. Sensitive Data Handling

```javascript
// ✅ GOOD - Don't expose API keys
workerData: {
  apiKey: process.env.OPENAI_API_KEY,  // Never send to client
  defaultModel: process.env.OPENAI_VISION_MODEL
}

// ❌ AVOID logging sensitive data
console.log("API Key:", apiKey);  // NEVER DO THIS
```

#### 4. Input Validation

```javascript
// ✅ GOOD - Validate all inputs
if (!jobId || typeof jobId !== "string") {
  return res.status(400).json({ error: "Invalid job ID" });
}
```

### Frontend Security

#### 1. Sanitize User Input

- Never use `dangerouslySetInnerHTML` with user content
- Validate file types client-side (in addition to server-side)
- Limit upload sizes before sending

#### 2. API Key Management

```javascript
// ✅ GOOD - Use environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ❌ NEVER hardcode API keys in frontend
const API_KEY = "sk-..."; // NEVER DO THIS
```

---

## Testing Strategy

### Backend Testing Approach

#### Unit Tests

```javascript
// Example test structure (using Jest/Vitest)
import { describe, it, expect } from "vitest";
import { createJob, getJob } from "./jobStore.js";

describe("Job Store", () => {
  it("should create a job with unique ID", () => {
    const job = createJob();
    expect(job.id).toBeDefined();
    expect(job.status).toBe("pending");
  });

  it("should retrieve created job by ID", () => {
    const job = createJob();
    const retrieved = getJob(job.id);
    expect(retrieved).toEqual(job);
  });
});
```

#### Integration Tests

- Test API endpoints with mock OpenAI responses
- Test worker pool behavior
- Test Excel generation

#### Test Coverage Goals

- **Routes**: 80%+ (test all endpoints, error cases)
- **Services**: 90%+ (core business logic)
- **Workers**: Mock OpenAI API, test error handling

### Frontend Testing Approach

#### Component Tests

```javascript
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ResultCard from "./ResultCard";

describe("ResultCard", () => {
  it("renders file name and description", () => {
    render(
      <ResultCard
        file={{ originalName: "test.jpg" }}
        description="Red cotton t-shirt"
      />,
    );
    expect(screen.getByText("test.jpg")).toBeInTheDocument();
  });
});
```

### Testing Best Practices

- ✅ Write tests before fixing bugs
- ✅ Test error paths, not just happy paths
- ✅ Use descriptive test names: "should [expected behavior] when [condition]"
- ✅ Keep tests isolated (no shared state)
- ✅ Mock external dependencies (OpenAI API, file system)

---

## API Design Principles

### RESTful Endpoints

```
POST   /api/ai-fashion-generator/api/jobs     # Create job, upload files
GET    /api/ai-fashion-generator/api/jobs/:id # Get job status
GET    /api/ai-fashion-generator/health       # Health check
```

### Request/Response Patterns

#### Success Response

```javascript
// ✅ GOOD - Consistent structure
{
  jobId: "uuid",
  accepted: 10,
  rejected: 0,
  status: {
    id: "uuid",
    status: "processing",
    files: [...],
    results: [...]
  }
}
```

#### Error Response

```javascript
// ✅ GOOD - Meaningful errors
{
  error: "Only image uploads are supported."
}

// ✅ GOOD - Specific HTTP status codes
400 - Bad Request (client error)
404 - Not Found (resource doesn't exist)
500 - Internal Server Error (server error)
```

### Versioning

- Current: Implicit v1 (no version in URL)
- Future: Add `/v2/` to path when breaking changes needed

---

## Logging Standards

### Backend Logging

#### What to Log

```javascript
// ✅ GOOD - Informative logs
console.log(`Backend listening on port ${port}`);
console.warn("OPENAI_API_KEY is not set. Generation requests will fail.");
console.error("Failed to process image:", error.message);
```

#### Log Levels

- `console.log`: Info (startup, configuration)
- `console.warn`: Warnings (missing config, degraded functionality)
- `console.error`: Errors (failures, exceptions)

#### What NOT to Log

```javascript
// ❌ AVOID
console.log("API Key:", apiKey); // Sensitive data
console.log("User uploaded:", file.buffer); // Binary data
```

### Structured Logging (Recommended Upgrade)

```javascript
// Recommended: Use winston or pino
import pino from "pino";
const logger = pino();

logger.info({ jobId, fileCount: files.length }, "Job created");
logger.error({ jobId, error: err.message }, "Job processing failed");
```

---

## Git Workflow & Commit Standards

### Branch Naming

```
main              # Production-ready code
feature/add-filters   # New features
fix/excel-export-bug  # Bug fixes
refactor/worker-pool  # Code improvements
```

### Commit Message Format

```
<type>: <subject>

[optional body]

Types:
feat:     New feature
fix:      Bug fix
refactor: Code restructuring (no functionality change)
test:     Add or update tests
docs:     Documentation changes
style:    Code style changes (formatting, semicolons)
chore:    Build process, dependencies

Examples:
feat: add color filtering to results panel
fix: prevent memory leak in worker pool
refactor: extract job validation logic
test: add unit tests for jobStore
docs: update API documentation
```

### Pull Request Guidelines

1. Keep PRs focused (one feature/fix per PR)
2. Update documentation if needed
3. Add tests for new functionality
4. Ensure all tests pass
5. Request review from at least one team member

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] No console.error in production logs
- [ ] Environment variables documented
- [ ] API rate limits tested under load
- [ ] Memory usage profiled
- [ ] Excel export tested with max files (200)

### Production Environment Variables

```bash
NODE_ENV=production
PORT=5000
OPENAI_API_KEY=<production-key>
ALLOWED_ORIGINS=<production-domains>
WORKER_POOL_SIZE=8  # Adjust based on CPU cores
```

### Monitoring Recommendations

- **Uptime**: Use service like UptimeRobot
- **Errors**: Sentry or similar for error tracking
- **Performance**: New Relic or DataDog for APM
- **Logs**: Structured logging to Logtail or CloudWatch

### Scaling Considerations

1. **Horizontal Scaling**: Requires shared job store (Redis)
2. **Vertical Scaling**: Increase `WORKER_POOL_SIZE` based on CPU
3. **Rate Limiting**: Implement for OpenAI API calls
4. **Caching**: Consider caching similar images

---

## Common Patterns & Utilities

### Generating UUIDs

```javascript
import { randomUUID } from "crypto";

const jobId = randomUUID();
```

### Worker Thread Communication

```javascript
// Parent sends task
worker.postMessage({ imageBase64, filename });

// Worker responds
import { parentPort } from "worker_threads";
parentPort.postMessage({ success: true, result });
```

### Promise Queue

```javascript
class WorkerQueue {
  async push(task) {
    if (this.active < this.limit) {
      return this.execute(task);
    } else {
      return new Promise((resolve, reject) => {
        this.queue.push(() => this.execute(task).then(resolve).catch(reject));
      });
    }
  }
}
```

---

## Troubleshooting Guide

### Common Issues

#### Backend Won't Start

```bash
# Check: Missing OPENAI_API_KEY
❌ Missing OpenAI configuration on the server.
✅ Solution: Add OPENAI_API_KEY to .env

# Check: Port already in use
❌ Error: listen EADDRINUSE: address already in use :::5000
✅ Solution: Change PORT in .env or kill process on port 5000
```

#### Frontend Build Fails

```bash
# Check: Missing environment variable
❌ VITE_API_BASE_URL is undefined
✅ Solution: Create frontend/.env with VITE_API_BASE_URL

# Check: Node version
❌ Unsupported engine
✅ Solution: Use Node.js v18+ (check with `node --version`)
```

#### Worker Timeout

```javascript
// If OpenAI API calls hang
✅ Solution: Add timeout to worker task:
setTimeout(() => reject(new Error('Worker timeout')), 60000);
```

#### Memory Issues

```bash
# Symptom: Process crashes with OOM
❌ JavaScript heap out of memory
✅ Solutions:
1. Reduce WORKER_POOL_SIZE
2. Ensure file buffers are released after processing
3. Increase Node.js heap: node --max-old-space-size=4096
```

#### Module Not Found Error

```bash
# Symptom: Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'axios'
❌ Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'axios' imported from...
✅ Solution:

CRITICAL: When adding new npm packages to code:
1. ALWAYS add to package.json dependencies first
2. Then run npm install
3. Never import a package before adding it to package.json

Example:
// ❌ WRONG - Don't do this
1. Create file with: import axios from 'axios';
2. Run code → Error!

// ✅ CORRECT - Do this
1. Add to backend/package.json:
   "dependencies": {
     "axios": "^1.6.0"
   }
2. Run: npm install
3. Then create file with: import axios from 'axios';

Quick fix for existing error:
cd backend
npm install axios  # or whatever package is missing
```

**Pro Tip:** Before creating any new service file that uses external packages:

1. Check if package exists in package.json
2. If not, add it first
3. Run npm install
4. Then write the code

This prevents "Cannot find package" errors!

---

## UX Decision Log

This section documents key UX decisions based on real user feedback and behavior. Understanding the "why" behind each decision helps make better choices in the future.

### 2026-07-06: ShareModal Content Reordering

**Problem**: QR code displayed at top of modal forced users to scroll to reach WhatsApp share button

**User Feedback**: "users need to scroll to see whatsapp stuff man like tha users will not do na ???"

**Data Insight**:

- 80% of shares happen via WhatsApp
- 15% copy link for social media
- Only 5% use QR code (printed catalogs/advanced use)

**Decision**: Reordered modal content to match usage frequency:

1. WhatsApp Share (primary action, large and prominent)
2. Copy Link + Show QR toggle (secondary actions, 2-column grid)
3. Product URL (reference only)
4. Mobile native share (if available)
5. Collapsible QR code section (hidden by default, expandable)

**Principle Applied**: Visual hierarchy must match usage frequency - most common actions should be immediately visible without scrolling

**Expected Impact**: Increase WhatsApp shares by reducing friction, improve mobile UX

---

### 2026-07-06: Product Sharing URL Structure

**Problem**: Admin wanted unified product viewing system that works from homepage, share links, and admin panel

**Previous Approach**: Multiple route patterns causing confusion

**Decision**: Simplified to single slug-based URL pattern: `/products/:slug`

- Slugs format: `product-name-abc123` (6-char random code for uniqueness)
- Same URL works for all contexts (public, shared, admin)
- Clean, shareable URLs

**Principle Applied**: Simplicity over complexity - one pattern to rule them all

**Implementation**:

- Product model auto-generates slugs on creation
- Public route accepts any product status (shows banners for draft/archived)
- Share tracking via separate endpoint

---

### 2026-07-05: Dark Mode Implementation

**Problem**: 40% of users browse in evening hours, bright white screens cause eye strain

**Decision**: Implemented Tailwind CSS class-based dark mode

- Toggle in dashboard header
- Persists via localStorage
- Applied across all admin pages

**Principle Applied**: User comfort = longer session times = more engagement

**Key Learning**: Always test dark mode thoroughly - dark backgrounds need light text (dark:text-white)

---

### 2026-07-04: Integrations Management System

**Problem**: No centralized view of third-party service status (Shiprocket, Flipkart, Amazon, etc.)

**Decision**: Created admin integrations page with:

- Visual status indicators (green/yellow/red)
- Expandable details with setup instructions
- Test connection functionality
- Webhook URLs displayed clearly

**Principle Applied**: Reduce support burden by making configuration visible and testable

---

## Feature Analytics & Usage Insights

Understanding how features are actually used helps prioritize development and improve UX.

### Most Used Features (By Interaction Frequency)

1. **Product Sharing**: Primary user action
   - WhatsApp share: 80% of shares
   - Copy link: 15% of shares
   - QR code: 5% of shares
   - **Insight**: Mobile-optimized sharing is critical

2. **Batch Upload**: Core workflow
   - Average upload: 20-50 products per session
   - **Insight**: Bulk operations are essential, not edge cases

3. **Category Browsing**: Discovery method
   - Users prefer visual browsing over search
   - **Insight**: Image quality and loading speed are critical

4. **Product Status Changes**: Common editing action
   - Users frequently toggle draft/published/archived
   - **Insight**: Quick status toggles should be prominent

5. **Dark Mode**: Evening usage spike
   - 40% of users enable dark mode
   - **Insight**: Dark mode is not optional, it's expected

### Device & Browser Insights

**Device Breakdown:**

- Mobile: 65% (Primary focus)
- Desktop: 30% (Admin tasks)
- Tablet: 5% (Occasional use)

**Mobile OS:**

- Android: 70%
- iOS: 30%

**Browser Usage:**

- Chrome: 70%
- Safari: 15%
- Firefox: 10%
- Others: 5%

**Implications:**

- Test on Android Chrome first
- Ensure touch targets are 44x44px minimum
- Optimize for mobile network conditions

### Connection Quality Insights

**User Network Conditions:**

- 3G: 40%
- 4G: 50%
- WiFi: 10%

**Implications:**

- Assume slow, unstable connections
- Show loading states immediately
- Optimize image sizes
- Consider progressive loading for lists
- Handle network interruptions gracefully

### Time-of-Day Usage Patterns

**Peak Usage Hours:**

- Morning (9am-12pm): 25% - Bulk uploads
- Afternoon (12pm-6pm): 35% - Product management
- Evening (6pm-10pm): 40% - Browsing, sharing (dark mode active)

**Implications:**

- Dark mode is critical for evening users
- Morning users need fast upload processing
- Evening users are more likely to share products

---

## Future Improvements

### Short-Term

- [ ] Add unit tests (80%+ coverage)
- [ ] Implement structured logging (winston/pino)
- [ ] Add request rate limiting
- [ ] Persistent job storage (Redis/DB)
- [ ] Error tracking (Sentry)

### Medium-Term

- [ ] User authentication
- [ ] Job history and search
- [ ] Multiple AI model support
- [ ] Batch resume on server restart
- [ ] Export formats (CSV, JSON)

### Long-Term

- [ ] Multi-language support (i18n)
- [ ] Advanced filtering and search
- [ ] Custom AI prompt templates
- [ ] Webhook notifications
- [ ] Admin dashboard

---

## Thinking Principles Over Prescriptions

This guide provides patterns, principles, and context - not rigid rules. The goal is to understand **why** decisions were made, not just **what** was implemented.

### When Guidelines Conflict

**Scenario**: Mobile-first principle says "design for 320px width" but a complex data table needs more space.

**Wrong Approach**: Rigidly follow "mobile-first" and cram table into tiny screen  
**Right Approach**: Consider the principle's intent (accessibility on mobile) and find creative solution:

- Make table horizontally scrollable on mobile
- Show critical columns first, hide others in expandable row
- Suggest desktop for complex data tasks

**Key**: Understand the **why** (mobile users need access), then solve creatively.

### When User Behavior Changes

**Current**: "80% WhatsApp shares" drives modal design  
**Future**: If analytics show TikTok/Instagram shares rising to 40%, adapt accordingly

**Don't blindly follow old patterns** - revisit decisions when context changes.

### When to Ignore Best Practices

**Best Practice**: "Avoid scroll for primary actions"  
**Exception**: If 95% of users have already scrolled down (e.g., reading long product description), placing share button at bottom is fine

**Context matters more than rules.**

### Red Flags for Over-Prescription

Watch for these signs you're thinking too rigidly:

1. **"The docs say to do X"** - without understanding why
2. **"We always do it this way"** - without questioning if context changed
3. **"The example shows Y"** - without adapting to your specific case
4. **"I found this pattern"** - without validating it fits user needs

### Green Lights for Good Thinking

These indicate principle-based decisions:

1. **"Users do X because..."** - understanding actual behavior
2. **"This solves the problem of..."** - focusing on pain points
3. **"Testing showed that..."** - data-driven decisions
4. **"Given the constraints..."** - acknowledging trade-offs
5. **"This could break if..."** - considering edge cases

### The Meta-Principle

> **Optimize for user outcomes, not adherence to guidelines.**

If breaking a "rule" in this document leads to better user experience, faster development, or clearer code - **break it**. Then document why you broke it and what you learned.

---

## Key Principles Summary

### Code Quality

✅ Write self-documenting code  
✅ Prefer readability over cleverness  
✅ Single Responsibility Principle  
✅ DRY (Don't Repeat Yourself)  
✅ Fail fast, fail explicitly

### Performance

✅ Optimize only when needed (measure first)  
✅ Use worker threads for CPU-intensive tasks  
✅ Clean up resources (timers, listeners, buffers)  
✅ Memoize expensive computations

### Security

✅ Never trust user input  
✅ Validate on both client and server  
✅ Keep secrets out of code and logs  
✅ Use HTTPS in production  
✅ Keep dependencies updated

### Maintainability

✅ Write tests for new features  
✅ Document complex logic  
✅ Use meaningful variable names  
✅ Keep functions small and focused  
✅ Review your own code before submitting

---

## References & Resources

### Documentation

- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [React Docs](https://react.dev)

### Tools

- [ESLint](https://eslint.org/) - JavaScript linting
- [Prettier](https://prettier.io/) - Code formatting
- [Vitest](https://vitest.dev/) - Testing framework
- [Vite](https://vitejs.dev/) - Build tool

---

**Last Updated**: 2026-06-22  
**Version**: 1.0  
**Maintainer**: Development Team
