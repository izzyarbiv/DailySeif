const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// Persisted query used by Spotify's own web player for episode listings.
// Overridable via env in case Spotify rotates it.
const EPISODES_QUERY_HASH =
  process.env.SPOTIFY_EPISODES_QUERY_HASH ||
  '06046f9b939d56c8eb7cdbb687da938de1164c006871aec91dc26e4dc7d8eb08';

async function getAnonymousToken(showId) {
  const res = await fetch(`https://open.spotify.com/embed/show/${showId}`, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'en' },
  });
  if (!res.ok) throw new Error(`Embed page fetch failed: ${res.status}`);
  const html = await res.text();
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('No embed data found');
  const token = JSON.parse(m[1])?.props?.pageProps?.state?.settings?.session?.accessToken;
  if (!token) throw new Error('No access token in embed page');
  return token;
}

async function fetchEpisodesPage(token, showId, offset, limit) {
  const variables = encodeURIComponent(
    JSON.stringify({ uri: `spotify:show:${showId}`, offset, limit })
  );
  const extensions = encodeURIComponent(
    JSON.stringify({ persistedQuery: { version: 1, sha256Hash: EPISODES_QUERY_HASH } })
  );
  const res = await fetch(
    `https://api-partner.spotify.com/pathfinder/v1/query?operationName=queryPodcastEpisodes&variables=${variables}&extensions=${extensions}`,
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': UA } }
  );
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Episodes fetch not JSON (${res.status}): ${text.slice(0, 120)}`);
  }
  if (data.errors?.length) throw new Error(`GraphQL error: ${data.errors[0].message}`);
  const eps = data?.data?.podcastUnionV2?.episodesV2;
  if (!eps) throw new Error('Unexpected episodes response shape');
  return eps;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const SHOW_ID = process.env.SPOTIFY_SHOW_ID;
  if (!SHOW_ID) {
    return res.status(503).json({ error: 'SPOTIFY_SHOW_ID env var not set', episodes: [] });
  }

  try {
    const token = await getAnonymousToken(SHOW_ID);

    const PAGE = 50;
    const items = [];
    let total = Infinity;
    for (let offset = 0; offset < total && offset < 400; offset += PAGE) {
      const page = await fetchEpisodesPage(token, SHOW_ID, offset, PAGE);
      total = page.totalCount ?? 0;
      items.push(...(page.items ?? []));
      if (!page.items?.length) break;
    }

    const episodes = items
      .map((it) => it?.entity?.data)
      .filter((d) => d && d.id && d.name)
      .map((d) => ({
        id: d.id,
        name: d.name,
        description: (d.description ?? '').slice(0, 500),
        url: `https://open.spotify.com/episode/${d.id}`,
        durationMs: d.duration?.totalMilliseconds ?? 0,
        releaseDate: (d.releaseDate?.isoString ?? '').slice(0, 10),
        thumbnailUrl:
          d.coverArt?.sources?.find((s) => s.width === 300)?.url ??
          d.coverArt?.sources?.[0]?.url ??
          null,
      }));

    // Only cache successful responses
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    return res.json({ episodes });
  } catch (e) {
    return res.status(500).json({ error: e.message, episodes: [] });
  }
}
