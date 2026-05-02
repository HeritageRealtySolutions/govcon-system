const { supabase } = require('../db');
const axios = require('axios');

// Factor weights — must sum to 100
const WEIGHTS = {
  set_aside_match:    25, // Is it 8(a) or small business set-aside?
  naics_fit:          15, // Is it one of your 5 NAICS codes?
  competition_pool:   20, // How many companies compete in this space?
  value_sweet_spot:   15, // Is the contract value in your wheelhouse?
  deadline_comfort:   10, // Do you have enough time to prepare?
  agency_history:     10, // Have you won from this agency before?
  incumbent_present:   5, // Is there a known incumbent?
};

async function getAgencyWinRate(agency) {
  if (!agency) return null;
  try {
    const { data } = await supabase
      .from('pipeline')
      .select('status, agency')
      .ilike('agency', `%${agency.split(' ')[0]}%`);

    if (!data || data.length === 0) return null;
    const wins  = data.filter(d => d.status === 'awarded').length;
    const total = data.length;
    return total >= 3 ? Math.round((wins / total) * 100) : null;
  } catch { return null; }
}

async function getNaicsCompetitionPool(naicsCode) {
  if (!naicsCode) return 50; // default mid-range
  try {
    const { data } = await supabase
      .from('naics_scores')
      .select('competition_pool')
      .eq('naics_code', naicsCode)
      .single();
    return data?.competition_pool || 50;
  } catch { return 50; }
}

async function calculateWinProbability(opportunity) {
  const factors   = {};
  let totalScore  = 0;

  // 1. Set-aside match
  const setAside = (opportunity.set_aside_type || opportunity.typeOfSetAside || '').toUpperCase();
  if (setAside === '8AN') {
    factors.set_aside_match = { score: 100, reason: '8(a) exclusive — only 8(a) certified firms can bid' };
  } else if (['SBA','SBP','WOSB'].includes(setAside)) {
    factors.set_aside_match = { score: 70, reason: 'Small business set-aside — limited competition pool' };
  } else if (setAside === '') {
    factors.set_aside_match = { score: 30, reason: 'Full and open — competing against all firms including large businesses' };
  } else {
    factors.set_aside_match = { score: 50, reason: `Set-aside type: ${setAside}` };
  }

  // 2. NAICS fit
  const yourNaics = ['238210','238220','238160','561730','236220'];
  const bidNaics  = opportunity.naics_code || '';
  if (bidNaics === '238210') {
    factors.naics_fit = { score: 100, reason: 'Primary NAICS — strongest capability and past performance' };
  } else if (yourNaics.includes(bidNaics)) {
    factors.naics_fit = { score: 75, reason: 'Secondary NAICS — qualified but less specialized' };
  } else if (bidNaics) {
    factors.naics_fit = { score: 20, reason: 'Outside your registered NAICS codes — significant risk' };
  } else {
    factors.naics_fit = { score: 50, reason: 'NAICS code not specified' };
  }

  // 3. Competition pool
  const pool = await getNaicsCompetitionPool(bidNaics);
  let poolScore;
  if (pool <= 5)       { poolScore = 100; factors.competition_pool = { score: 100, reason: `Only ${pool} competitors in this space — excellent odds` }; }
  else if (pool <= 10) { poolScore = 85;  factors.competition_pool = { score: 85,  reason: `${pool} competitors — strong odds` }; }
  else if (pool <= 20) { poolScore = 65;  factors.competition_pool = { score: 65,  reason: `${pool} competitors — moderate competition` }; }
  else if (pool <= 40) { poolScore = 40;  factors.competition_pool = { score: 40,  reason: `${pool} competitors — crowded field` }; }
  else                 { poolScore = 20;  factors.competition_pool = { score: 20,  reason: `${pool}+ competitors — very competitive` }; }

  // 4. Contract value sweet spot ($100K - $750K is ideal for your model)
  const value = parseFloat(opportunity.estimated_value || opportunity.estimated_value_min || 0);
  if (value >= 100000 && value <= 750000) {
    factors.value_sweet_spot = { score: 100, reason: `$${value.toLocaleString()} — ideal range for your sub/GC model` };
  } else if (value >= 750000 && value <= 2000000) {
    factors.value_sweet_spot = { score: 70, reason: `$${value.toLocaleString()} — manageable but requires strong bonding` };
  } else if (value > 2000000) {
    factors.value_sweet_spot = { score: 30, reason: `$${value.toLocaleString()} — may exceed bonding capacity` };
  } else if (value > 0) {
    factors.value_sweet_spot = { score: 40, reason: `$${value.toLocaleString()} — below optimal margin threshold` };
  } else {
    factors.value_sweet_spot = { score: 50, reason: 'Contract value not specified' };
  }

  // 5. Deadline comfort (do you have time to prepare?)
  const deadline = opportunity.response_deadline || opportunity.responseDeadLine;
  if (deadline) {
    const days = Math.ceil((new Date(deadline) - new Date()) / 86400000);
    if (days >= 21)      { factors.deadline_comfort = { score: 100, reason: `${days} days — plenty of time for quality proposal` }; }
    else if (days >= 14) { factors.deadline_comfort = { score: 80,  reason: `${days} days — adequate time` }; }
    else if (days >= 7)  { factors.deadline_comfort = { score: 55,  reason: `${days} days — tight timeline, quality may suffer` }; }
    else if (days >= 3)  { factors.deadline_comfort = { score: 25,  reason: `${days} days — very tight, consider skipping` }; }
    else                 { factors.deadline_comfort = { score: 0,   reason: 'Deadline too close — high risk of rushed proposal' }; }
  } else {
    factors.deadline_comfort = { score: 60, reason: 'No deadline specified' };
  }

  // 6. Agency history
  const agencyWinRate = await getAgencyWinRate(opportunity.agency);
  if (agencyWinRate === null) {
    factors.agency_history = { score: 50, reason: 'No history with this agency yet — neutral' };
  } else if (agencyWinRate >= 50) {
    factors.agency_history = { score: 100, reason: `${agencyWinRate}% win rate with this agency — strong relationship` };
  } else if (agencyWinRate >= 25) {
    factors.agency_history = { score: 65,  reason: `${agencyWinRate}% win rate with this agency — building relationship` };
  } else {
    factors.agency_history = { score: 25,  reason: `${agencyWinRate}% win rate with this agency — struggling here` };
  }

  // 7. Incumbent presence
  const hasIncumbent = !!(opportunity.incumbent || opportunity.awardee);
  if (hasIncumbent) {
    factors.incumbent_present = { score: 30, reason: `Incumbent: ${opportunity.incumbent || 'known'} — displacing incumbents is harder` };
  } else {
    factors.incumbent_present = { score: 80, reason: 'No known incumbent — open competition' };
  }

  // Calculate weighted total
  for (const [factor, weight] of Object.entries(WEIGHTS)) {
    const factorScore = factors[factor]?.score || 50;
    totalScore += (factorScore * weight) / 100;
  }

  const probability = Math.round(totalScore);

  // Generate recommendation
  let recommendation;
  if (probability >= 70) {
    recommendation = { level: 'strong', text: 'Strong bid — prioritize this opportunity. Allocate full proposal resources.' };
  } else if (probability >= 50) {
    recommendation = { level: 'moderate', text: 'Moderate bid — worth pursuing if pipeline is light. Streamline proposal effort.' };
  } else if (probability >= 35) {
    recommendation = { level: 'weak', text: 'Weak bid — consider passing unless this NAICS/agency is a strategic priority.' };
  } else {
    recommendation = { level: 'pass', text: 'Pass — low probability. Resources better spent on higher-value opportunities.' };
  }

  return {
    probability,
    factors,
    recommendation,
    weights: WEIGHTS,
    calculated_at: new Date().toISOString(),
  };
}

module.exports = { calculateWinProbability };
