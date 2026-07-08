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

  // Step 3: get show info (may reveal RSS feed)
  let showText;
  try {
    const showRes = await fetch(
      `https://api.spotify.com/v1/shows/${SHOW_ID}`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    showText = await showRes.text();
    const showData = JSON.parse(showText);
    return res.json({ show: showData, episodes: [] });
  } catch (e) {
    return res.status(500).json({ step: 'show', error: e.message, raw: (showText || '').slice(0, 300), episodes: [] });
  }
}
