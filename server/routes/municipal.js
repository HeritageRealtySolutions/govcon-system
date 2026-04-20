const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { supabase } = require('../db');

// Use memory storage — files go to Supabase Storage, not local disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.png', '.jpg', '.jpeg'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  }
});

const NAICS_MAP = {
  'electrical': '238210', 'electric': '238210',
  'plumbing': '238220', 'hvac': '238220',
  'roofing': '238160', 'roof': '238160',
  'landscaping': '561730', 'grounds': '561730',
  'construction': '236220', 'renovation': '236220',
};

function guessNaics(text) {
  const lower = (text || '').toLowerCase();
  for (const [kw, code] of Object.entries(NAICS_MAP)) {
    if (lower.includes(kw)) return code;
  }
  return '236220';
}

function calcBidScore(bid) {
  let score = 0;
  const deadline = bid.response_deadline ? new Date(bid.response_deadline) : null;
  if (deadline) {
    const days = (deadline - new Date()) / 86400000;
    if (days > 14) score += 20;
    else if (days >= 7) score += 10;
  }
  const val = parseFloat(bid.estimated_value || 0);
  if (val >= 100000 && val <= 2000000) score += 20;
  else if (val > 0) score += 5;
  if (bid.naics_code === '238210') score += 20;
  else if (bid.naics_code) score += 10;
  score += 25;
  return Math.min(score, 100);
}

const EXTRACT_PROMPT = `You are a government contracting analyst. Extract structured bid information from the provided content.
Return ONLY valid JSON with these fields (null for missing):
{
  "title": "full bid title",
  "agency": "issuing organization",
  "city": "city and state",
  "bid_number": "RFP/IFB number or null",
  "posted_date": "YYYY-MM-DD or null",
  "response_deadline": "YYYY-MM-DD or null",
  "estimated_value": numeric amount or null,
  "description": "full scope of work",
  "contact_name": "contact person or null",
  "contact_email": "email or null",
  "naics_code": "238210 electrical, 238220 plumbing/HVAC, 238160 roofing, 561730 landscaping, 236220 construction"
}
Return ONLY the JSON object.`;

async function extractWithAI(content) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: `${EXTRACT_PROMPT}\n\nCONTENT:\n${content}` }]
  });
  const text  = message.content[0].text.trim();
  const clean = text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean);
  if (!parsed.naics_code) parsed.naics_code = guessNaics(parsed.description || parsed.title || '');
  return parsed;
}

// GET all
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('municipal_bids')
      .select('*')
      .order('response_deadline', { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Extract from URL or text
router.post('/extract', async (req, res) => {
  const { source, type } = req.body;
  if (!source?.trim()) return res.status(400).json({ error: 'No source provided' });
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Anthropic API key not configured' });
  }
  try {
    let content = source;
    if (type === 'url') {
      const response = await axios.get(source, {
        timeout: 15000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      content = response.data
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .substring(0, 8000);
    }
    const extracted = await extractWithAI(content);
    res.json({ extracted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save bid
router.post('/', async (req, res) => {
  try {
    const b = req.body;
    const score = calcBidScore(b);
    const { data, error } = await supabase.from('municipal_bids').insert({
      title: b.title, agency: b.agency, state: b.state || 'MS',
      city: b.city, naics_code: b.naics_code, posted_date: b.posted_date || null,
      response_deadline: b.response_deadline || null, estimated_value: b.estimated_value || null,
      description: b.description, contact_email: b.contact_email,
      contact_name: b.contact_name, bid_number: b.bid_number,
      bid_score: score, status: 'identified',
    }).select().single();
    if (error) throw error;
    res.json({ id: data.id, bid_score: score });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload file — store in Supabase Storage
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    let filePath = null;

    if (req.file) {
      const fileName = `${Date.now()}-${req.file.originalname}`;
      const { error: uploadError } = await supabase.storage
        .from('bid-documents')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });
      if (!uploadError) filePath = fileName;
    }

    // Try AI extraction on images
    if (process.env.ANTHROPIC_API_KEY && req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      if (['.png', '.jpg', '.jpeg'].includes(ext)) {
        try {
          const { default: Anthropic } = await import('@anthropic-ai/sdk');
          const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
          const mediaType = ext === '.png' ? 'image/png' : 'image/jpeg';
          const message = await client.messages.create({
            model: 'claude-opus-4-6',
            max_tokens: 1024,
            messages: [{
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: mediaType, data: req.file.buffer.toString('base64') } },
                { type: 'text', text: EXTRACT_PROMPT }
              ]
            }]
          });
          const text = message.content[0].text.trim().replace(/```json|```/g, '').trim();
          const extracted = JSON.parse(text);
          if (!extracted.naics_code) extracted.naics_code = guessNaics(extracted.description || '');
          return res.json({ extracted, file: filePath });
        } catch (aiErr) {
          console.error('Image AI extraction failed:', aiErr.message);
        }
      }
    }

    const b = req.body;
    const score = calcBidScore(b);
    const { data, error } = await supabase.from('municipal_bids').insert({
      title: b.title || req.file?.originalname || 'Uploaded Bid',
      agency: b.agency, state: b.state || 'MS', city: b.city,
      naics_code: b.naics_code || '236220', file_path: filePath,
      bid_score: score, status: 'identified',
    }).select().single();
    if (error) throw error;
    res.json({ id: data.id, file: filePath, bid_score: score });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('municipal_bids').update(req.body).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('municipal_bids').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
