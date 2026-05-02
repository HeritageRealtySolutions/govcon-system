const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const { supabase } = require('../db');

async function callGemini(prompt, maxTokens = 4000) {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');
  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.2 },
    },
    { timeout: 60000 }
  );
  return response.data.candidates[0].content.parts[0].text;
}

// POST run compliance check
router.post('/check', async (req, res) => {
  try {
    const { title, solicitation_text, proposal_text } = req.body;
    if (!solicitation_text?.trim()) return res.status(400).json({ error: 'Solicitation text is required' });
    if (!proposal_text?.trim())     return res.status(400).json({ error: 'Proposal text is required' });

    const prompt = `You are a federal government contracting compliance expert specializing in FAR/DFARS requirements and 8(a) small business proposals.

Analyze this solicitation and proposal draft for compliance issues.

SOLICITATION:
${solicitation_text.substring(0, 6000)}

PROPOSAL DRAFT:
${proposal_text.substring(0, 6000)}

Perform a thorough compliance analysis and return ONLY a valid JSON object with exactly this structure. No markdown, no preamble:
{
  "compliance_score": <integer 0-100>,
  "summary": "<2-3 sentence overall assessment>",
  "covered_requirements": [
    { "requirement": "<requirement text>", "section": "<where addressed in proposal>", "status": "covered" }
  ],
  "missing_requirements": [
    { "requirement": "<requirement text>", "severity": "critical|high|medium|low", "recommendation": "<how to fix>" }
  ],
  "risky_language": [
    { "text": "<problematic phrase>", "issue": "<why it's risky>", "suggestion": "<better wording>" }
  ],
  "far_flags": [
    { "clause": "<FAR/DFARS clause number>", "description": "<what it requires>", "status": "met|not_met|unclear" }
  ],
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "priority_fixes": ["<most important fix 1>", "<most important fix 2>", "<most important fix 3>"]
}`;

    const text   = await callGemini(prompt, 4000);
    const clean  = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    // Save to database
    const { data } = await supabase.from('compliance_checks').insert({
      title:             title || 'Compliance Check',
      solicitation_text: solicitation_text.substring(0, 5000),
      proposal_text:     proposal_text.substring(0, 5000),
      compliance_score:  result.compliance_score,
      result_json:       JSON.stringify(result),
    }).select().single();

    res.json({ ...result, check_id: data?.id });
  } catch (err) {
    console.error('Compliance check error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET compliance check history
router.get('/history', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('compliance_checks')
      .select('id, title, compliance_score, created_at')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    res.json(data || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET single check
router.get('/history/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('compliance_checks')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found' });
    data.result = JSON.parse(data.result_json || '{}');
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
