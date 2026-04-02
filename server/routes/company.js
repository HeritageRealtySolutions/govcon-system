const express = require('express');
const router = express.Router();
const { db } = require('../db');

router.get('/', (req, res) => {
  res.json(db.prepare(`SELECT * FROM company_profile LIMIT 1`).get() || null);
});

router.post('/', (req, res) => {
  const b = req.body;
  const existing = db.prepare(`SELECT id FROM company_profile LIMIT 1`).get();
  if (existing) {
    const fields = Object.keys(b).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE company_profile SET ${fields} WHERE id = ?`).run(...Object.values(b), existing.id);
    res.json({ id: existing.id });
  } else {
    const keys = Object.keys(b).join(', ');
    const placeholders = Object.keys(b).map(() => '?').join(', ');
    const result = db.prepare(`INSERT INTO company_profile (${keys}) VALUES (${placeholders})`).run(...Object.values(b));
    res.json({ id: result.lastInsertRowid });
  }
});

module.exports = router;
