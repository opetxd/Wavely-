const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());

const DEEZER = "https://api.deezer.com";

function normalizeTrack(t) {
  return {
    id: t.id,
    title: t.title,
    artist: t.artist?.name || (typeof t.artist === "string" ? t.artist : "Unknown"),
    album: t.album?.title || "",
    cover: t.album?.cover_medium || t.album?.cover || "",
    preview: t.preview || "",
    duration: t.duration || 30,
  };
}

app.get("/api/trending", async (req, res) => {
  try {
    const r = await fetch(`${DEEZER}/chart/0/tracks?limit=50`);
    const d = await r.json();
    res.json({ tracks: (d.data || []).map(normalizeTrack) });
  } catch (e) {
    res.status(500).json({ tracks: [] });
  }
});

app.get("/api/search/:q", async (req, res) => {
  try {
    const q = encodeURIComponent(req.params.q);
    const r = await fetch(`${DEEZER}/search?q=${q}&limit=50`);
    const d = await r.json();
    res.json({ tracks: (d.data || []).map(normalizeTrack) });
  } catch (e) {
    res.status(500).json({ tracks: [] });
  }
});

app.get("/api/genre/:name", async (req, res) => {
  try {
    const q = encodeURIComponent(req.params.name);
    const r = await fetch(`${DEEZER}/search?q=${q}&limit=50`);
    const d = await r.json();
    res.json({ tracks: (d.data || []).map(normalizeTrack) });
  } catch (e) {
    res.status(500).json({ tracks: [] });
  }
});

// Serve index.html for ALL non-API routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SoundWave running → http://localhost:${PORT}`));
