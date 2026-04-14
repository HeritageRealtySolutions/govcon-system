const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const TEMPLATES_DIR = path.join(__dirname, '..', '..', 'templates');

function loadTemplates() {
  const names = ['technical_approach', 'past_performance', 'management_approach', 'company_profile'];
  const templates = {};
  for (const name of names) {
    const fp = path.join(TEMPLATES_DIR, `${name}.txt`);
    templates[name] = fs.existsSync(fp) ? fs.readFileSync(fp, 'utf8') : '';
  }
  return templates;
}

// ── COST CALCULATION ENGINE ──────────────────────────────────────────────────

const LABOR_RATES = {
  '238210': { // Electrical
    trades: [
      { role: 'Master Electrician',     rate: 95,  hours_per_100k: 180 },
      { role: 'Journeyman Electrician', rate: 72,  hours_per_100k: 320 },
      { role: 'Electrician Apprentice', rate: 45,  hours_per_100k: 160 },
      { role: 'Project Manager',        rate: 110, hours_per_100k: 60  },
    ],
    material_pct: 0.38,
    overhead_pct: 0.18,
    profit_pct:   0.12,
  },
  '238220': { // Plumbing / HVAC
    trades: [
      { role: 'Master Plumber',         rate: 98,  hours_per_100k: 160 },
      { role: 'Journeyman Plumber',     rate: 75,  hours_per_100k: 300 },
      { role: 'HVAC Technician',        rate: 80,  hours_per_100k: 200 },
      { role: 'Project Manager',        rate: 110, hours_per_100k: 60  },
    ],
    material_pct: 0.42,
    overhead_pct: 0.18,
    profit_pct:   0.12,
  },
  '238160': { // Roofing
    trades: [
      { role: 'Roofing Foreman',        rate: 82,  hours_per_100k: 200 },
      { role: 'Roofer',                 rate: 58,  hours_per_100k: 480 },
      { role: 'Laborer',                rate: 38,  hours_per_100k: 240 },
      { role: 'Project Manager',        rate: 110, hours_per_100k: 50  },
    ],
    material_pct: 0.45,
    overhead_pct: 0.15,
    profit_pct:   0.12,
  },
  '561730': { // Landscaping
    trades: [
      { role: 'Landscape Supervisor',   rate: 65,  hours_per_100k: 240 },
      { role: 'Landscape Technician',   rate: 42,  hours_per_100k: 600 },
      { role: 'Equipment Operator',     rate: 55,  hours_per_100k: 180 },
      { role: 'Project Manager',        rate: 95,  hours_per_100k: 40  },
    ],
    material_pct: 0.30,
    overhead_pct: 0.15,
    profit_pct:   0.12,
  },
  '236220': { // General Construction
    trades: [
      { role: 'General Superintendent', rate: 105, hours_per_100k: 120 },
      { role: 'Skilled Tradesman',       rate: 68,  hours_per_100k: 400 },
      { role: 'Carpenter',               rate: 62,  hours_per_100k: 280 },
      { role: 'Laborer',                 rate: 38,  hours_per_100k: 300 },
      { role: 'Project Manager',         rate: 110, hours_per_100k: 80  },
    ],
    material_pct: 0.40,
    overhead_pct: 0.18,
    profit_pct:   0.12,
  },
};

function buildCostEstimate(opportunity) {
  const naics    = opportunity.naics_code || '236220';
  const rates    = LABOR_RATES[naics] || LABOR_RATES['236220'];
  const estValue = parseFloat(
    opportunity.estimated_value ||
    opportunity.estimated_value_min ||
    opportunity.estimated_value_max || 0
  );

  // Use estimated value if available, otherwise build from scratch
  const baseValue = estValue > 0 ? estValue : 250000;
  const scale     = baseValue / 100000;

  // Labor breakdown
  const laborLines = rates.trades.map(t => {
    const hours = Math.round(t.hours_per_100k * scale);
    const cost  = Math.round(hours * t.rate);
    return { role: t.role, hours, rate: t.rate, cost };
  });
  const totalLabor    = laborLines.reduce((s, l) => s + l.cost, 0);

  // Materials
  const materialCost  = Math.round(baseValue * rates.material_pct);

  // Subcontractor allowance (20% of base for trades that need subs)
  const subCost       = Math.round(baseValue * 0.12);

  // Overhead & profit on labor + materials
  const subtotal      = totalLabor + materialCost + subCost;
  const overheadCost  = Math.round(subtotal * rates.overhead_pct);
  const profitCost    = Math.round(subtotal * rates.profit_pct);
  const totalBid      = subtotal + overheadCost + profitCost;

  // Bid range (±8%)
  const bidLow  = Math.round(totalBid * 0.92);
  const bidHigh = Math.round(totalBid * 1.08);

  // Historical benchmark check
  const benchmarkNote = estValue > 0
    ? totalBid <= estValue * 1.15 && totalBid >= estValue * 0.75
      ? 'Within normal range of estimated contract value'
      : totalBid > estValue * 1.15
        ? `⚠ Your cost build is ${Math.round((totalBid/estValue - 1)*100)}% above estimate — review scope assumptions`
        : `✓ Your cost build is below estimate — room to sharpen or add contingency`
    : 'No government estimate available for comparison';

  return {
    naics_description: {
      '238210': 'Electrical Contractors',
      '238220': 'Plumbing / HVAC',
      '238160': 'Roofing Contractors',
      '561730': 'Landscaping Services',
      '236220': 'General Construction',
    }[naics] || 'Construction',
    labor_lines:     laborLines,
    total_labor:     totalLabor,
    material_cost:   materialCost,
    subcontractor:   subCost,
    subtotal,
    overhead:        overheadCost,
    overhead_pct:    Math.round(rates.overhead_pct * 100),
    profit:          profitCost,
    profit_pct:      Math.round(rates.profit_pct * 100),
    total_bid:       totalBid,
    bid_range_low:   bidLow,
    bid_range_high:  bidHigh,
    benchmark_note:  benchmarkNote,
    govt_estimate:   estValue || null,
  };
}

// ── PROPOSAL GENERATOR ───────────────────────────────────────────────────────

async function generateProposal(opportunity, companyProfile) {
  const templates = loadTemplates();
  const company   = companyProfile || {};
  const costEst   = buildCostEstimate(opportunity);

  const prompt = `You are an expert government contracting proposal writer for an 8(a) certified, 
Black-owned small business specializing in electrical, construction, and trades work.

Write a complete, submission-ready proposal for the opportunity below.
Be specific to this scope — no generic filler. Write as if this is a real submission.

OPPORTUNITY:
Title: ${opportunity.title}
Agency: ${opportunity.agency || 'Federal Agency'}
NAICS: ${opportunity.naics_code} — ${costEst.naics_description}
Estimated Value: ${opportunity.estimated_value ? '$' + Number(opportunity.estimated_value).toLocaleString() : 'Not specified'}
Deadline: ${opportunity.response_deadline || 'See solicitation'}
Bid Number: ${opportunity.bid_number || opportunity.notice_id || 'N/A'}
Scope of Work: ${(opportunity.description || '').substring(0, 1000)}

COMPANY PROFILE:
Name: ${company.company_name || 'Lumen Capital LLC'}
UEI: ${company.uei || 'Pending'}
CAGE: ${company.cage_code || 'Pending'}
Certifications: 8(a) Certified, Black-Owned Small Business${company.certifications ? ', ' + company.certifications : ''}
Years in Business: ${company.years_in_business || '5'}
Bonding Capacity: $${company.bonding_capacity ? Number(company.bonding_capacity).toLocaleString() : '500,000'}
Primary NAICS: ${company.primary_naics || '238210'}
Point of Contact: ${company.poc_name || company.company_name || 'Principal'}
Phone: ${company.phone || 'On file'}
Email: ${company.email || 'On file'}

PAST PERFORMANCE TEMPLATE:
${templates.past_performance || 'Electrical and construction work on federal and municipal contracts.'}

TECHNICAL APPROACH TEMPLATE:
${templates.technical_approach || 'Systematic project execution with certified tradespeople.'}

COST ESTIMATE BUILT:
Total Bid: $${costEst.total_bid.toLocaleString()} (range: $${costEst.bid_range_low.toLocaleString()} – $${costEst.bid_range_high.toLocaleString()})
Labor: $${costEst.total_labor.toLocaleString()} | Materials: $${costEst.material_cost.toLocaleString()} | Overhead: ${costEst.overhead_pct}% | Profit: ${costEst.profit_pct}%

OUTPUT: Return ONLY a valid JSON object with no markdown, no backticks, no extra text:
{
  "cover_letter": "Full professional cover letter, 3 paragraphs, addressed to the agency",
  "executive_summary": "2-3 paragraphs summarizing company, qualifications, and why you win this bid",
  "technical_approach": "Detailed technical approach specific to this scope, 3-4 paragraphs, reference specific trade requirements",
  "management_approach": "How you will staff, manage, and deliver this project on time and on budget, 2 paragraphs",
  "past_performance": "2-3 relevant past performance examples positioned for this specific bid type",
  "price_narrative": "Narrative explaining your pricing approach, value, and why your bid represents best value to the government",
  "differentiators": ["specific differentiator 1", "specific differentiator 2", "specific differentiator 3", "specific differentiator 4"],
  "compliance_notes": "Key compliance items and certifications relevant to this bid",
  "win_strategy": "Internal note: 2-3 sentence assessment of bid competitiveness and key win factors"
}`;

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }]
  });

  let parsed;
  try {
    const text      = response.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    parsed          = JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch {
    parsed = { raw: response.content[0].text };
  }

  return {
    ...parsed,
    cost_estimate: costEst,
    templates,
    generated_at:  new Date().toISOString(),
    opportunity_title: opportunity.title,
    agency: opportunity.agency,
  };
}

function saveTemplate(name, content) {
  const allowed = ['technical_approach', 'past_performance', 'management_approach', 'company_profile'];
  if (!allowed.includes(name)) throw new Error('Invalid template name');
  fs.writeFileSync(path.join(TEMPLATES_DIR, `${name}.txt`), content, 'utf8');
}

module.exports = { generateProposal, loadTemplates, saveTemplate, buildCostEstimate };
