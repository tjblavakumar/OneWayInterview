const express = require('express');
const multer = require('multer');
const router = express.Router();
const { runStmt, getOne, getAll } = require('../db');
const { validateToken, markTokenUsed } = require('../services/linkService');
const { saveVideo } = require('../services/storage');
const { sendSubmissionConfirmation } = require('../services/email');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB max
});

// ─── Validate interview link ────────────────────────────

router.get('/interview/:token', (req, res) => {
  const result = validateToken(req.params.token);

  if (!result.valid) {
    return res.status(410).json({ error: result.reason });
  }

  const questions = getAll(
    'SELECT id, question_text, sort_order FROM questions WHERE position_id = ? ORDER BY sort_order ASC',
    [result.link.position_id]
  );

  res.json({
    candidate: {
      id: result.link.candidate_id,
      name: result.link.name,
      position_title: result.link.position_title,
    },
    questions,
    expires_at: result.link.expires_at,
  });
});

// ─── Start interview (marks token as used) ──────────────

router.post('/interview/:token/start', (req, res) => {
  const result = validateToken(req.params.token);

  if (!result.valid) {
    return res.status(410).json({ error: result.reason });
  }

  markTokenUsed(req.params.token);
  res.json({ success: true, message: 'Interview started' });
});

// ─── Upload video response ──────────────────────────────

router.post('/interview/:token/upload', upload.single('video'), (req, res) => {
  const { token } = req.params;
  const { question_id, duration } = req.body;

  // For upload we check by candidate association (token already marked used at start)
  const link = getOne(`
    SELECT il.*, c.id as candidate_id
    FROM interview_links il
    JOIN candidates c ON il.candidate_id = c.id
    WHERE il.token = ?
  `, [token]);

  if (!link) {
    return res.status(404).json({ error: 'Invalid token' });
  }

  if (new Date(link.expires_at) < new Date()) {
    return res.status(410).json({ error: 'Session expired' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No video file provided' });
  }

  const videoPath = saveVideo(link.candidate_id, question_id, req.file.buffer, req.file.mimetype);

  // Upsert response (replace if re-recorded)
  const existing = getOne(
    'SELECT id FROM responses WHERE candidate_id = ? AND question_id = ?',
    [link.candidate_id, question_id]
  );

  if (existing) {
    runStmt(
      'UPDATE responses SET video_path = ?, duration = ?, submitted_at = CURRENT_TIMESTAMP WHERE id = ?',
      [videoPath, duration || null, existing.id]
    );
  } else {
    runStmt(
      'INSERT INTO responses (candidate_id, question_id, video_path, duration) VALUES (?, ?, ?, ?)',
      [link.candidate_id, question_id, videoPath, duration || null]
    );
  }

  res.json({ success: true, video_path: videoPath });
});

// ─── Submit interview (final) ───────────────────────────

router.post('/interview/:token/submit', async (req, res) => {
  try {
    const { token } = req.params;
    const { comment } = req.body;

    const link = getOne(`
      SELECT il.*, c.id as candidate_id, c.name, c.email, c.position_id
      FROM interview_links il
      JOIN candidates c ON il.candidate_id = c.id
      WHERE il.token = ?
    `, [token]);

    if (!link) {
      return res.status(404).json({ error: 'Invalid token' });
    }

    // Save feedback if provided
    if (comment && comment.trim()) {
      runStmt(
        'INSERT INTO candidate_feedback (candidate_id, comment) VALUES (?, ?)',
        [link.candidate_id, comment.trim()]
      );
    }

    // Update candidate status
    runStmt("UPDATE candidates SET status = 'candidate_response_received' WHERE id = ?", [link.candidate_id]);

    // Send confirmation email
    await sendSubmissionConfirmation({ name: link.name, email: link.email });

    res.json({ success: true, message: 'Interview submitted successfully' });
  } catch (err) {
    console.error('Error submitting interview:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
