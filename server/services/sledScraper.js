const axios  = require('axios');
const { supabase } = require('../db');

const NAICS_KEYWORDS = {
  '238210': ['electrical','wiring','power','lighting','circuit','generator'],
  '238220': ['plumbing','hvac','mechanical','heating','cooling','piping','chiller'],
  '238160': ['roofing','roof','shingles','membrane','waterproof','re-roof'],
  '561730': ['landscaping','grounds','lawn','mowing','irrigation','turf','tree'],
  '236220': ['construction','renovation','building','facility','retrofit','repair','maintenance'],
};

function guessNaics(text) {
  const lower = (text || '').toLowerCase();
  let best = '236220', bestCount = 0;
  for (const [code, words] of Object.entries(NAICS_KEYWORDS)) {
    const count = words.filter(w => lower.includes(w)).length;
    if (count > bestCount) { bestCount = count; best = code; }
  }
  return best;
}

function calcBidScore(bid) {
  let score = 0;
  const naics = bid.naics_code || '';
  if (naics === '238210') score += 20;
  else if (['238220','238160','561730','236220'].includes(naics)) score += 10;

  const deadline = bid.response_deadline ? new Date(bid.response_deadline) : null;
  if (deadline) {
    const days = (deadline - new Date()) / 86400000;
    if (days > 14) score += 25;
    else if (days >= 7) score += 15;
    else if (days >= 3) score += 5;
  }

  const val = parseFloat(bid.estimated_value || 0);
  if (val >= 100000 && val <= 2000000) score += 30;
  else if (val >= 50000) score += 15;
  else if (val > 0) score += 5;

  // SLED bonus — less competition than federal
  score += 15;

  return Math.min(score, 100);
}

// ── TEXAS — ESBD (Electronic State Business Daily) ──────────────────────────
// Texas has a public RSS/search API via ESBD
async function fetchTexas() {
  const bids = [];
  try {
    const naicsList = ['238210','238220','238160','561730','236220'];
    for (const naics of naicsList) {
      const r = await axios.get(
        `https://www.txsmartbuy.com/esbd/api/opportunities?naics=${naics}&status=open&limit=50`,
        { timeout: 15000 }
      );
      const items = r.data?.opportunities || r.data?.data || [];
      for (const item of items) {
        bids.push({
          external_id:       `TX-${item.id || item.bid_id || item.solicitation_number}`,
          title:             item.title || item.description || 'Texas State Bid',
          agency:            item.agency || item.department || 'Texas State Agency',
          state:             'TX',
          naics_code:        naics,
          bid_number:        item.solicitation_number || item.bid_number || '',
          response_deadline: item.due_date || item.deadline || null,
          estimated_value:   parseFloat(item.estimated_value || item.value || 0) || null,
          description:       item.description || item.scope || '',
          contact_name:      item.contact_name || '',
          contact_email:     item.contact_email || '',
          source_url:        item.url || `https://www.txsmartbuy.com/esbd/${item.id}`,
          source_portal:     'Texas SmartBuy ESBD',
        });
      }
    }
  } catch (err) {
    console.error('[SLED Texas] Fetch error:', err.message);
    // Fallback — return sample structure so the table populates
  }
  return bids;
}

// ── FLORIDA — MyFloridaMarketPlace ──────────────────────────────────────────
async function fetchFlorida() {
  const bids = [];
  try {
    const r = await axios.get(
      'https://vendor.myfloridamarketplace.com/vp2/Solicitations/GetActiveSolicitations?pageSize=100&pageNumber=1',
      {
        timeout: 15000,
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
      }
    );
    const items = r.data?.solicitations || r.data?.data || r.data || [];
    for (const item of (Array.isArray(items) ? items : [])) {
      const title = item.title || item.solicitationTitle || '';
      const naics = guessNaics(title + ' ' + (item.description || ''));
      if (!['238210','238220','238160','561730','236220'].includes(naics)) continue;
      bids.push({
        external_id:       `FL-${item.id || item.solicitationNumber}`,
        title,
        agency:            item.agency || item.buyerAgency || 'Florida State Agency',
        state:             'FL',
        naics_code:        naics,
        bid_number:        item.solicitationNumber || item.bidNumber || '',
        response_deadline: item.dueDate || item.responseDeadline || null,
        estimated_value:   parseFloat(item.estimatedValue || 0) || null,
        description:       item.description || item.scope || '',
        contact_name:      item.contactName || '',
        contact_email:     item.contactEmail || '',
        source_url:        item.url || `https://vendor.myfloridamarketplace.com/vp2/Solicitations/${item.id}`,
        source_portal:     'MyFloridaMarketPlace',
      });
    }
  } catch (err) {
    console.error('[SLED Florida] Fetch error:', err.message);
  }
  return bids;
}

// ── GEORGIA — Team Georgia Marketplace ──────────────────────────────────────
async function fetchGeorgia() {
  const bids = [];
  try {
    const r = await axios.get(
      'https://ssl.doas.state.ga.us/PRSapp/PR_SolicitationList?category=all&status=open',
      {
        timeout: 15000,
        headers: { 'Accept': 'text/html,application/xhtml+xml', 'User-Agent': 'Mozilla/5.0' }
      }
    );
    // Parse HTML response for solicitation data
    const html = r.data || '';
    const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
    for (const row of rows.slice(1, 50)) {
      const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
      if (cells.length < 3) continue;
      const stripTags = s => s.replace(/<[^>]+>/g, '').trim();
      const title = stripTags(cells[1] || '');
      if (!title) continue;
      const naics = guessNaics(title);
      if (!['238210','238220','238160','561730','236220'].includes(naics)) continue;
      const urlMatch = (cells[1] || '').match(/href="([^"]+)"/i);
      bids.push({
        external_id:       `GA-${Math.random().toString(36).substr(2, 9)}`,
        title,
        agency:            stripTags(cells[0] || '') || 'Georgia State Agency',
        state:             'GA',
        naics_code:        naics,
        bid_number:        stripTags(cells[2] || ''),
        response_deadline: null,
        estimated_value:   null,
        description:       title,
        contact_name:      '',
        contact_email:     '',
        source_url:        urlMatch ? `https://ssl.doas.state.ga.us${urlMatch[1]}` : 'https://ssl.doas.state.ga.us/PRSapp/PR_SolicitationList',
        source_portal:     'Team Georgia Marketplace',
      });
    }
  } catch (err) {
    console.error('[SLED Georgia] Fetch error:', err.message);
  }
  return bids;
}

// ── MISSISSIPPI — MS ITS/MAGIC ──────────────────────────────────────────────
async function fetchMississippi() {
  const bids = [];
  try {
    const r = await axios.get(
      'https://www.ms.gov/dfa/contract_bid_search/Contract/OpenBids',
      {
        timeout: 15000,
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
      }
    );
    const items = r.data?.bids || r.data?.data || r.data || [];
    for (const item of (Array.isArray(items) ? items : [])) {
      const title = item.title || item.description || item.projectName || '';
      if (!title) continue;
      const naics = guessNaics(title + ' ' + (item.scope || ''));
      if (!['238210','238220','238160','561730','236220'].includes(naics)) continue;
      bids.push({
        external_id:       `MS-${item.id || item.bidNumber}`,
        title,
        agency:            item.agency || item.department || 'Mississippi State Agency',
        state:             'MS',
        naics_code:        naics,
        bid_number:        item.bidNumber || item.rfpNumber || '',
        response_deadline: item.dueDate || item.deadline || null,
        estimated_value:   parseFloat(item.estimatedValue || 0) || null,
        description:       item.scope || item.description || title,
        contact_name:      item.contactName || '',
        contact_email:     item.contactEmail || '',
        source_url:        item.url || 'https://www.ms.gov/dfa/contract_bid_search/Contract/OpenBids',
        source_portal:     'Mississippi DFA',
      });
    }
  } catch (err) {
    console.error('[SLED Mississippi] Fetch error:', err.message);
  }
  return bids;
}

// ── TENNESSEE — Edison Procurement ──────────────────────────────────────────
async function fetchTennessee() {
  const bids = [];
  try {
    const r = await axios.get(
      'https://www.tn.gov/generalservices/procurement/central-procurement-office--cpo-/open-solicitations.html',
      {
        timeout: 15000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }
    );
    const html = r.data || '';
    const linkMatches = html.match(/href="([^"]*solicitation[^"]*)"[^>]*>([^<]+)</gi) || [];
    for (const match of linkMatches.slice(0, 30)) {
      const urlMatch   = match.match(/href="([^"]+)"/i);
      const titleMatch = match.match(/>([^<]+)</);
      const title      = titleMatch?.[1]?.trim() || '';
      if (!title || title.length < 5) continue;
      const naics = guessNaics(title);
      if (!['238210','238220','238160','561730','236220'].includes(naics)) continue;
      bids.push({
        external_id:       `TN-${Buffer.from(title).toString('base64').substr(0, 12)}`,
        title,
        agency:            'Tennessee General Services',
        state:             'TN',
        naics_code:        naics,
        bid_number:        '',
        response_deadline: null,
        estimated_value:   null,
        description:       title,
        contact_name:      '',
        contact_email:     'cpo.procurement@tn.gov',
        source_url:        urlMatch ? urlMatch[1] : 'https://www.tn.gov/generalservices/procurement',
        source_portal:     'Tennessee Edison',
      });
    }
  } catch (err) {
    console.error('[SLED Tennessee] Fetch error:', err.message);
  }
  return bids;
}

// ── MAIN SYNC FUNCTION ───────────────────────────────────────────────────────
async function syncSLEDBids() {
  console.log('[SLED] Starting sync for MS, TX, FL, GA, TN...');

  const fetchers = [
    { name: 'Mississippi', fn: fetchMississippi },
    { name: 'Texas',       fn: fetchTexas },
    { name: 'Florida',     fn: fetchFlorida },
    { name: 'Georgia',     fn: fetchGeorgia },
    { name: 'Tennessee',   fn: fetchTennessee },
  ];

  const results = {};
  let totalSaved = 0;

  for (const { name, fn } of fetchers) {
    try {
      const bids = await fn();
      let saved = 0;
      for (const bid of bids) {
        if (!bid.title?.trim()) continue;
        bid.bid_score    = calcBidScore(bid);
        bid.updated_at   = new Date().toISOString();

        const { error } = await supabase
          .from('sled_bids')
          .upsert(bid, { onConflict: 'external_id' });

        if (!error) saved++;
      }
      results[name] = { fetched: bids.length, saved };
      totalSaved += saved;
      console.log(`[SLED ${name}] ${bids.length} fetched, ${saved} saved`);
    } catch (err) {
      console.error(`[SLED ${name}] Error:`, err.message);
      results[name] = { error: err.message };
    }
  }

  return { total_saved: totalSaved, by_state: results };
}

module.exports = { syncSLEDBids };
