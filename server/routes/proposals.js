const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { generateProposal, loadTemplates, saveTemplate, buildCostEstimate } = require('../services/proposalAI');

// ── ENSURE PROPOSALS TABLE EXISTS ───────────────────────────────────────────
db.prepare(`
  CREATE TABLE IF NOT EXISTS proposals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    opportunity_id TEXT,
    pipeline_id INTEGER,
    title TEXT,
    agency TEXT,
    naics_code TEXT,
    estimated_value REAL,
    proposal_json TEXT,
    cost_estimate_json TEXT,
    status TEXT DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// ── GET ALL PROPOSALS ────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  try {
    const proposals = db.prepare(`
      SELECT id, title, agency, naics_code, estimated_value, status, created_at, updated_at
      FROM proposals
      ORDER BY created_at DESC
    `).all();
    res.json(proposals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET SINGLE PROPOSAL ──────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  try {
    const proposal = db.prepare(`SELECT * FROM proposals WHERE id = ?`).get(req.params.id);
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
    proposal.proposal_data    = JSON.parse(proposal.proposal_json    || '{}');
    proposal.cost_estimate    = JSON.parse(proposal.cost_estimate_json || '{}');
    res.json(proposal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GENERATE PROPOSAL ────────────────────────────────────────────────────────
router.post('/generate', async (req, res) => {
  try {
    const { opportunity } = req.body;

    if (!opportunity || !opportunity.title) {
      return res.status(400).json({ error: 'Opportunity with title is required' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'Anthropic API key not configured. Add ANTHROPIC_API_KEY in Railway Variables.' });
    }

    const company = db.prepare(`SELECT * FROM company_profile LIMIT 1`).get();
    const result  = await generateProposal(opportunity, company);

    // Always save to proposals table
    const saved = db.prepare(`
      INSERT INTO proposals
        (opportunity_id, pipeline_id, title, agency, naics_code, estimated_value,
         proposal_json, cost_estimate_json, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')
    `).run(
      opportunity.notice_id   || opportunity.id || null,
      opportunity.pipeline_id || null,
      opportunity.title,
      opportunity.agency      || null,
      opportunity.naics_code  || null,
      opportunity.estimated_value || opportunity.estimated_value_min || null,
      JSON.stringify(result),
      JSON.stringify(result.cost_estimate || {})
    );

    // Also update pipeline if linked
    if (opportunity.pipeline_id) {
      db.prepare(`UPDATE pipeline SET proposal_draft = ? WHERE id = ?`)
        .run(JSON.stringify(result), opportunity.pipeline_id);
    }

    res.json({ ...result, proposal_id: saved.lastInsertRowid });

  } catch (err) {
    console.error('Proposal generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── COST ESTIMATE ONLY (no AI, instant) ─────────────────────────────────────
router.post('/estimate', (req, res) => {
  try {
    const { opportunity } = req.body;
    if (!opportunity) return res.status(400).json({ error: 'Opportunity required' });
    const estimate = buildCostEstimate(opportunity);
    res.json(estimate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── UPDATE PROPOSAL STATUS ───────────────────────────────────────────────────
router.patch('/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['draft', 'review', 'submitted', 'awarded', 'lost'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });
    }
    db.prepare(`UPDATE proposals SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(status, req.params.id);
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE PROPOSAL ──────────────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  try {
    db.prepare(`DELETE FROM proposals WHERE id = ?`).run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── TEMPLATES ────────────────────────────────────────────────────────────────
router.get('/templates/all', (req, res) => {
  res.json(loadTemplates());
});

router.post('/templates/:name', (req, res) => {
  try {
    saveTemplate(req.params.name, req.body.content);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
