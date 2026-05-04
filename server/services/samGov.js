const axios  = require('axios');
const { supabase } = require('../db');

const NAICS_CODES = [
  '236116', '236115', '236220', '237310',
  '333120', '532412', '541320', '561730',
];

function calcBidScore(opp) {
  let score = 0;
  const setAside = (opp.typeOfSetAside || '').toUpperCase();
  if (setAside === '8AN') score += 40;
  else if (['SBA', 'SBP', 'WOSB'].includes(setAside)) score += 25;
  if (opp.naicsCode === '236220') score += 20;
  else if (NAICS_CODES.includes(opp.naicsCode)) score += 10;
  const deadline = opp.responseDeadLine ? new Date(opp.responseDeadLine) : null;
  if (deadline) {
    const daysOut = (deadline - new Date()) / (1000 * 60 * 60 * 24);
    if (daysOut > 14) score += 20;
    else if (daysOut >= 7) score += 10;
  }
  const maxVal = parseFloat(opp.award?.amount || 0);
  if (maxVal >= 100000 && maxVal <= 2000000) score += 20;
  else if (maxVal > 0 && maxVal < 100000) score += 5;
  return Math.min(score, 100);
}

function parseOpportunity(item) {
  const award = item.award || {};
  return {
    notice_id:           item.noticeId || item.opportunityId,
    title:               item.title,
    agency:              item.fullParentPathName || item.departmentName || item.organizationId,
    naics_code:          item.naicsCode,
    set_aside_type:      item.typeOfSetAside,
    posted_date:         item.postedDate,
    response_deadline:   item.responseDeadLine,
    state:               item.placeOfPerformance?.state?.code || '',
    city:                item.placeOfPerformance?.city?.name || '',
    estimated_value_min: parseFloat(award.lineItemValue || award.amount || 0),
    estimated_value_max: parseFloat(award.amount || award.lineItemValue || 0),
    description:         item.description,
    solicitation_number: item.solicitationNumber,
    contact_email:       item.pointOfContact?.[0]?.email || '',
    contact_name:        item.pointOfContact?.[0]?.fullName || '',
    bid_score:           calcBidScore(item),
    status:              'new',
  };
}

function formatDate(date) {
  const mm   = String(date.getMonth() + 1).padStart(2, '0');
  const dd   = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function buildParams(postedFrom, postedTo, offset = 0) {
  const params = new URLSearchParams({
    api_key:   process.env.SAM_API_KEY,
    limit:     '100',
    offset:    String(offset),
    postedFrom,
    postedTo,
    ptype:     'o',
  });
  for (const code of NAICS_CODES) {
    params.append('naicsCode', code);
  }
  return params;
}

async function fetchPage(url) {
  try {
    const response = await axios.get(url, { timeout: 30000 });
    const items = response.data?.opportunitiesData || [];
    const total = response.data?.totalRecords || 0;
    return { items, total };
  } catch (err) {
    const status = err.response?.status;
    const detail = JSON.stringify(err.response?.data || err.message);
    console.error(`[SAM.gov] ${status} error:`, detail);
    throw new Error(`SAM.gov ${status}: ${detail}`);
  }
}

async function fetchOpportunities() {
  if (!process.env.SAM_API_KEY) throw new Error('SAM_API_KEY not set');

  const today         = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const postedFrom = formatDate(thirtyDaysAgo);
  const postedTo   = formatDate(today);

  const allItems = [];
  const MAX_PAGES = 10;

  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * 100;
    const params = buildParams(postedFrom, postedTo, offset);
    const url    = `https://api.sam.gov/opportunities/v2/search?${params}`;

    if (page === 0) {
      console.log('[SAM.gov] GET', url.replace(process.env.SAM_API_KEY, '***'));
    }

    const { items, total } = await fetchPage(url);
    allItems.push(...items);

    console.log(`[SAM.gov] Page ${page + 1}: ${items.length} items | Total available: ${total} | Fetched so far: ${allItems.length}`);

    // Stop if we've fetched everything or hit our limit
    if (items.length < 100 || allItems.length >= 1000 || allItems.length >= total) break;

    // Small delay to be respectful to the API
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`[SAM.gov] Final count: ${allItems.length} opportunities`);
  return allItems.map(parseOpportunity);
}

async function syncSAMOpportunities() {
  if (!process.env.SAM_API_KEY) throw new Error('SAM_API_KEY not set');

  const today         = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const postedFrom = formatDate(thirtyDaysAgo);
  const postedTo   = formatDate(today);

  const allItems = [];
  const MAX_PAGES = 10;

  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * 100;
    const params = buildParams(postedFrom, postedTo, offset);
    const url    = `https://api.sam.gov/opportunities/v2/search?${params}`;

    if (page === 0) {
      console.log('[SAM.gov] Sync GET', url.replace(process.env.SAM_API_KEY, '***'));
    }

    const { items, total } = await fetchPage(url);
    allItems.push(...items);

    console.log(`[SAM.gov] Sync Page ${page + 1}: ${items.length} items | Total: ${total} | So far: ${allItems.length}`);

    if (items.length < 100 || allItems.length >= 1000 || allItems.length >= total) break;

    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`[SAM.gov] Sync total fetched: ${allItems.length}`);

  let saved = 0;
  for (const item of allItems) {
    const opp = parseOpportunity(item);
    if (!opp.notice_id) continue;
    const { error } = await supabase
      .from('opportunities')
      .upsert(opp, { onConflict: 'notice_id' });
    if (!error) saved++;
  }

  return { total: allItems.length, saved };
}

module.exports = { syncSAMOpportunities, fetchOpportunities };
