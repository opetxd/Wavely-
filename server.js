const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.static("."));

const DEEZER = "https://api.deezer.com";

// Helper: normalize track from Deezer response
function normalizeTrack(t) {
  return {
    id: t.id,
    title: t.title,
    artist: t.artist?.name || (typeof t.artist === "string" ? t.artist : "Unknown"),
    album: t.album?.title || "",
    cover: t.album?.cover_medium || t.album?.cover || "",
    preview: t.preview || "",
    duration: t.duration || 30,
    link: t.link || "",
  };
}

// GET /api/trending - Chart global
app.get("/api/trending", async (req, res) => {
  try {
    const response = await fetch(`${DEEZER}/chart/0/tracks?limit=50`);
    const data = await response.json();
    const tracks = (data.data || []).map(normalizeTrack);
    res.json({ tracks });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch trending", tracks: [] });
  }
});

// GET /api/search/:q - Search tracks
app.get("/api/search/:q", async (req, res) => {
  try {
    const q = encodeURIComponent(req.params.q);
    const response = await fetch(`${DEEZER}/search?q=${q}&limit=50&output=json`);
    const data = await response.json();
    const tracks = (data.data || []).map(normalizeTrack);
    res.json({ tracks });
  } catch (e) {
    res.status(500).json({ error: "Search failed", tracks: [] });
  }
});

// GET /api/genre/:name - Search by genre keyword
app.get("/api/genre/:name", async (req, res) => {
  try {
    const q = encodeURIComponent(req.params.name);
    const response = await fetch(`${DEEZER}/search?q=${q}&limit=50`);
    const data = await response.json();
    const tracks = (data.data || []).map(normalizeTrack);
    res.json({ tracks });
  } catch (e) {
    res.status(500).json({ error: "Genre fetch failed", tracks: [] });
  }
});

// GET /api/artist/:id - Get artist top tracks
app.get("/api/artist/:id", async (req, res) => {
  try {
    const response = await fetch(`${DEEZER}/artist/${req.params.id}/top?limit=20`);
    const data = await response.json();
    const tracks = (data.data || []).map(normalizeTrack);
    res.json({ tracks });
  } catch (e) {
    res.status(500).json({ error: "Artist fetch failed", tracks: [] });
  }
});

// GET /api/new - New releases
app.get("/api/new", async (req, res) => {
  try {
    const response = await fetch(`${DEEZER}/chart/0/albums?limit=20`);
    const data = await response.json();
    res.json({ albums: data.data || [] });
  } catch (e) {
    res.status(500).json({ error: "New releases failed", albums: [] });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SoundWave API running on http://localhost:${PORT}`));
