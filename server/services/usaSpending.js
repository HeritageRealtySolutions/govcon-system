const axios = require('axios');
const { db } = require('../db');

async function getPricingData(naicsCode, agency = null) {
  const cacheRow = db.prepare(
    `SELECT * FROM pricing_cache WHERE naics_code = ? AND (agency = ? OR (agency IS NULL AND ? IS NULL))
     AND cached_at > datetime('now', '-7 days') ORDER BY cached_at DESC LIMIT 1`
  ).get(naicsCode, agency, agency);

  if (cacheRow) return cacheRow;

  const filters = {
    naics_codes: [naicsCode],
    time_period: [{ start_date: '2022-01-01', end_date: '2025-12-31' }],
    set_aside_type_codes: ['SBA', '8AN', 'SBP']
  };
  if (agency) filters.awarding_agency_names = [agency];

  const body = {
    filters,
    fields: ['Award Amount', 'Recipient Name', 'awarding_agency_name', 'naics_code'],
    limit: 100,
    page: 1
  };

  const response = await axios.post(
    'https://api.usaspending.gov/api/v2/search/spending_by_award/',
    body,
    { timeout: 30000 }
  );

  const results = response.data?.results || [];
  const amounts = results
    .map(r => parseFloat(r['Award Amount'] || 0))
    .filter(v => v > 0);

  if (amounts.length === 0) return null;

  const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);

  const top5 = results
    .sort((a, b) => parseFloat(b['Award Amount'] || 0) - parseFloat(a['Award Amount'] || 0))
    .slice(0, 5)
    .map(r => ({ name: r['Recipient Name'], amount: parseFloat(r['Award Amount'] || 0) }));

  db.prepare(
    `INSERT INTO pricing_cache (naics_code, agency, award_count, avg_award, min_award, max_award)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(naicsCode, agency, amounts.length, avg, min, max);

  return { naics_code: naicsCode, agency, award_count: amounts.length, avg_award: avg, min_award: min, max_award: max, top5 };
}

module.exports = { getPricingData };
