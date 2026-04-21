require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

async function start() {
  const { initDB } = require('./db');
  await initDB();
app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.get('/cron/sync-opportunities', async (req, res) => {
  const secret = req.headers['x-cron-secret'];
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { syncSAMOpportunities } = require('./services/samGov');
    const result = await syncSAMOpportunities();
    console.log(`[CRON] SAM.gov sync complete: ${result.saved} saved of ${result.total}`);
    res.json({ success: true, ...result, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[CRON] SAM.gov sync failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});
  // Auth routes — no middleware required
  app.use('/api/auth', require('./routes/auth'));

  // Protected routes — require valid token
  const { requireAuth } = require('./middleware/auth');
  app.use('/api/opportunities', requireAuth, require('./routes/opportunities'));
  app.use('/api/municipal',     requireAuth, require('./routes/municipal'));
  app.use('/api/pipeline',      requireAuth, require('./routes/pipeline'));
  app.use('/api/proposals',     requireAuth, require('./routes/proposals'));
  app.use('/api/pricing',       requireAuth, require('./routes/pricing'));
  app.use('/api/company',       requireAuth, require('./routes/company'));

  if (process.env.NODE_ENV === 'production') {
    const path = require('path');
    app.use(express.static(path.join(__dirname, '../client/dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    });
  }

  app.listen(process.env.PORT || 3001, () => {
    console.log(`Lumen Bid Intelligence running on port ${process.env.PORT || 3001}`);
  });
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
