const express = require('express');
const router = express.Router();
const { supabase } = require('../db');
const { fetchOpportunities } = require('../services/samGov');

function calcBidScore(opp) {
  let score = 0;
  const naics = ['238210','238220','238160','561730','236220'];
  if (naics.includes(opp.naics_code)) score += 25;
  const setAside = (opp.set_aside_type || '').toUpperCase();
  if (setAside.includes('8A') || setAside === '8AN') score += 30;
  else if (setAside.includes('SB') || setAside.includes('SMALL')) score += 15;
  const min = parseFloat(opp.estimated_value_min || 0);
  const max = parseFloat(opp.estimated_value_max || 0);
  const avg = max > 0 ? (min + max) / 2 : min;
  if (avg >= 100000 && avg <= 2000000) score += 25;
  else if (avg > 0) score += 10;
  if (opp.response_deadline) {
    const days = (new Date(opp.response_deadline) - new Date()) / 86400000;
    if (days >= 14) score += 20;
    else if (days >= 7) score += 10;
  }
  return Math.min(score, 100);
}

// GET all opportunities
router.get('/', async (req, res) => {
  try {
    let query = supabase.from('opportunities').select('*').order('response_deadline', { ascending: true });
    if (req.query.naics)     query = query.eq('naics_code', req.query.naics);
    if (req.query.set_aside) query = query.eq('set_aside_type', req.query.set_aside);
    if (req.query.min_score) query = query.gte('bid_score', parseInt(req.query.min_score));
    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET stats
router.get('/stats', async (req, res) => {
  try {
    const { data, error } = await supabase.from('opportunities').select('status, bid_score');
    if (error) throw error;
    const counts = [];
    const statusMap = {};
    (data || []).forEach(o => {
      statusMap[o.status] = (statusMap[o.status] || 0) + 1;
    });
    Object.entries(statusMap).forEach(([status, count]) => counts.push({ status, count }));
    const hot_leads = (data || []).filter(o => o.bid_score >= 70).length;
    res.json({ counts, hot_leads });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST sync from SAM.gov
router.get('/sync', async (req, res) => {
  try {
    if (!process.env.SAM_API_KEY) {
      return res.json({ saved: 0, total: 0, error: 'SAM_API_KEY not configured' });
    }
    const opportunities = await fetchOpportunities();
    let saved = 0;
    for (const opp of opportunities) {
      const score = calcBidScore(opp);
      const { error } = await supabase.from('opportunities').upsert({
        notice_id:           opp.notice_id,
        title:               opp.title,
        agency:              opp.agency,
        naics_code:          opp.naics_code,
        set_aside_type:      opp.set_aside_type,
        estimated_value_min: opp.estimated_value_min,
        estimated_value_max: opp.estimated_value_max,
        response_deadline:   opp.response_deadline,
        posted_date:         opp.posted_date,
        description:         opp.description,
        contact_name:        opp.contact_name,
        contact_email:       opp.contact_email,
        city:                opp.city,
        state:               opp.state,
        solicitation_number: opp.solicitation_number,
        bid_score:           score,
        status:              'new',
      }, { onConflict: 'notice_id' });
      if (!error) saved++;
    }
    res.json({ saved, total: opportunities.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
