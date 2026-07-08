export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
  const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
  const SHOW_ID = process.env.SPOTIFY_SHOW_ID;

  if (!CLIENT_ID || !CLIENT_SECRET || !SHOW_ID) {
    return res.status(503).json({ error: 'Spotify not configured', episodes: [] });
  }

  try {
    // Client Credentials token
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    const tokenText = await tokenRes.text();
    if (!tokenText.startsWith('{')) {
      return res.status(502).json({ error: `Spotify auth status=${tokenRes.status} body=${tokenText.slice(0, 300)}`, episodes: [] });
    }
    const tokenData = JSON.parse(tokenText);
    const { access_token, error: tokenErr } = tokenData;
    if (!access_token) return res.status(401).json({ error: tokenErr, details: tokenData, episodes: [] });

    // Fetch latest episodes
    const epRes = await fetch(
      `https://api.spotify.com/v1/shows/${SHOW_ID}/episodes?limit=20&market=US`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    const data = await epRes.json();
    if (!epRes.ok) return res.status(epRes.status).json({ error: data.error, episodes: [] });

    const episodes = (data.items ?? []).map((ep) => ({
      id: ep.id,
      name: ep.name,
      description: (ep.description ?? '').slice(0, 500),
      url: `https://open.spotify.com/episode/${ep.id}`,
      durationMs: ep.duration_ms,
      releaseDate: ep.release_date,
    }));

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    return res.json({ episodes });
  } catch (err) {
    return res.status(500).json({ error: err.message, episodes: [] });
  }
}
