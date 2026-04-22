require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

async function start() {
  const { initDB } = require('./db');
  await initDB();

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  app.get('/cron/sync-opportunities', async (req, res) => {
  const secret = req.headers['x-cron-secret'];
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const results = {};

    // 1 — SAM.gov sync
    const { syncSAMOpportunities } = require('./services/samGov');
    results.sam = await syncSAMOpportunities();
    console.log(`[CRON] SAM.gov: ${results.sam.saved} saved of ${results.sam.total}`);

    // 2 — NAICS scores refresh
    const axios = require('axios');
    const { supabase } = require('./db');
    const NAICS = ['238210','238220','238160','561730','236220'];
    const NAICS_MAP = { '238210':'Electrical','238220':'Plumbing/HVAC','238160':'Roofing','561730':'Landscaping','236220':'General Construction' };

    async function scoreNaics(naicsCode) {
      try {
        const r = await axios.post('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
          filters: { naics_codes: [naicsCode], time_period: [{ start_date: '2022-01-01', end_date: '2025-12-31' }], set_aside_type_codes: ['SBA','8AN','SBP'] },
          fields: ['Award Amount','Recipient Name'], limit: 100, page: 1,
        }, { timeout: 30000 });
        const items = r.data?.results || [];
        const amounts = items.map(i => parseFloat(i['Award Amount'] || 0)).filter(v => v > 0);
        const unique = new Set(items.map(i => i['Recipient Name']).filter(Boolean));
        const vol = amounts.length, total = amounts.reduce((a,b) => a+b, 0), avg = vol > 0 ? total/vol : 0, pool = unique.size;
        let score = 0;
        if (vol >= 50) score += 30; else if (vol >= 20) score += 20; else if (vol >= 10) score += 10;
        if (avg >= 100000 && avg <= 2000000) score += 30; else if (avg >= 50000) score += 15;
        if (pool <= 10) score += 40; else if (pool <= 20) score += 30; else if (pool <= 40) score += 20; else score += 10;
        return { naics_code: naicsCode, naics_description: NAICS_MAP[naicsCode], contract_volume: vol, avg_award_size: avg, total_market_value: total, competition_pool: pool, score: Math.min(score, 100), last_updated: new Date().toISOString() };
      } catch { return { naics_code: naicsCode, naics_description: NAICS_MAP[naicsCode], contract_volume: 0, avg_award_size: 0, total_market_value: 0, competition_pool: 0, score: 0, last_updated: new Date().toISOString() }; }
    }

    const scores = await Promise.all(NAICS.map(scoreNaics));
    for (const s of scores) await supabase.from('naics_scores').upsert(s, { onConflict: 'naics_code' });
    results.naics = scores.length;
    console.log(`[CRON] NAICS scores refreshed: ${scores.length} codes`);

    // 3 — Recompetes refresh
    const now = new Date();
    const window = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
    const allRecompetes = [];
    for (const naics of NAICS) {
      try {
        const r = await axios.post('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
          filters: { naics_codes: [naics], time_period: [{ start_date: now.toISOString().split('T')[0], end_date: window.toISOString().split('T')[0], date_type: 'action_date' }] },
          fields: ['Award ID','Recipient Name','Award Amount','awarding_agency_name','Description','Start Date','End Date'],
          limit: 100, page: 1,
        }, { timeout: 30000 });
        for (const item of (r.data?.results || [])) {
          if (!item['End Date']) continue;
          const days = Math.ceil((new Date(item['End Date']) - now) / 86400000);
          if (days < 0 || days > 180) continue;
          const urgency = days <= 30 ? 'critical' : days <= 60 ? 'high' : days <= 90 ? 'medium' : 'watch';
          allRecompetes.push({ award_id: String(item['Award ID'] || ''), naics_code: naics, title: (item['Description'] || '').substring(0, 500), agency: item['awarding_agency_name'] || '', incumbent: item['Recipient Name'] || '', award_amount: parseFloat(item['Award Amount'] || 0), start_date: item['Start Date'] || null, end_date: item['End Date'], days_remaining: days, urgency });
        }
      } catch {}
    }
    await supabase.from('recompetes').delete().gte('id', 0);
    const seen = new Set();
    const deduped = allRecompetes.filter(r => { if (seen.has(r.award_id)) return false; seen.add(r.award_id); return true; });
    const BATCH = 50;
    for (let i = 0; i < deduped.length; i += BATCH) await supabase.from('recompetes').insert(deduped.slice(i, i + BATCH));
    results.recompetes = deduped.length;
    console.log(`[CRON] Recompetes refreshed: ${deduped.length} found`);

    res.json({ success: true, timestamp: new Date().toISOString(), ...results });
  } catch (err) {
    console.error('[CRON] Sync failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

  app.use('/api/auth', require('./routes/auth'));

  const { requireAuth } = require('./middleware/auth');
  app.use('/api/opportunities', requireAuth, require('./routes/opportunities'));
  app.use('/api/municipal',     requireAuth, require('./routes/municipal'));
  app.use('/api/pipeline',      requireAuth, require('./routes/pipeline'));
  app.use('/api/proposals',     requireAuth, require('./routes/proposals'));
  app.use('/api/pricing',       requireAuth, require('./routes/pricing'));
  app.use('/api/company',       requireAuth, require('./routes/company'));
  app.use('/api/intelligence',  requireAuth, require('./routes/intelligence'));

  if (process.env.NODE_ENV === 'production') {
    const path = require('path');
    app.use(express.static(path.join(__dirname, '../client/dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    });
  }

  app.listen(process.env.PORT || 3001, () => {
    console.log(`Lumen Bid Intelligence running on port ${process.env.PORT || 3001}`);
  });
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
