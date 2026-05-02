const express = require('express');
const router  = express.Router();
const { supabase } = require('../db');
const { syncSLEDBids } = require('../services/sledScraper');
const { calculateWinProbability } = require('../services/winProbability');

// GET all SLED bids with filters
router.get('/', async (req, res) => {
  try {
    const { state, naics, min_score, status } = req.query;
    let query = supabase
      .from('sled_bids')
      .select('*')
      .order('bid_score', { ascending: false });

    if (state)     query = query.eq('state', state);
    if (naics)     query = query.eq('naics_code', naics);
    if (min_score) query = query.gte('bid_score', parseInt(min_score));
    if (status)    query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET stats
router.get('/stats', async (req, res) => {
  try {
    const { data } = await supabase.from('sled_bids').select('state, bid_score, status, response_deadline');
    const items    = data || [];
    const now      = new Date();

    res.json({
      total:       items.length,
      by_state:    Object.entries(items.reduce((acc, b) => { acc[b.state] = (acc[b.state] || 0) + 1; return acc; }, {})).map(([state, count]) => ({ state, count })),
      hot:         items.filter(b => b.bid_score >= 70).length,
      expiring:    items.filter(b => b.response_deadline && Math.ceil((new Date(b.response_deadline) - now) / 86400000) <= 14 && Math.ceil((new Date(b.response_deadline) - now) / 86400000) >= 0).length,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST sync SLED bids
router.post('/sync', async (req, res) => {
  try {
    const result = await syncSLEDBids();
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('SLED sync error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST add to pipeline from SLED
router.post('/:id/pipeline', async (req, res) => {
  try {
    const { data: bid } = await supabase.from('sled_bids').select('*').eq('id', req.params.id).single();
    if (!bid) return res.status(404).json({ error: 'Bid not found' });

    const { data: existing } = await supabase.from('pipeline').select('id').eq('sled_bid_id', bid.id).single();
    if (existing) return res.json({ already_exists: true, id: existing.id });

    const { data, error } = await supabase.from('pipeline').insert({
      title:          bid.title,
      agency:         bid.agency,
      naics_code:     bid.naics_code,
      source:         'sled',
      sled_bid_id:    bid.id,
      deadline:       bid.response_deadline,
      proposed_price: bid.estimated_value,
      bid_score:      bid.bid_score,
      status:         'reviewing',
      notes:          `State: ${bid.state} | Portal: ${bid.source_portal} | Bid #: ${bid.bid_number || 'N/A'}`,
    }).select().single();

    if (error) throw error;
    res.json({ success: true, pipeline_id: data.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
