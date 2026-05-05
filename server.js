// ═══════════════════════════════════════════
//  Wavely — server.js
//  Backend proxy for iTunes Search API (free, no key)
//  Run: node server.js
// ═══════════════════════════════════════════

const http  = require('http');
const https = require('https');
const url   = require('url');
const fs    = require('fs');
const path  = require('path');

const PORT = process.env.PORT || 3000;

// ── CORS ──────────────────────────────────
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ── iTunes fetch ──────────────────────────
function itunes(endpoint) {
  return new Promise((resolve, reject) => {
    https.get('https://itunes.apple.com' + endpoint, resp => {
      let raw = '';
      resp.on('data', c => raw += c);
      resp.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error('iTunes parse error')); }
      });
    }).on('error', reject);
  });
}

// ── Transform ─────────────────────────────
function song(t) {
  return {
    id:          t.trackId,
    title:       t.trackName        || 'Unknown',
    artist:      t.artistName       || 'Unknown',
    album:       t.collectionName   || 'Unknown',
    cover:       (t.artworkUrl100 || '').replace('100x100', '600x600'),
    coverSmall:  t.artworkUrl100    || '',
    preview:     t.previewUrl       || null,
    duration:    Math.floor((t.trackTimeMillis || 0) / 1000),
    genre:       t.primaryGenreName || '',
    releaseDate: (t.releaseDate || '').split('T')[0],
  };
}

// ── Route handlers ────────────────────────
const routes = {

  // /api/search?q=dua+lipa&limit=20
  '/api/search': async q => {
    const term   = encodeURIComponent(q.q || 'pop');
    const limit  = clamp(q.limit, 5, 50, 20);
    const entity = q.type || 'song';
    const data   = await itunes(`/search?term=${term}&entity=${entity}&limit=${limit}&media=music`);
    return { results: (data.results || []).map(song), total: data.resultCount };
  },

  // /api/trending?genre=pop&limit=10
  '/api/trending': async q => {
    const genre = encodeURIComponent(q.genre || 'pop hits');
    const limit = clamp(q.limit, 5, 25, 10);
    const data  = await itunes(`/search?term=${genre}&entity=song&limit=${limit}&media=music`);
    return { results: (data.results || []).map(song) };
  },

  // /api/new?genre=rnb&limit=10
  '/api/new': async q => {
    const genre = encodeURIComponent((q.genre || 'rnb') + ' ' + new Date().getFullYear());
    const limit = clamp(q.limit, 5, 25, 10);
    const data  = await itunes(`/search?term=${genre}&entity=song&limit=${limit}&media=music`);
    return { results: (data.results || []).map(song) };
  },

  // /api/charts?country=us&limit=20
  '/api/charts': async q => {
    const country = q.country || 'us';
    const limit   = clamp(q.limit, 5, 100, 20);
    const data    = await itunes(`/search?term=top+hits&entity=song&limit=${limit}&media=music&country=${country}`);
    return { results: (data.results || []).map(song) };
  },

  // /api/artist?name=taylor+swift
  '/api/artist': async q => {
    const name  = encodeURIComponent(q.name || '');
    const limit = clamp(q.limit, 5, 25, 10);
    const data  = await itunes(`/search?term=${name}&entity=song&limit=${limit}&media=music`);
    return { results: (data.results || []).map(song) };
  },

  // /api/album?artist=dua+lipa&name=future+nostalgia
  '/api/album': async q => {
    const term = encodeURIComponent([(q.artist || ''), (q.name || '')].join(' ').trim());
    const data = await itunes(`/search?term=${term}&entity=song&limit=20&media=music`);
    return { results: (data.results || []).map(song) };
  },
};

// ── Utility ───────────────────────────────
function clamp(val, min, max, def) {
  const n = parseInt(val);
  return isNaN(n) ? def : Math.min(max, Math.max(min, n));
}

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'Content-Type': type });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

// ── Server ────────────────────────────────
const server = http.createServer(async (req, res) => {
  const parsed   = url.parse(req.url, true);
  const pathname = parsed.pathname;

  cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // Serve index.html
  if (pathname === '/' || pathname === '/index.html') {
    const file = path.join(__dirname, 'index.html');
    if (fs.existsSync(file)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      fs.createReadStream(file).pipe(res);
    } else {
      send(res, 404, 'index.html not found', 'text/plain');
    }
    return;
  }

  // API routes
  if (routes[pathname]) {
    try {
      const result = await routes[pathname](parsed.query);
      send(res, 200, result);
    } catch (err) {
      console.error('[API Error]', pathname, err.message);
      send(res, 502, { error: 'Upstream error', message: err.message });
    }
    return;
  }

  send(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log('\n🎵  Wavely server started');
  console.log(`    http://localhost:${PORT}\n`);
  console.log('    Routes:');
  Object.keys(routes).forEach(r => console.log(`    GET ${r}`));
  console.log('');
});
