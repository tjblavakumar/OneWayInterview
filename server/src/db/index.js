const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const SCHEMA_SQL = require('./schema');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'interview.db');

let db = null;
let SQL = null;

async function initDb() {
  if (db) return db;

  SQL = await initSqlJs();

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');
  db.run(SCHEMA_SQL);
  saveDb();
  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Helper to convert sql.js exec result to row objects
function execToRows(result) {
  if (!result || result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map(vals => {
    const row = {};
    columns.forEach((col, i) => { row[col] = vals[i]; });
    return row;
  });
}

function runStmt(sql, params = []) {
  const d = getDb();
  // Use prepare/bind/step for write operations to support params
  const stmt = d.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  stmt.step();
  stmt.free();

  const lastId = d.exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0] || 0;
  const changes = d.getRowsModified();
  saveDb();
  return { lastInsertRowid: lastId, changes };
}

function getOne(sql, params = []) {
  const d = getDb();
  // Replace ? placeholders with actual values for db.exec
  // sql.js db.exec doesn't support params directly, so use prepare/bind
  const stmt = d.prepare(sql);
  if (params.length > 0) stmt.bind(params);

  let row = undefined;
  if (stmt.step()) {
    const cols = stmt.getColumnNames();
    const vals = stmt.get();
    row = {};
    cols.forEach((c, i) => { row[c] = vals[i]; });
  }
  stmt.free();
  return row;
}

function getAll(sql, params = []) {
  const d = getDb();
  const stmt = d.prepare(sql);
  if (params.length > 0) stmt.bind(params);

  const rows = [];
  let cols = null;
  while (stmt.step()) {
    if (!cols) cols = stmt.getColumnNames();
    const vals = stmt.get();
    const row = {};
    cols.forEach((c, i) => { row[c] = vals[i]; });
    rows.push(row);
  }
  stmt.free();
  return rows;
}

module.exports = { initDb, getDb, runStmt, getOne, getAll, saveDb };
