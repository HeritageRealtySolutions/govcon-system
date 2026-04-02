const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { syncSAMOpportunities } = require('../services/samGov');

router.get('/stats', (req, res) => {
  const counts = db.prepare(`SELECT status, COUNT(*) as count FROM opportunities GROUP BY status`).all();
  const avgScore = db.prepare(`SELECT AVG(bid_score) as avg FROM opportunities`).get();
  const hot = db.prepare(`SELECT COUNT(*) as count FROM opportunities WHERE bid_score >= 70`).get();
  res.json({ counts, avg_score: avgScore?.avg || 0, hot_leads: hot?.count || 0 });
});

router.get('/sync', async (req, res) => {
  try {
    const result = await syncSAMOpportunities();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', (req, res) => {
  const { naics, set_aside, min_score, status } = req.query;
  let query = `SELECT * FROM opportunities WHERE 1=1`;
  const params = [];
  if (naics) { query += ` AND naics_code = ?`; params.push(naics); }
  if (set_aside) { query += ` AND set_aside_type = ?`; params.push(set_aside); }
  if (min_score) { query += ` AND bid_score >= ?`; params.push(parseInt(min_score)); }
  if (status) { query += ` AND status = ?`; params.push(status); }
  query += ` ORDER BY bid_score DESC`;
  res.json(db.prepare(query).all(...params));
});

router.get('/:id', (req, res) => {
  const row = db.prepare(`SELECT * FROM opportunities WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  db.prepare(`UPDATE opportunities SET status = ? WHERE id = ?`).run(status, req.params.id);
  res.json({ success: true });
});

module.exports = router;
