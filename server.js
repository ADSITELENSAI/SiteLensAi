// server.js
// Simple static server for the SiteLens front-end (index.html + script.js).
// All real logic (Supabase auth/db calls, OpenAI analysis via the Cloudflare
// Worker) still happens client-side in script.js, exactly as before — this
// server's only job is to serve the files so you can run the site locally
// instead of double-clicking index.html.

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve every file in this folder (index.html, script.js, any future assets)
app.use(express.static(path.join(__dirname)));

// Fallback: any unmatched route also gets index.html (handy if you add client-side routing later)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`SiteLens running at http://localhost:${PORT}`);
});