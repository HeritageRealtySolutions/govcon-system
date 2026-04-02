const express = require('express');
const router = express.Router();
const { db } = require('../db');

router.get('/stats', (req, res) => {
  const total = db.prepare(`SELECT COUNT(*) as count, SUM(proposed_price) as value FROM pipeline`).get();
  const awarded = db.prepare(`SELECT COUNT(*) as count, SUM(award_amount) as value FROM pipeline WHERE awarded = 1`).get();
  const submitted = db.prepare(`SELECT COUNT(*) as count FROM pipeline WHERE status IN ('submitted','awarded','lost')`).get();
  const winRate = submitted.count > 0 ? ((awarded.count / submitted.count) * 100).toFixed(1) : 0;
  res.json({ total_pipeline: total, awarded, submitted: submitted.count, win_rate: winRate });
});

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT p.*,
      COALESCE(o.title, m.title) as title,
      COALESCE(o.agency, m.agency) as agency,
      COALESCE(o.response_deadline, m.response_deadline) as deadline,
      COALESCE(o.naics_code, m.naics_code) as naics_code,
      COALESCE(o.bid_score, m.bid_score) as bid_score,
      o.set_aside_type, o.source
    FROM pipeline p
    LEFT JOIN opportunities o ON p.opportunity_id = o.id
    LEFT JOIN municipal_bids m ON p.opportunity_id = CAST(m.id AS TEXT)
    ORDER BY p.created_at DESC
  `).all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { opportunity_id, proposed_price, notes } = req.body;
  const existing = db.prepare(`SELECT id FROM pipeline WHERE opportunity_id = ?`).get(opportunity_id);
  if (existing) return res.json({ id: existing.id, already_exists: true });
  const result = db.prepare(`
    INSERT INTO pipeline (opportunity_id, proposed_price, notes) VALUES (?, ?, ?)
  `).run(opportunity_id, proposed_price, notes);
  res.json({ id: result.lastInsertRowid });
});

router.patch('/:id', (req, res) => {
  const allowed = ['status','bid_decision','proposed_price','historical_avg_price','historical_low_price',
    'historical_high_price','competitor_count','notes','proposal_draft','submission_date','award_date','awarded','award_amount'];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields' });
  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE pipeline SET ${fields} WHERE id = ?`).run(...Object.values(updates), req.params.id);
  res.json({ success: true });
});

module.exports = router;
