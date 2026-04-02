const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(process.env.DATA_DIR || path.join(__dirname, '..'), 'govcon.db');

let _sqlDb = null;
let _inTransaction = false;

function saveToDisk() {
  if (_inTransaction) return;
  const data = _sqlDb.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// Wraps a sql.js prepared statement to mimic better-sqlite3 Statement API
class Statement {
  constructor(sql) {
    this._sql = sql;
  }

  _bindParams(args) {
    if (args.length === 1 && args[0] !== null && typeof args[0] === 'object' && !Array.isArray(args[0])) {
      // Named params object — prefix bare keys with @ to match sql.js binding format
      const prefixed = {};
      for (const [k, v] of Object.entries(args[0])) {
        const key = (k[0] === '@' || k[0] === ':' || k[0] === '$') ? k : `@${k}`;
        prefixed[key] = v;
      }
      return prefixed;
    }
    // Positional: spread args or single array
    return args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
  }

  run(...args) {
    const params = this._bindParams(args);
    _sqlDb.run(this._sql, params);
    const rowid = _sqlDb.exec('SELECT last_insert_rowid()')[0]?.values[0][0] ?? null;
    saveToDisk();
    return { lastInsertRowid: rowid, changes: 1 };
  }

  get(...args) {
    const params = this._bindParams(args);
    const stmt = _sqlDb.prepare(this._sql);
    stmt.bind(params);
    const row = stmt.step() ? stmt.getAsObject() : undefined;
    stmt.free();
    return row;
  }

  all(...args) {
    const params = this._bindParams(args);
    const rows = [];
    const stmt = _sqlDb.prepare(this._sql);
    stmt.bind(params);
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }
}

// Thin proxy that exposes better-sqlite3-compatible prepare/exec/transaction
const db = {
  prepare(sql) {
    return new Statement(sql);
  },

  exec(sql) {
    _sqlDb.run(sql);
    saveToDisk();
  },

  transaction(fn) {
    return (...args) => {
      _inTransaction = true;
      _sqlDb.run('BEGIN');
      try {
        const result = fn(...args);
        _sqlDb.run('COMMIT');
        _inTransaction = false;
        saveToDisk();
        return result;
      } catch (err) {
        _sqlDb.run('ROLLBACK');
        _inTransaction = false;
        throw err;
      }
    };
  }
};

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS opportunities (
    id TEXT PRIMARY KEY,
    title TEXT,
    agency TEXT,
    naics_code TEXT,
    set_aside_type TEXT,
    posted_date TEXT,
    response_deadline TEXT,
    state TEXT,
    city TEXT,
    estimated_value_min REAL,
    estimated_value_max REAL,
    description TEXT,
    solicitation_number TEXT,
    contact_email TEXT,
    contact_name TEXT,
    source TEXT DEFAULT 'federal',
    bid_score INTEGER DEFAULT 0,
    status TEXT DEFAULT 'new',
    raw_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS pipeline (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    opportunity_id TEXT,
    status TEXT DEFAULT 'reviewing',
    bid_decision TEXT,
    proposed_price REAL,
    historical_avg_price REAL,
    historical_low_price REAL,
    historical_high_price REAL,
    competitor_count INTEGER,
    notes TEXT,
    proposal_draft TEXT,
    submission_date TEXT,
    award_date TEXT,
    awarded INTEGER DEFAULT 0,
    award_amount REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS municipal_bids (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    agency TEXT,
    state TEXT DEFAULT 'MS',
    city TEXT,
    naics_code TEXT,
    posted_date TEXT,
    response_deadline TEXT,
    estimated_value REAL,
    description TEXT,
    contact_email TEXT,
    contact_name TEXT,
    bid_number TEXT,
    file_path TEXT,
    bid_score INTEGER DEFAULT 0,
    status TEXT DEFAULT 'new',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS company_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT,
    owner_name TEXT,
    uei_number TEXT,
    cage_code TEXT,
    ein TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    certifications TEXT,
    naics_codes TEXT,
    bonding_capacity REAL,
    years_in_business INTEGER,
    employee_count INTEGER
  );

  CREATE TABLE IF NOT EXISTS pricing_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    naics_code TEXT,
    agency TEXT,
    award_count INTEGER,
    avg_award REAL,
    min_award REAL,
    max_award REAL,
    cached_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

async function initDB() {
  const SQL = await initSqlJs();
  const fileBuffer = fs.existsSync(DB_PATH) ? fs.readFileSync(DB_PATH) : null;
  _sqlDb = new SQL.Database(fileBuffer ? new Uint8Array(fileBuffer) : undefined);
  // Run each statement individually to avoid sql.js multi-statement issues
  for (const stmt of SCHEMA.split(';').map(s => s.trim()).filter(Boolean)) {
    _sqlDb.run(stmt);
  }
  saveToDisk();
  console.log('Database initialized');
}

module.exports = { db, initDB };
