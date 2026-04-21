const axios = require('axios');
const { supabase } = require('../db');

async function getPricingData(naicsCode, agency = null) {
  // Check cache first
  let query = supabase
    .from('pricing_cache')
    .select('*')
    .eq('naics_code', naicsCode)
    .gte('cached_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('cached_at', { ascending: false })
    .limit(1);

  if (agency) query = query.eq('agency', agency);
  else query = query.is('agency', null);

  const { data: cached } = await query.single();
  if (cached) return cached;

  // Fetch from USASpending
  const filters = {
    naics_codes: [naicsCode],
    time_period: [{ start_date: '2022-01-01', end_date: '2025-12-31' }],
    set_aside_type_codes: ['SBA', '8AN', 'SBP']
  };
  if (agency) filters.awarding_agency_names = [agency];

  const response = await axios.post(
    'https://api.usaspending.gov/api/v2/search/spending_by_award/',
    {
      filters,
      fields: ['Award Amount', 'Recipient Name', 'awarding_agency_name', 'naics_code'],
      limit: 100,
      page: 1
    },
    { timeout: 30000 }
  );

  const results = response.data?.results || [];
  const amounts = results.map(r => parseFloat(r['Award Amount'] || 0)).filter(v => v > 0);
  if (amounts.length === 0) return null;

  const avg  = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const min  = Math.min(...amounts);
  const max  = Math.max(...amounts);
  const top5 = results
    .sort((a, b) => parseFloat(b['Award Amount'] || 0) - parseFloat(a['Award Amount'] || 0))
    .slice(0, 5)
    .map(r => ({ name: r['Recipient Name'], amount: parseFloat(r['Award Amount'] || 0) }));

  const result = {
    naics_code:  naicsCode,
    agency:      agency || null,
    award_count: amounts.length,
    avg_award:   avg,
    min_award:   min,
    max_award:   max,
    top5:        JSON.stringify(top5),
  };

  await supabase.from('pricing_cache').insert(result);

  return { ...result, top5 };
}

module.exports = { getPricingData };
