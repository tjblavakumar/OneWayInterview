const express = require('express');
const router = express.Router();
const { runStmt, getOne, getAll } = require('../db');
const { createInterviewLink } = require('../services/linkService');
const { sendInterviewLink, sendResubmitRequest } = require('../services/email');
const { deleteVideos } = require('../services/storage');

// ─── Positions ───────────────────────────────────────────

router.get('/positions', (req, res) => {
  const positions = getAll('SELECT * FROM positions ORDER BY created_at DESC');
  res.json(positions);
});

router.post('/positions', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Position title is required' });
  }
  try {
    const result = runStmt('INSERT INTO positions (title) VALUES (?)', [title.trim()]);
    const position = getOne('SELECT * FROM positions WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(position);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Position already exists' });
    }
    throw err;
  }
});

router.delete('/positions/:id', (req, res) => {
  const result = runStmt('DELETE FROM positions WHERE id = ?', [req.params.id]);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

// ─── Questions ───────────────────────────────────────────

router.get('/positions/:positionId/questions', (req, res) => {
  const questions = getAll(
    'SELECT * FROM questions WHERE position_id = ? ORDER BY sort_order ASC',
    [req.params.positionId]
  );
  res.json(questions);
});

router.post('/positions/:positionId/questions', (req, res) => {
  const { question_text, sort_order } = req.body;
  if (!question_text || !question_text.trim()) {
    return res.status(400).json({ error: 'Question text is required' });
  }

  const count = getOne('SELECT COUNT(*) as cnt FROM questions WHERE position_id = ?', [req.params.positionId]);
  if (count.cnt >= 5) {
    return res.status(400).json({ error: 'Maximum 5 questions per position' });
  }

  const order = sort_order ?? count.cnt;
  const result = runStmt(
    'INSERT INTO questions (position_id, question_text, sort_order) VALUES (?, ?, ?)',
    [req.params.positionId, question_text.trim(), order]
  );

  const question = getOne('SELECT * FROM questions WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(question);
});

router.put('/questions/:id', (req, res) => {
  const { question_text, sort_order } = req.body;
  const sets = [];
  const params = [];

  if (question_text !== undefined) { sets.push('question_text = ?'); params.push(question_text.trim()); }
  if (sort_order !== undefined) { sets.push('sort_order = ?'); params.push(sort_order); }

  if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update' });
  params.push(req.params.id);

  runStmt(`UPDATE questions SET ${sets.join(', ')} WHERE id = ?`, params);
  const question = getOne('SELECT * FROM questions WHERE id = ?', [req.params.id]);
  res.json(question);
});

router.delete('/questions/:id', (req, res) => {
  const result = runStmt('DELETE FROM questions WHERE id = ?', [req.params.id]);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

// ─── Candidates ──────────────────────────────────────────

router.get('/candidates', (req, res) => {
  const { position_id, status } = req.query;
  let sql = `
    SELECT c.*, p.title as position_title,
           il.token as latest_token, il.expires_at as link_expires_at, il.used as link_used
    FROM candidates c
    JOIN positions p ON c.position_id = p.id
    LEFT JOIN interview_links il ON il.candidate_id = c.id
      AND il.id = (SELECT MAX(id) FROM interview_links WHERE candidate_id = c.id)
  `;
  const conditions = [];
  const params = [];

  if (position_id) { conditions.push('c.position_id = ?'); params.push(position_id); }
  if (status) { conditions.push('c.status = ?'); params.push(status); }

  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY c.created_at DESC';

  const candidates = getAll(sql, params);
  res.json(candidates);
});

router.post('/candidates', async (req, res) => {
  try {
    const { name, email, position_id, expiry_date } = req.body;

    if (!name || !email || !position_id || !expiry_date) {
      return res.status(400).json({ error: 'name, email, position_id, and expiry_date are required' });
    }

    const position = getOne('SELECT * FROM positions WHERE id = ?', [position_id]);
    if (!position) return res.status(404).json({ error: 'Position not found' });

    const questions = getOne('SELECT COUNT(*) as cnt FROM questions WHERE position_id = ?', [position_id]);
    if (questions.cnt === 0) {
      return res.status(400).json({ error: 'Position must have at least one question before inviting candidates' });
    }

    const result = runStmt(
      'INSERT INTO candidates (name, email, position_id, expiry_date) VALUES (?, ?, ?, ?)',
      [name.trim(), email.trim(), position_id, expiry_date]
    );

    const candidateId = result.lastInsertRowid;
    const token = createInterviewLink(candidateId);

    const candidate = getOne(`
      SELECT c.*, p.title as position_title
      FROM candidates c JOIN positions p ON c.position_id = p.id
      WHERE c.id = ?
    `, [candidateId]);

    await sendInterviewLink(candidate, token);

    res.status(201).json({ ...candidate, token });
  } catch (err) {
    console.error('Error creating candidate:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/candidates/:id', (req, res) => {
  const candidate = getOne(`
    SELECT c.*, p.title as position_title
    FROM candidates c JOIN positions p ON c.position_id = p.id
    WHERE c.id = ?
  `, [req.params.id]);

  if (!candidate) return res.status(404).json({ error: 'Not found' });

  const responses = getAll(`
    SELECT r.*, q.question_text
    FROM responses r JOIN questions q ON r.question_id = q.id
    WHERE r.candidate_id = ?
    ORDER BY q.sort_order ASC
  `, [req.params.id]);

  const feedback = getAll(
    'SELECT * FROM candidate_feedback WHERE candidate_id = ? ORDER BY created_at DESC',
    [req.params.id]
  );

  const links = getAll(
    'SELECT * FROM interview_links WHERE candidate_id = ? ORDER BY created_at DESC',
    [req.params.id]
  );

  res.json({ ...candidate, responses, feedback, links });
});

// ─── Resend Link ─────────────────────────────────────────

router.post('/candidates/:id/resend-link', async (req, res) => {
  try {
    const candidate = getOne(`
      SELECT c.*, p.title as position_title
      FROM candidates c JOIN positions p ON c.position_id = p.id
      WHERE c.id = ?
    `, [req.params.id]);

    if (!candidate) return res.status(404).json({ error: 'Not found' });

    const token = createInterviewLink(candidate.id);
    runStmt("UPDATE candidates SET status = 'resent_link_done' WHERE id = ?", [candidate.id]);

    await sendInterviewLink(candidate, token);

    res.json({ success: true, token });
  } catch (err) {
    console.error('Error resending link:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Request Resubmit ───────────────────────────────────

router.post('/candidates/:id/request-resubmit', async (req, res) => {
  try {
    const { message } = req.body;
    const candidate = getOne(`
      SELECT c.*, p.title as position_title
      FROM candidates c JOIN positions p ON c.position_id = p.id
      WHERE c.id = ?
    `, [req.params.id]);

    if (!candidate) return res.status(404).json({ error: 'Not found' });

    // Delete old responses
    runStmt('DELETE FROM responses WHERE candidate_id = ?', [candidate.id]);
    deleteVideos(candidate.id);

    const token = createInterviewLink(candidate.id);
    runStmt("UPDATE candidates SET status = 'link_sent' WHERE id = ?", [candidate.id]);

    await sendResubmitRequest(candidate, token, message);

    res.json({ success: true, token });
  } catch (err) {
    console.error('Error requesting resubmit:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Mark Complete ───────────────────────────────────────

router.post('/candidates/:id/mark-complete', (req, res) => {
  const result = runStmt("UPDATE candidates SET status = 'complete_1way_interview' WHERE id = ?", [req.params.id]);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

// ─── Dashboard Stats ─────────────────────────────────────

router.get('/dashboard/stats', (req, res) => {
  const byStatus = getAll('SELECT status, COUNT(*) as count FROM candidates GROUP BY status');

  const byPosition = getAll(`
    SELECT p.title, p.id as position_id, COUNT(c.id) as count
    FROM positions p LEFT JOIN candidates c ON p.id = c.position_id
    GROUP BY p.id ORDER BY count DESC
  `);

  const total = getOne('SELECT COUNT(*) as count FROM candidates');

  res.json({ total: total.count, byStatus, byPosition });
});

module.exports = router;
