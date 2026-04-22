require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDb } = require('./db');

const adminRoutes = require('./routes/admin');
const candidateRoutes = require('./routes/candidate');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: [
    process.env.ADMIN_APP_URL || 'http://localhost:3001',
    process.env.CANDIDATE_APP_URL || 'http://localhost:3002',
  ],
  credentials: true,
}));
app.use(express.json());

// ─── API Routes ──────────────────────────────────────────
app.use('/api/admin', adminRoutes);
app.use('/api/candidate', candidateRoutes);

// ─── Video Streaming ─────────────────────────────────────
const uploadsDir = path.join(__dirname, '..', 'uploads');
app.get('/api/videos/:candidateId/:filename', (req, res) => {
  const filePath = path.join(uploadsDir, 'videos', req.params.candidateId, req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Video not found' });
  }

  const stat = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = ext === '.mp4' ? 'video/mp4' : 'video/webm';

  // Support range requests for video streaming
  const range = req.headers.range;
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': mimeType,
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': mimeType,
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

// ─── Root & Health Check ─────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    service: 'OneWay Interview API',
    status: 'running',
    endpoints: {
      admin: '/api/admin',
      candidate: '/api/candidate',
      health: '/api/health',
    },
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Error Handler ───────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start Server ────────────────────────────────────────
async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Admin API:     http://localhost:${PORT}/api/admin`);
    console.log(`Candidate API: http://localhost:${PORT}/api/candidate`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
