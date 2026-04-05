import express from 'express';
import cors from 'cors';

const PORT = Number(process.env.PORT) || 3001;
const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'agri-edge-backend' });
});

/**
 * Proxies ESP32 JSON so the browser avoids CORS when talking to http://<device-ip>/...
 * Query: host=192.168.4.1&path=/data
 */
app.get('/api/sensor', async (req, res) => {
  const host = String(req.query.host || '').trim();
  let path = String(req.query.path || '/data').trim();
  if (!host) {
    return res.status(400).json({ error: 'Missing host query (ESP32 IP or hostname).' });
  }
  if (!path.startsWith('/')) path = `/${path}`;

  const url = `http://${host}${path}`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 8000);

  try {
    const r = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(t);
    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({
        error: 'ESP32 did not return JSON',
        detail: text.slice(0, 200),
      });
    }
    if (!r.ok) {
      return res.status(r.status).json(data);
    }
    return res.json(data);
  } catch (e) {
    clearTimeout(t);
    const msg = e?.name === 'AbortError' ? 'Request timed out' : e?.message || String(e);
    return res.status(502).json({ error: 'Could not reach ESP32', detail: msg, tried: url });
  }
});

app.listen(PORT, () => {
  console.log(`Agri Edge API http://localhost:${PORT}`);
});

export default app;
