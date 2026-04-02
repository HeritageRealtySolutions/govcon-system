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

async function generateProposal(opportunity, companyProfile) {
  const templates = loadTemplates();
  const company = companyProfile || {};

  const prompt = `You are a government contracting proposal writer for an 8(a) certified Black-owned small business specializing in electrical, construction, and trades work.

Generate a CONCISE bid proposal for this opportunity. Focus only on differentiating content. Be specific, not generic.

OPPORTUNITY:
Title: ${opportunity.title}
Agency: ${opportunity.agency}
NAICS: ${opportunity.naics_code}
Estimated Value: $${opportunity.estimated_value_min || 0} - $${opportunity.estimated_value_max || 0}
Key Requirements: ${(opportunity.description || '').substring(0, 500)}

COMPANY: ${company.company_name || 'Company'}, ${company.years_in_business || 0} years experience, 8(a) certified, bonding capacity $${company.bonding_capacity || 0}

OUTPUT FORMAT (JSON only, no markdown):
{
  "executive_summary": "3 sentences max",
  "technical_approach": "specific to this scope, 150 words max",
  "differentiators": ["point 1", "point 2", "point 3"],
  "pricing_recommendation": {
    "suggested_bid": 0,
    "rationale": "1 sentence"
  },
  "past_performance_angle": "how to position experience for this bid, 50 words"
}`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }]
  });

  let parsed;
  try {
    const text = response.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch {
    parsed = { raw: response.content[0].text };
  }

  return { ...parsed, templates };
}

function saveTemplate(name, content) {
  const allowed = ['technical_approach', 'past_performance', 'management_approach', 'company_profile'];
  if (!allowed.includes(name)) throw new Error('Invalid template name');
  fs.writeFileSync(path.join(TEMPLATES_DIR, `${name}.txt`), content, 'utf8');
}

module.exports = { generateProposal, loadTemplates, saveTemplate };
