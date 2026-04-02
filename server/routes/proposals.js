const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { generateProposal, loadTemplates, saveTemplate } = require('../services/proposalAI');

router.post('/generate', async (req, res) => {
  try {
    const { opportunity } = req.body;
    const company = db.prepare(`SELECT * FROM company_profile LIMIT 1`).get();
    const result = await generateProposal(opportunity, company);
    if (opportunity.pipeline_id) {
      db.prepare(`UPDATE pipeline SET proposal_draft = ? WHERE id = ?`)
        .run(JSON.stringify(result), opportunity.pipeline_id);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/templates', (req, res) => {
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
