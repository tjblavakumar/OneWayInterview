const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'videos');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function saveVideo(candidateId, questionId, fileBuffer, mimetype) {
  const ext = mimetype === 'video/mp4' ? 'mp4' : 'webm';
  const candidateDir = path.join(UPLOAD_DIR, String(candidateId));
  ensureDir(candidateDir);

  const filename = `q${questionId}_${Date.now()}.${ext}`;
  const filePath = path.join(candidateDir, filename);
  fs.writeFileSync(filePath, fileBuffer);

  // Return relative path for DB storage
  return `videos/${candidateId}/${filename}`;
}

function getVideoPath(relativePath) {
  return path.join(UPLOAD_DIR, '..', relativePath);
}

function deleteVideos(candidateId) {
  const candidateDir = path.join(UPLOAD_DIR, String(candidateId));
  if (fs.existsSync(candidateDir)) {
    fs.rmSync(candidateDir, { recursive: true, force: true });
  }
}

module.exports = { saveVideo, getVideoPath, deleteVideos, UPLOAD_DIR };
