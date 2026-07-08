export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');

  const SHOW_ID = process.env.SPOTIFY_SHOW_ID;
  if (!SHOW_ID) {
    return res.status(503).json({ error: 'SPOTIFY_SHOW_ID env var not set', episodes: [] });
  }

  try {
    // The public embed page contains an anonymous access token —
    // works for public shows without app credentials or Premium
    const embedRes = await fetch(`https://open.spotify.com/embed/show/${SHOW_ID}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    });
    if (!embedRes.ok) {
      return res.status(502).json({ error: `Embed page fetch failed: ${embedRes.status}`, episodes: [] });
    }
    const html = await embedRes.text();
    const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!m) return res.status(502).json({ error: 'No embed data found', episodes: [] });

    let token;
    try {
      token = JSON.parse(m[1])?.props?.pageProps?.state?.settings?.session?.accessToken;
    } catch {
      return res.status(502).json({ error: 'Embed data parse failed', episodes: [] });
    }
    if (!token) return res.status(502).json({ error: 'No access token in embed page', episodes: [] });

    const epRes = await fetch(
      `https://api.spotify.com/v1/shows/${SHOW_ID}/episodes?limit=50`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await epRes.json();
    if (!epRes.ok) return res.status(epRes.status).json({ error: data.error, episodes: [] });

    const episodes = (data.items ?? []).filter(Boolean).map((ep) => ({
      id: ep.id,
      name: ep.name,
      description: (ep.description ?? '').slice(0, 500),
      url: `https://open.spotify.com/episode/${ep.id}`,
      durationMs: ep.duration_ms,
      releaseDate: ep.release_date,
    }));

    return res.json({ episodes });
  } catch (e) {
    return res.status(500).json({ error: e.message, episodes: [] });
  }
}
