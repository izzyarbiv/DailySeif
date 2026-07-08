const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

async function fetchWithRetry(url, options, tries = 3) {
  let lastRes;
  for (let i = 0; i < tries; i++) {
    lastRes = await fetch(url, options);
    if (lastRes.status !== 429) return lastRes;
    const wait = Number(lastRes.headers.get('retry-after')) || 2 ** i;
    await new Promise((r) => setTimeout(r, Math.min(wait, 5) * 1000));
  }
  return lastRes;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const SHOW_ID = process.env.SPOTIFY_SHOW_ID;
  if (!SHOW_ID) {
    return res.status(503).json({ error: 'SPOTIFY_SHOW_ID env var not set', episodes: [] });
  }

  try {
    // The public embed page contains an anonymous access token —
    // works for public shows without app credentials or Premium
    const embedRes = await fetchWithRetry(`https://open.spotify.com/embed/show/${SHOW_ID}`, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'en' },
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

    const epRes = await fetchWithRetry(
      `https://api.spotify.com/v1/shows/${SHOW_ID}/episodes?limit=50`,
      { headers: { Authorization: `Bearer ${token}`, 'User-Agent': UA } }
    );
    const epText = await epRes.text();
    let data;
    try {
      data = JSON.parse(epText);
    } catch {
      return res.status(502).json({ error: `Episodes fetch not JSON (${epRes.status}): ${epText.slice(0, 120)}`, episodes: [] });
    }
    if (!epRes.ok) return res.status(epRes.status).json({ error: data.error, episodes: [] });

    const episodes = (data.items ?? []).filter(Boolean).map((ep) => ({
      id: ep.id,
      name: ep.name,
      description: (ep.description ?? '').slice(0, 500),
      url: `https://open.spotify.com/episode/${ep.id}`,
      durationMs: ep.duration_ms,
      releaseDate: ep.release_date,
    }));

    // Only cache successful responses
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    return res.json({ episodes });
  } catch (e) {
    return res.status(500).json({ error: e.message, episodes: [] });
  }
}
