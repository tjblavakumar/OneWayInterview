const { v4: uuidv4 } = require('uuid');
const { runStmt, getOne } = require('../db');

const LINK_VALIDITY_HOURS = 1;

function createInterviewLink(candidateId) {
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + LINK_VALIDITY_HOURS * 60 * 60 * 1000).toISOString();

  // Invalidate any existing unused links for this candidate
  runStmt('UPDATE interview_links SET used = 1 WHERE candidate_id = ? AND used = 0', [candidateId]);

  runStmt(
    'INSERT INTO interview_links (candidate_id, token, expires_at) VALUES (?, ?, ?)',
    [candidateId, token, expiresAt]
  );

  return token;
}

function validateToken(token) {
  const link = getOne(`
    SELECT il.*, c.id as candidate_id, c.name, c.email, c.position_id, c.status,
           p.title as position_title
    FROM interview_links il
    JOIN candidates c ON il.candidate_id = c.id
    JOIN positions p ON c.position_id = p.id
    WHERE il.token = ?
  `, [token]);

  if (!link) {
    return { valid: false, reason: 'Link not found' };
  }

  if (link.used) {
    return { valid: false, reason: 'Link has already been used' };
  }

  if (new Date(link.expires_at) < new Date()) {
    return { valid: false, reason: 'Link has expired' };
  }

  return { valid: true, link };
}

function markTokenUsed(token) {
  runStmt('UPDATE interview_links SET used = 1 WHERE token = ?', [token]);
}

module.exports = { createInterviewLink, validateToken, markTokenUsed };
