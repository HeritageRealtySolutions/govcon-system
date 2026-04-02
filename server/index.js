require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

async function start() {
  const { initDB } = require('./db');
  await initDB();

  app.use('/api/opportunities', require('./routes/opportunities'));
  app.use('/api/municipal', require('./routes/municipal'));
  app.use('/api/pipeline', require('./routes/pipeline'));
  app.use('/api/proposals', require('./routes/proposals'));
  app.use('/api/pricing', require('./routes/pricing'));
  app.use('/api/company', require('./routes/company'));

  if (process.env.NODE_ENV === 'production') {
    const path = require('path');
    app.use(express.static(path.join(__dirname, '../client/dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    });
  }

  app.listen(process.env.PORT || 3001, () => {
    console.log(`Lumen Bid Intelligence server running on port ${process.env.PORT || 3001}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
