const axios  = require('axios');
const { supabase } = require('../db');

const NAICS_CODES = [
  '236116', '236115', '236220', '237310',
  '333120', '532412', '541320', '561730',
];

function calcBidScore(opp) {
  let score = 0;

  // NAICS match — primary factor (35pts)
  const naics = opp.naicsCode || '';
  if (naics === '236220') score += 35;        // Primary — General Construction
  else if (naics === '237310') score += 35;   // Highway/Bridge
  else if (naics === '561730') score += 35;   // Landscaping
  else if (naics === '236116') score += 30;   // Multifamily
  else if (naics === '236115') score += 30;   // Single Family
  else if (naics === '532412') score += 25;   // Equipment Rental
  else if (naics === '333120') score += 25;   // Construction Machinery
  else if (naics === '541320') score += 25;   // Landscape Architecture
  else score += 0;                            // Outside registered codes

  // Set-aside bonus — secondary factor (15pts max)
  const setAside = (opp.typeOfSetAside || '').toUpperCase();
  if (['8AN', 'SBA', 'SBP', 'SDVOSBC', 'WOSB', 'WOSBSS'].includes(setAside)) score += 15;
  else if (setAside && setAside !== 'NONE') score += 5;
  // Full and open = no bonus, but no penalty either

  // Contract value sweet spot (30pts)
  const val = parseFloat(opp.award?.amount || 0);
  if (val >= 100000 && val <= 750000)       score += 30; // Ideal range
  else if (val >= 750000 && val <= 2000000) score += 20; // Good range
  else if (val >= 50000 && val < 100000)    score += 10; // Small but viable
  else if (val > 2000000)                   score += 10; // Large — bonding risk
  else                                      score += 15; // Unknown value — neutral

  // Deadline comfort (20pts)
  const deadline = opp.responseDeadLine ? new Date(opp.responseDeadLine) : null;
  if (deadline) {
    const daysOut = (deadline - new Date()) / (1000 * 60 * 60 * 24);
    if (daysOut >= 21)      score += 20;
    else if (daysOut >= 14) score += 15;
    else if (daysOut >= 7)  score += 8;
    else if (daysOut >= 3)  score += 3;
    else                    score += 0;
  } else {
    score += 10; // No deadline listed — neutral
  }

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
  const allItems   = [];
  const MAX_PAGES  = 10;

  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * 100;
    const params = buildParams(postedFrom, postedTo, offset);
    const url    = `https://api.sam.gov/opportunities/v2/search?${params}`;

    if (page === 0) console.log('[SAM.gov] GET', url.replace(process.env.SAM_API_KEY, '***'));

    const { items, total } = await fetchPage(url);
    allItems.push(...items);

    console.log(`[SAM.gov] Page ${page + 1}: ${items.length} items | Total: ${total} | Fetched: ${allItems.length}`);

    if (items.length < 100 || allItems.length >= 1000 || allItems.length >= total) break;
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`[SAM.gov] Final count: ${allItems.length}`);
  return allItems.map(parseOpportunity);
}

async function syncSAMOpportunities() {
  if (!process.env.SAM_API_KEY) throw new Error('SAM_API_KEY not set');

  const today         = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const postedFrom = formatDate(thirtyDaysAgo);
  const postedTo   = formatDate(today);
  const allItems   = [];
  const MAX_PAGES  = 10;

  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * 100;
    const params = buildParams(postedFrom, postedTo, offset);
    const url    = `https://api.sam.gov/opportunities/v2/search?${params}`;

    if (page === 0) console.log('[SAM.gov] Sync GET', url.replace(process.env.SAM_API_KEY, '***'));

    const { items, total } = await fetchPage(url);
    allItems.push(...items);

    console.log(`[SAM.gov] Sync Page ${page + 1}: ${items.length} | Total: ${total} | So far: ${allItems.length}`);

    if (items.length < 100 || allItems.length >= 1000 || allItems.length >= total) break;
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`[SAM.gov] Sync total: ${allItems.length}`);

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
