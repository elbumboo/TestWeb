const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// ==== OPTIONAL: Telegram (isi kalau mau alarm masuk ke HP) ====
const TG_TOKEN   = process.env.TG_TOKEN   || '';
const TG_CHAT_ID = process.env.TG_CHAT_ID || '';

let dashClients = []; // koneksi dashboard lo (SSE)

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Halaman dia
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Dashboard lo
app.get('/me', (req, res) => res.sendFile(path.join(__dirname, 'public', 'me.html')));

// Dipanggil waktu dia pencet "Sini call"
app.post('/api/kangen', async (req, res) => {
  const ping = { time: new Date().toISOString() };

  // 1) Push ke dashboard lo
  dashClients.forEach(c => {
    try { c.res.write(`data: ${JSON.stringify(ping)}\n\n`); } catch (e) {}
  });

  // 2) Push ke Telegram (backup kalau lo ga di depan laptop)
  if (TG_TOKEN && TG_CHAT_ID) {
    const text = `🔔 DIA KANGEN! Cepetan call sekarang.\n🕐 ${new Date().toLocaleString('id-ID')}`;
    fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT_ID, text }),
    }).catch(err => console.error('Telegram error:', err.message));
  }

  res.json({ ok: true });
});

// SSE stream buat dashboard
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write(`data: ${JSON.stringify({ type: 'hello' })}\n\n`);

  const client = { id: Date.now(), res };
  dashClients.push(client);

  const hb = setInterval(() => { try { res.write(`: ping\n\n`); } catch (e) {} }, 25000);

  req.on('close', () => {
    clearInterval(hb);
    dashClients = dashClients.filter(c => c.id !== client.id);
  });
});

app.listen(PORT, () => {
  console.log(`💌 Link buat dia     : http://localhost:${PORT}/`);
  console.log(`🚨 Dashboard kamu    : http://localhost:${PORT}/me`);
});