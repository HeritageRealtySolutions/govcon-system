const express = require('express');
const router = express.Router();
const { supabase } = require('../db');
const { generateProposal, loadTemplates, saveTemplate, buildCostEstimate } = require('../services/proposalAI');

// GET all proposals
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('proposals')
      .select('id, title, agency, naics_code, estimated_value, status, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single proposal
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found' });
    data.proposal_data = JSON.parse(data.proposal_json || '{}');
    data.cost_estimate = JSON.parse(data.cost_estimate_json || '{}');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET templates
router.get('/templates/all', (req, res) => {
  res.json(loadTemplates());
});

// POST save template
router.post('/templates/:name', (req, res) => {
  try {
    saveTemplate(req.params.name, req.body.content);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST cost estimate (no AI)
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

// POST generate full proposal (requires AI key)
router.post('/generate', async (req, res) => {
  try {
    const { opportunity } = req.body;
    if (!opportunity?.title) return res.status(400).json({ error: 'Opportunity with title required' });
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'Anthropic API key not configured' });
    }

    const { data: company } = await supabase
      .from('company_profile')
      .select('*')
      .limit(1)
      .single();

    const result = await generateProposal(opportunity, company);

    const { data, error } = await supabase.from('proposals').insert({
      opportunity_id: String(opportunity.notice_id || opportunity.id || ''),
      pipeline_id:    opportunity.pipeline_id || null,
      title:          opportunity.title,
      agency:         opportunity.agency || null,
      naics_code:     opportunity.naics_code || null,
      estimated_value: opportunity.estimated_value || opportunity.estimated_value_min || null,
      proposal_json:  JSON.stringify(result),
      cost_estimate_json: JSON.stringify(result.cost_estimate || {}),
      status: 'draft',
    }).select().single();
    if (error) throw error;

    if (opportunity.pipeline_id) {
      await supabase
        .from('pipeline')
        .update({ proposal_draft: JSON.stringify(result) })
        .eq('id', opportunity.pipeline_id);
    }

    res.json({ ...result, proposal_id: data.id });
  } catch (err) {
    console.error('Proposal generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['draft', 'review', 'submitted', 'awarded', 'lost'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });
    }
    const { error } = await supabase
      .from('proposals')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE proposal
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('proposals').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
