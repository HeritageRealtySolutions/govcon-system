const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const { db } = require('../db');

const client = new Anthropic();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', '..', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.png', '.jpg', '.jpeg'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  }
});

function calcBidScore(bid) {
  let score = 0;
  const deadline = bid.response_deadline ? new Date(bid.response_deadline) : null;
  if (deadline) {
    const days = (deadline - new Date()) / (1000 * 60 * 60 * 24);
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

const NAICS_MAP = {
  'electrical': '238210', 'electric': '238210',
  'plumbing': '238220', 'hvac': '238220', 'mechanical': '238220',
  'roofing': '238160', 'roof': '238160',
  'landscaping': '561730', 'grounds': '561730', 'lawn': '561730',
  'construction': '236220', 'renovation': '236220', 'building': '236220',
};

function guessNaics(text) {
  const lower = (text || '').toLowerCase();
  for (const [keyword, code] of Object.entries(NAICS_MAP)) {
    if (lower.includes(keyword)) return code;
  }
  return '236220';
}

const EXTRACT_PROMPT = `You are a government contracting analyst. Extract structured bid information from the provided content.

Return ONLY a valid JSON object with these exact fields (use null for any field you cannot find):
{
  "title": "full bid/project title",
  "agency": "issuing agency or organization name",
  "city": "city and state if mentioned",
  "bid_number": "RFP/IFB/solicitation number if present",
  "posted_date": "YYYY-MM-DD format or null",
  "response_deadline": "YYYY-MM-DD format or null",
  "estimated_value": numeric dollar amount or null (no $ sign, no commas),
  "description": "full scope of work and technical requirements, comprehensive",
  "contact_name": "contact person name or null",
  "contact_email": "contact email address or null",
  "naics_code": "most appropriate NAICS code from: 238210 electrical, 238220 plumbing/HVAC, 238160 roofing, 561730 landscaping, 236220 general construction"
}

Be thorough on the description field — capture the full scope. Return ONLY the JSON object, no other text.`;

async function extractWithAI(content) {
  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: `${EXTRACT_PROMPT}\n\nCONTENT TO ANALYZE:\n${content}` }]
  });

  const text = message.content[0].text.trim();
  const clean = text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean);

  // Fill naics if AI left it blank
  if (!parsed.naics_code) {
    parsed.naics_code = guessNaics(parsed.description || parsed.title || '');
  }

  return parsed;
}

// ─── ROUTES ───────────────────────────────────────────────

router.get('/', (req, res) => {
  res.json(db.prepare(`SELECT * FROM municipal_bids ORDER BY response_deadline ASC`).all());
});

// Universal AI Extraction — URL or pasted text
router.post('/extract', async (req, res) => {
  const { source, type } = req.body;

  if (!source || !source.trim()) {
    return res.status(400).json({ error: 'No source provided' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Anthropic API key not configured. Add it in Railway Variables.' });
  }

  try {
    let content = source;

    // If URL — fetch the page content first
    if (type === 'url') {
      try {
        const response = await axios.get(source, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        // Strip HTML tags for cleaner text
        content = response.data
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .substring(0, 8000); // cap tokens
      } catch (fetchErr) {
        return res.status(422).json({
          error: `Could not fetch URL: ${fetchErr.message}. Try pasting the bid text directly instead.`
        });
      }
    }

    const extracted = await extractWithAI(content);
    res.json({ extracted });

  } catch (err) {
    console.error('Extract error:', err);
    res.status(500).json({ error: `Extraction failed: ${err.message}` });
  }
});

// Save bid manually or after extraction
router.post('/', (req, res) => {
  const b = req.body;
  const score = calcBidScore(b);
  const result = db.prepare(`
    INSERT INTO municipal_bids
      (title, agency, state, city, naics_code, posted_date, response_deadline,
       estimated_value, description, contact_email, contact_name, bid_number, bid_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    b.title, b.agency, b.state || 'MS', b.city, b.naics_code,
    b.posted_date, b.response_deadline, b.estimated_value,
    b.description, b.contact_email, b.contact_name, b.bid_number, score
  );
  res.json({ id: result.lastInsertRowid, bid_score: score });
});

// Upload file — extract with AI if API key present
router.post('/upload', upload.single('file'), async (req, res) => {
  const b = req.body;
  const filePath = req.file ? req.file.filename : null;

  // If we have an API key and it's an image, try AI extraction
  if (process.env.ANTHROPIC_API_KEY && req.file) {
    try {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const fullPath = path.join(__dirname, '..', '..', 'uploads', req.file.filename);

      if (['.png', '.jpg', '.jpeg'].includes(ext)) {
        const imageData = fs.readFileSync(fullPath).toString('base64');
        const mediaType = ext === '.png' ? 'image/png' : 'image/jpeg';

        const message = await client.messages.create({
          model: 'claude-opus-4-6',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageData } },
              { type: 'text', text: EXTRACT_PROMPT }
            ]
          }]
        });

        const text = message.content[0].text.trim();
        const clean = text.replace(/```json|```/g, '').trim();
        const extracted = JSON.parse(clean);
        if (!extracted.naics_code) extracted.naics_code = guessNaics(extracted.description || '');
        return res.json({ extracted, file: filePath });
      }

      // PDF — extract text content and send to AI
      if (ext === '.pdf') {
        // For PDFs without a parser, send file info and ask user to paste text
        // Full PDF parsing requires additional library — flag for future upgrade
        const score = calcBidScore(b);
        const result = db.prepare(`
          INSERT INTO municipal_bids
            (title, agency, state, city, naics_code, posted_date, response_deadline,
             estimated_value, description, contact_email, contact_name, bid_number, file_path, bid_score)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          b.title || req.file.originalname.replace('.pdf', ''),
          b.agency, b.state || 'MS', b.city, b.naics_code || '236220',
          b.posted_date, b.response_deadline, b.estimated_value,
          b.description, b.contact_email, b.contact_name,
          b.bid_number, filePath, score
        );
        return res.json({
          id: result.lastInsertRowid,
          file: filePath,
          bid_score: score,
          note: 'PDF saved. For AI extraction, paste the PDF text into the Paste Text tab.'
        });
      }
    } catch (aiErr) {
      console.error('AI upload extraction failed:', aiErr.message);
      // Fall through to basic save
    }
  }

  // Basic save fallback
  const score = calcBidScore(b);
  const result = db.prepare(`
    INSERT INTO municipal_bids
      (title, agency, state, city, naics_code, posted_date, response_deadline,
       estimated_value, description, contact_email, contact_name, bid_number, file_path, bid_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    b.title || 'Uploaded Bid', b.agency, b.state || 'MS', b.city,
    b.naics_code, b.posted_date, b.response_deadline, b.estimated_value,
    b.description, b.contact_email, b.contact_name, b.bid_number, filePath, score
  );
  res.json({ id: result.lastInsertRowid, file: filePath, bid_score: score });
});

router.patch('/:id', (req, res) => {
  const fields = Object.keys(req.body).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE municipal_bids SET ${fields} WHERE id = ?`)
    .run(...Object.values(req.body), req.params.id);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  db.prepare(`DELETE FROM municipal_bids WHERE id = ?`).run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
