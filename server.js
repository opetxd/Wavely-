const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());

const DEEZER = "https://api.deezer.com";
const YT_SEARCH = "https://www.youtube.com/results?search_query=";

// Search YouTube video ID via scraping (no API key needed)
async function getYouTubeId(query) {
  try {
    const q = encodeURIComponent(query + " official audio");
    const r = await fetch(`https://www.youtube.com/results?search_query=${q}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });
    const html = await r.text();
    const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    return match ? match[1] : null;
  } catch { return null; }
}

function normTrack(t, ytId) {
  return {
    id: t.id,
    title: t.title,
    artist: t.artist?.name || t.artist || "Unknown",
    album: t.album?.title || "",
    cover: t.album?.cover_medium || t.album?.cover_big || t.album?.cover || "",
    preview: t.preview || "",
    duration: t.duration || 0,
    ytId: ytId || null,
  };
}

// Enrich tracks with YouTube IDs (batch, limit parallel)
async function enrichTracks(tracks, limit = 15) {
  const slice = tracks.slice(0, limit);
  const results = await Promise.allSettled(
    slice.map(async (t) => {
      const ytId = await getYouTubeId(`${t.artist?.name || t.artist} ${t.title}`);
      return normTrack(t, ytId);
    })
  );
  return results.map((r, i) => r.status === "fulfilled" ? r.value : normTrack(slice[i], null));
}

// GET /api/trending
app.get("/api/trending", async (req, res) => {
  try {
    const r = await fetch(`${DEEZER}/chart/0/tracks?limit=50`);
    const d = await r.json();
    const tracks = await enrichTracks(d.data || [], 20);
    res.json({ tracks });
  } catch (e) {
    res.status(500).json({ tracks: [] });
  }
});

// GET /api/search/:q
app.get("/api/search/:q", async (req, res) => {
  try {
    const q = encodeURIComponent(req.params.q);
    const r = await fetch(`${DEEZER}/search?q=${q}&limit=50`);
    const d = await r.json();
    const tracks = await enrichTracks(d.data || [], 20);
    res.json({ tracks });
  } catch (e) {
    res.status(500).json({ tracks: [] });
  }
});

// GET /api/genre/:name
app.get("/api/genre/:name", async (req, res) => {
  try {
    const q = encodeURIComponent(req.params.name);
    const r = await fetch(`${DEEZER}/search?q=${q}&limit=50`);
    const d = await r.json();
    const tracks = await enrichTracks(d.data || [], 20);
    res.json({ tracks });
  } catch (e) {
    res.status(500).json({ tracks: [] });
  }
});

// Serve index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SoundWave → http://localhost:${PORT}`));
