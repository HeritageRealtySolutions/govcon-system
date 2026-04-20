const express = require('express');
const router = express.Router();
const { supabase } = require('../db');

// GET all pipeline items
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pipeline')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET stats
router.get('/stats', async (req, res) => {
  try {
    const { data, error } = await supabase.from('pipeline').select('*');
    if (error) throw error;
    const items = data || [];

    const counts = [];
    const statusMap = {};
    items.forEach(i => {
      if (!statusMap[i.status]) statusMap[i.status] = { count: 0, value: 0 };
      statusMap[i.status].count++;
      statusMap[i.status].value += parseFloat(i.proposed_price || 0);
    });
    Object.entries(statusMap).forEach(([status, v]) => counts.push({ status, ...v }));

    const awarded = items.filter(i => i.status === 'awarded');
    const awardedValue = awarded.reduce((s, i) => s + parseFloat(i.award_amount || i.proposed_price || 0), 0);
    const totalCount  = items.filter(i => i.status !== 'lost').length;
    const totalValue  = items.filter(i => i.status !== 'lost').reduce((s, i) => s + parseFloat(i.proposed_price || 0), 0);
    const winRate     = items.length > 0 ? Math.round((awarded.length / items.length) * 100) : 0;

    res.json({
      counts,
      total_pipeline: { count: totalCount, value: totalValue },
      awarded: { count: awarded.length, value: awardedValue },
      win_rate: winRate,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add to pipeline
router.post('/', async (req, res) => {
  try {
    const { opportunity_id } = req.body;

    // Check duplicate
    const { data: existing } = await supabase
      .from('pipeline')
      .select('id')
      .eq('opportunity_id', String(opportunity_id))
      .single();

    if (existing) return res.json({ already_exists: true, id: existing.id });

    // Get opportunity details
    const { data: opp } = await supabase
      .from('opportunities')
      .select('*')
      .eq('id', opportunity_id)
      .single();

    const { data, error } = await supabase.from('pipeline').insert({
      opportunity_id: String(opportunity_id),
      title:          opp?.title || 'Untitled',
      agency:         opp?.agency || '',
      deadline:       opp?.response_deadline || null,
      bid_score:      opp?.bid_score || 0,
      status:         'reviewing',
    }).select().single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH update pipeline item
router.patch('/:id', async (req, res) => {
  try {
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    const { error } = await supabase
      .from('pipeline')
      .update(updates)
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE pipeline item
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('pipeline').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
