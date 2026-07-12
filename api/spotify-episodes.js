import { fetchSpotifyEpisodes } from './_lib/spotify.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const SHOW_ID = process.env.SPOTIFY_SHOW_ID;
  if (!SHOW_ID) {
    return res.status(503).json({ error: 'SPOTIFY_SHOW_ID env var not set', episodes: [] });
  }

  try {
    const episodes = await fetchSpotifyEpisodes(SHOW_ID);
    // Only cache successful responses
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    return res.json({ episodes });
  } catch (e) {
    return res.status(500).json({ error: e.message, episodes: [] });
  }
}
