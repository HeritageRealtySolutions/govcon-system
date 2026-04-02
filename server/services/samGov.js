const axios = require('axios');
const { db } = require('../db');

const NAICS_CODES = ['238210', '238220', '238160', '561730', '236220'];
const SET_ASIDES = ['SBA', '8AN', 'SBP', 'WOSB'];

function calcBidScore(opp) {
  let score = 0;
  const setAside = (opp.typeOfSetAside || '').toUpperCase();
  if (setAside === '8AN') score += 40;
  else if (['SBA', 'SBP', 'WOSB'].includes(setAside)) score += 25;

  if (opp.naicsCode === '238210') score += 20;
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
  const address = item.placeOfPerformance?.city || {};
  return {
    id: item.noticeId || item.opportunityId,
    title: item.title,
    agency: item.fullParentPathName || item.departmentName || item.organizationId,
    naics_code: item.naicsCode,
    set_aside_type: item.typeOfSetAside,
    posted_date: item.postedDate,
    response_deadline: item.responseDeadLine,
    state: item.placeOfPerformance?.state?.code || '',
    city: item.placeOfPerformance?.city?.name || '',
    estimated_value_min: parseFloat(award.lineItemValue || award.amount || 0),
    estimated_value_max: parseFloat(award.amount || award.lineItemValue || 0),
    description: item.description,
    solicitation_number: item.solicitationNumber,
    contact_email: item.pointOfContact?.[0]?.email || '',
    contact_name: item.pointOfContact?.[0]?.fullName || '',
    source: 'federal',
    bid_score: calcBidScore(item),
    status: 'new',
    raw_data: JSON.stringify(item)
  };
}

async function syncSAMOpportunities() {
  // Verify key is loaded
  if (!process.env.SAM_API_KEY) throw new Error('SAM_API_KEY is not set in .env');

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  // SAM.gov requires MM/dd/yyyy — not ISO or YYYYMMDD
  const mm = String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0');
  const dd = String(thirtyDaysAgo.getDate()).padStart(2, '0');
  const yyyy = thirtyDaysAgo.getFullYear();
  const postedFrom = `${mm}/${dd}/${yyyy}`;

  const params = new URLSearchParams({
    api_key: process.env.SAM_API_KEY,
    naicsCode: NAICS_CODES.join(','),
    typeOfSetAside: SET_ASIDES.join(','),
    limit: '100',
    postedFrom,
    ptype: 'o'
  });
  const url = `https://api.sam.gov/opportunities/v2/search?${params}`;

  // Log URL with key masked for debugging
  const maskedUrl = url.replace(process.env.SAM_API_KEY, '***');
  console.log('[SAM.gov] GET', maskedUrl);

  let response;
  try {
    response = await axios.get(url, { timeout: 30000 });
  } catch (err) {
    const status = err.response?.status;
    const detail = JSON.stringify(err.response?.data ?? err.message);
    console.error(`[SAM.gov] ${status} error:`, detail);
    throw new Error(`SAM.gov API error ${status}: ${detail}`);
  }

  console.log('[SAM.gov] Response status:', response.status);
  const items = response.data?.opportunitiesData || [];

  const insert = db.prepare(`
    INSERT OR IGNORE INTO opportunities
    (id, title, agency, naics_code, set_aside_type, posted_date, response_deadline,
     state, city, estimated_value_min, estimated_value_max, description, solicitation_number,
     contact_email, contact_name, source, bid_score, status, raw_data)
    VALUES
    (@id, @title, @agency, @naics_code, @set_aside_type, @posted_date, @response_deadline,
     @state, @city, @estimated_value_min, @estimated_value_max, @description, @solicitation_number,
     @contact_email, @contact_name, @source, @bid_score, @status, @raw_data)
  `);

  const insertMany = db.transaction((opps) => {
    let saved = 0;
    for (const item of opps) {
      const opp = parseOpportunity(item);
      if (opp.id) {
        insert.run(opp);
        saved++;
      }
    }
    return saved;
  });

  const saved = insertMany(items);
  return { total: items.length, saved };
}

module.exports = { syncSAMOpportunities };
