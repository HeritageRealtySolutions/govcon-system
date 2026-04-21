const express = require('express');
const router = express.Router();
const axios = require('axios');
const { supabase } = require('../db');

const NAICS_MAP = {
  '238210': 'Electrical Contractors',
  '238220': 'Plumbing / HVAC',
  '238160': 'Roofing Contractors',
  '561730': 'Landscaping Services',
  '236220': 'General Construction',
};

function safeParseAgencies(raw) {
  try { return JSON.parse(raw || '[]'); } catch { return []; }
}

// ── COMPETITOR TRACKING ─────────────────────────────────────────────────────

async function fetchCompetitors(naicsCode) {
  const response = await axios.post(
    'https://api.usaspending.gov/api/v2/search/spending_by_award/',
    {
      filters: {
        naics_codes: [naicsCode],
        time_period: [{ start_date: '2022-01-01', end_date: '2025-12-31' }],
        set_aside_type_codes: ['SBA', '8AN', 'SBP'],
      },
      fields: ['Award Amount', 'Recipient Name', 'awarding_agency_name'],
      limit: 100,
      page: 1,
    },
    { timeout: 30000 }
  );

  const results = response.data?.results || [];

  const companyMap = {};
  for (const r of results) {
    const name   = r['Recipient Name'];
    const amount = parseFloat(r['Award Amount'] || 0);
    const agency = r['awarding_agency_name'] || '';
    if (!name || amount <= 0) continue;
    if (!companyMap[name]) {
      companyMap[name] = { total: 0, count: 0, agencies: new Set() };
    }
    companyMap[name].total += amount;
    companyMap[name].count++;
    if (agency) companyMap[name].agencies.add(agency);
  }

  return Object.entries(companyMap)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)
    .map(([name, data]) => ({
      naics_code: naicsCode,
      company_name: name,
      total_award_amount: data.total,
      award_count: data.count,
      avg_award: data.total / data.count,
      top_agencies: JSON.stringify([...data.agencies].slice(0, 3)),
    }));
}

router.get('/competitors/:naicsCode', async (req, res) => {
  try {
    const { naicsCode } = req.params;

    const { data: existing } = await supabase
      .from('competitors')
      .select('*')
      .eq('naics_code', naicsCode)
      .gte('last_updated', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('total_award_amount', { ascending: false });

    if (existing && existing.length > 0) {
      return res.json(existing.map(c => ({ ...c, top_agencies: safeParseAgencies(c.top_agencies) })));
    }

    const competitors = await fetchCompetitors(naicsCode);

    await supabase.from('competitors').delete().eq('naics_code', naicsCode);

    if (competitors.length > 0) {
      await supabase.from('competitors').insert(competitors);
    }

    res.json(competitors.map(c => ({ ...c, top_agencies: safeParseAgencies(c.top_agencies) })));
  } catch (err) {
    console.error('Competitor fetch error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/competitors', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('competitors')
      .select('*')
      .order('total_award_amount', { ascending: false });
    if (error) throw error;
    res.json((data || []).map(c => ({ ...c, top_agencies: safeParseAgencies(c.top_agencies) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── NAICS PERFORMANCE SCORING ───────────────────────────────────────────────

async function scoreNaics(naicsCode) {
  try {
    const response = await axios.post(
      'https://api.usaspending.gov/api/v2/search/spending_by_award/',
      {
        filters: {
          naics_codes: [naicsCode],
          time_period: [{ start_date: '2022-01-01', end_date: '2025-12-31' }],
          set_aside_type_codes: ['SBA', '8AN', 'SBP'],
        },
        fields: ['Award Amount', 'Recipient Name'],
        limit: 100,
        page: 1,
      },
      { timeout: 30000 }
    );

    const results = response.data?.results || [];
    const amounts = results.map(r => parseFloat(r['Award Amount'] || 0)).filter(v => v > 0);
    const uniqueCompanies = new Set(results.map(r => r['Recipient Name']).filter(Boolean));

    const contractVolume   = amounts.length;
    const totalMarketValue = amounts.reduce((a, b) => a + b, 0);
    const avgAwardSize     = contractVolume > 0 ? totalMarketValue / contractVolume : 0;
    const competitionPool  = uniqueCompanies.size;

    let score = 0;
    if (contractVolume >= 50) score += 30;
    else if (contractVolume >= 20) score += 20;
    else if (contractVolume >= 10) score += 10;

    if (avgAwardSize >= 100000 && avgAwardSize <= 2000000) score += 30;
    else if (avgAwardSize >= 50000) score += 15;

    if (competitionPool <= 10) score += 40;
    else if (competitionPool <= 20) score += 30;
    else if (competitionPool <= 40) score += 20;
    else score += 10;

    return {
      naics_code: naicsCode,
      naics_description: NAICS_MAP[naicsCode] || naicsCode,
      contract_volume: contractVolume,
      avg_award_size: avgAwardSize,
      total_market_value: totalMarketValue,
      competition_pool: competitionPool,
      score: Math.min(score, 100),
      last_updated: new Date().toISOString(),
    };
  } catch (err) {
    return {
      naics_code: naicsCode,
      naics_description: NAICS_MAP[naicsCode] || naicsCode,
      contract_volume: 0,
      avg_award_size: 0,
      total_market_value: 0,
      competition_pool: 0,
      score: 0,
      last_updated: new Date().toISOString(),
    };
  }
}

router.get('/naics-scores', async (req, res) => {
  try {
    const { data: existing } = await supabase
      .from('naics_scores')
      .select('*')
      .gte('last_updated', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (existing && existing.length >= 5) {
      return res.json([...existing].sort((a, b) => b.score - a.score));
    }

    const scores = await Promise.all(Object.keys(NAICS_MAP).map(scoreNaics));

    for (const score of scores) {
      await supabase.from('naics_scores').upsert(score, { onConflict: 'naics_code' });
    }

    res.json([...scores].sort((a, b) => b.score - a.score));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/naics-scores/refresh', async (req, res) => {
  try {
    const scores = await Promise.all(Object.keys(NAICS_MAP).map(scoreNaics));
    for (const score of scores) {
      await supabase.from('naics_scores').upsert(score, { onConflict: 'naics_code' });
    }
    res.json({ success: true, scores: [...scores].sort((a, b) => b.score - a.score) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ROI TRACKING ────────────────────────────────────────────────────────────

router.get('/roi', async (req, res) => {
  try {
    const { data: pipeline, error } = await supabase
      .from('pipeline')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const items = pipeline || [];
    const defaultRate = 150;

    const summary = items.map(item => {
      const hours         = parseFloat(item.hours_spent || 0);
      const rate          = parseFloat(item.hourly_rate || defaultRate);
      const bidCost       = hours * rate;
      const contractValue = parseFloat(item.award_amount || item.proposed_price || 0);
      const awardAmount   = parseFloat(item.award_amount || 0);

      // Calibrated ROI: actual outcomes override probability estimates
      const isAwarded = item.status === 'awarded';
      const isLost    = item.status === 'lost';

      const winProb = isAwarded ? 1.0
                    : isLost    ? 0
                    : parseFloat(item.win_probability || 25) / 100;

      const expectedValue = isAwarded
        ? (awardAmount || contractValue)
        : isLost
          ? 0
          : contractValue * winProb;

      const roi = bidCost > 0 ? ((expectedValue - bidCost) / bidCost) * 100 : 0;

      return {
        id: item.id,
        title: item.title,
        agency: item.agency,
        status: item.status,
        hours_spent: hours,
        hourly_rate: rate,
        bid_cost: bidCost,
        contract_value: contractValue,
        win_probability: item.win_probability || 25,
        expected_value: expectedValue,
        roi_percent: Math.round(roi),
        awarded: item.awarded,
        award_amount: item.award_amount,
      };
    });

    const totalBidCost     = summary.reduce((s, i) => s + i.bid_cost, 0);
    const totalAwarded     = summary.filter(i => i.status === 'awarded');
    const totalRevenue     = totalAwarded.reduce((s, i) => s + (parseFloat(i.award_amount) || parseFloat(i.contract_value) || 0), 0);
    const costPerAward     = totalAwarded.length > 0 ? totalBidCost / totalAwarded.length : 0;

    res.json({
      items: summary,
      totals: {
        total_bids:     items.length,
        total_bid_cost: totalBidCost,
        total_revenue:  totalRevenue,
        total_awarded:  totalAwarded.length,
        cost_per_award: costPerAward,
        overall_roi:    totalBidCost > 0 ? Math.round(((totalRevenue - totalBidCost) / totalBidCost) * 100) : 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/roi/:id', async (req, res) => {
  try {
    const { hours_spent, hourly_rate, win_probability } = req.body;
    const updates = {};
    if (hours_spent     !== undefined) updates.hours_spent     = hours_spent;
    if (hourly_rate     !== undefined) updates.hourly_rate     = hourly_rate;
    if (win_probability !== undefined) updates.win_probability = win_probability;
    updates.updated_at = new Date().toISOString();

    const { error } = await supabase.from('pipeline').update(updates).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
