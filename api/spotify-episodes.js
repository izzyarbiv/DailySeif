export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
  const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
  const SHOW_ID = process.env.SPOTIFY_SHOW_ID;

  // Step 1: verify env vars loaded
  if (!CLIENT_ID || !CLIENT_SECRET || !SHOW_ID) {
    return res.status(503).json({ error: 'env vars missing', ids: [!!CLIENT_ID, !!CLIENT_SECRET, !!SHOW_ID], episodes: [] });
  }

  // Step 2: get token
  let tokenRes, tokenText;
  try {
    tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });
    tokenText = await tokenRes.text();
  } catch (e) {
    return res.status(502).json({ error: `token fetch failed: ${e.message}`, episodes: [] });
  }

  if (!tokenText.trim().startsWith('{')) {
    return res.status(502).json({ step: 'token', status: tokenRes.status, body: tokenText.slice(0, 300), episodes: [] });
  }

  let access_token;
  try {
    const td = JSON.parse(tokenText);
    access_token = td.access_token;
    if (!access_token) return res.status(401).json({ error: td.error, episodes: [] });
  } catch (e) {
    return res.status(502).json({ error: `token parse: ${e.message}`, raw: tokenText.slice(0, 200), episodes: [] });
  }

  // Step 3: fetch episodes
  let epText;
  try {
    const epRes = await fetch(
      `https://api.spotify.com/v1/shows/${SHOW_ID}/episodes?limit=20&market=US`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    epText = await epRes.text();
    const data = JSON.parse(epText);
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
  } catch (e) {
    return res.status(500).json({ step: 'episodes', error: e.message, raw: (epText || '').slice(0, 200), episodes: [] });
  }
}
