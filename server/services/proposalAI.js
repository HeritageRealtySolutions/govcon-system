const axios = require('axios');

async function callGemini(prompt, maxTokens = 4000) {
  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
    },
    { timeout: 60000 }
  );
  return response.data.candidates[0].content.parts[0].text;
}

const LABOR_RATES = {
  '238210': { name: 'Electrical Contractors',   lines: [{ role: 'Master Electrician', hours: 80, rate: 95 }, { role: 'Journeyman Electrician', hours: 160, rate: 75 }, { role: 'Apprentice Electrician', hours: 80, rate: 45 }, { role: 'Project Manager', hours: 40, rate: 85 }] },
  '238220': { name: 'Plumbing / HVAC',           lines: [{ role: 'Master Plumber', hours: 80, rate: 90 }, { role: 'Journeyman Plumber', hours: 160, rate: 70 }, { role: 'HVAC Technician', hours: 80, rate: 75 }, { role: 'Project Manager', hours: 40, rate: 85 }] },
  '238160': { name: 'Roofing Contractors',       lines: [{ role: 'Roofing Foreman', hours: 80, rate: 75 }, { role: 'Roofing Crew (x3)', hours: 240, rate: 45 }, { role: 'Safety Officer', hours: 40, rate: 65 }, { role: 'Project Manager', hours: 40, rate: 85 }] },
  '561730': { name: 'Landscaping Services',      lines: [{ role: 'Landscape Supervisor', hours: 80, rate: 65 }, { role: 'Crew Lead', hours: 120, rate: 45 }, { role: 'Crew Members (x4)', hours: 320, rate: 32 }, { role: 'Project Manager', hours: 40, rate: 85 }] },
  '236220': { name: 'General Construction',      lines: [{ role: 'General Superintendent', hours: 120, rate: 95 }, { role: 'Skilled Tradespeople (x4)', hours: 480, rate: 65 }, { role: 'Laborers (x3)', hours: 360, rate: 40 }, { role: 'Project Manager', hours: 80, rate: 85 }] },
};

function buildCostEstimate(opportunity) {
  const naics       = opportunity.naics_code || '236220';
  const trade       = LABOR_RATES[naics] || LABOR_RATES['236220'];
  const estValue    = parseFloat(opportunity.estimated_value || opportunity.estimated_value_min || 200000);
  const scaleFactor = Math.max(0.5, Math.min(3.0, estValue / 200000));

  const laborLines = trade.lines.map(l => ({
    role:  l.role,
    hours: Math.round(l.hours * scaleFactor),
    rate:  l.rate,
    cost:  Math.round(l.hours * scaleFactor * l.rate),
  }));

  const totalLabor    = laborLines.reduce((s, l) => s + l.cost, 0);
  const materialCost  = Math.round(totalLabor * 0.35);
  const subcontractor = Math.round(estValue * 0.42);
  const overhead      = Math.round(totalLabor * 0.15);
  const profit        = Math.round((totalLabor + materialCost + subcontractor + overhead) * 0.17);
  const totalBid      = totalLabor + materialCost + subcontractor + overhead + profit;

  const benchmarkNote = estValue > 0
    ? totalBid > estValue * 1.15
      ? `⚠ Your estimate ($${totalBid.toLocaleString()}) is ${Math.round(((totalBid / estValue) - 1) * 100)}% above stated value — review scope.`
      : totalBid < estValue * 0.75
        ? `⚡ Your estimate is well below stated value — opportunity for strong margin.`
        : `✓ Your estimate is within competitive range.`
    : null;

  return {
    naics_description: trade.name,
    labor_lines:       laborLines,
    total_labor:       totalLabor,
    material_cost:     materialCost,
    subcontractor,
    overhead,
    overhead_pct:      15,
    profit,
    profit_pct:        17,
    total_bid:         totalBid,
    bid_range_low:     Math.round(totalBid * 0.92),
    bid_range_high:    Math.round(totalBid * 1.08),
    benchmark_note:    benchmarkNote,
  };
}

function loadTemplates() {
  const templates = {};
  const names = ['technical_approach', 'past_performance', 'management_approach', 'company_profile'];
  for (const name of names) {
    try {
      const fp = require('path').join(__dirname, '../../templates', `${name}.txt`);
      templates[name] = require('fs').readFileSync(fp, 'utf8');
    } catch { templates[name] = ''; }
  }
  return templates;
}

function saveTemplate(name, content) {
  const allowed = ['technical_approach', 'past_performance', 'management_approach', 'company_profile'];
  if (!allowed.includes(name)) throw new Error('Invalid template name');
  const fp = require('path').join(__dirname, '../../templates', `${name}.txt`);
  require('fs').mkdirSync(require('path').dirname(fp), { recursive: true });
  require('fs').writeFileSync(fp, content, 'utf8');
}

async function generateProposal(opportunity, company) {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

  const estimate   = buildCostEstimate(opportunity);
  const templates  = loadTemplates();
  const companyStr = company ? JSON.stringify(company, null, 2) : 'Not yet configured — complete Company Profile first';

  const prompt = `You are a government contracting proposal writer for an 8(a) certified, Black-owned small business.

COMPANY PROFILE:
${companyStr}

OPPORTUNITY:
Title: ${opportunity.title}
Agency: ${opportunity.agency || 'Federal Agency'}
NAICS: ${opportunity.naics_code} — ${estimate.naics_description}
Estimated Value: $${(parseFloat(opportunity.estimated_value || opportunity.estimated_value_min || 0)).toLocaleString()}
Description: ${(opportunity.description || '').substring(0, 1500)}

COST ESTIMATE:
Total Bid: $${estimate.total_bid.toLocaleString()}
Labor: $${estimate.total_labor.toLocaleString()}
Materials: $${estimate.material_cost.toLocaleString()}
Subcontractors: $${estimate.subcontractor.toLocaleString()} (42% sub model)
Overhead: $${estimate.overhead.toLocaleString()} (15%)
GC/Management Fee: $${estimate.profit.toLocaleString()} (17%)

COMPANY TEMPLATES:
Technical Approach Context: ${templates.technical_approach || 'Not yet configured'}
Past Performance Context: ${templates.past_performance || 'Not yet configured'}
Management Approach Context: ${templates.management_approach || 'Not yet configured'}

Generate a complete, competitive government proposal. Return ONLY valid JSON with exactly these fields, no markdown, no preamble:
{
  "cover_letter": "professional 3-paragraph cover letter addressed to the contracting officer",
  "executive_summary": "compelling 2-paragraph executive summary highlighting 8(a) advantage",
  "technical_approach": "detailed technical approach specific to this scope of work",
  "management_approach": "management plan with clear roles, responsibilities, and oversight structure",
  "past_performance": "3 relevant past performance examples with agency, value, scope, and outcome",
  "price_narrative": "pricing justification paragraph explaining cost reasonableness",
  "differentiators": ["specific differentiator 1", "specific differentiator 2", "specific differentiator 3", "specific differentiator 4"],
  "compliance_notes": "certifications, registrations, and compliance statement",
  "win_strategy": "internal strategic note — what makes this bid winnable and how to position"
}`;

  const text   = await callGemini(prompt, 4000);
  const clean  = text.replace(/```json|```/g, '').trim();
  const result = JSON.parse(clean);
  result.cost_estimate = estimate;
  return result;
}

module.exports = { generateProposal, buildCostEstimate, loadTemplates, saveTemplate };
