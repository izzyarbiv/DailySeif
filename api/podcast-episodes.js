export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');

  const RSS_URL = process.env.PODCAST_RSS_URL;
  if (!RSS_URL) {
    return res.status(503).json({ error: 'PODCAST_RSS_URL env var not set', episodes: [] });
  }

  let xmlText;
  try {
    const r = await fetch(RSS_URL, {
      headers: { 'User-Agent': 'DailySeif/1.0 (podcast episode fetcher)' },
    });
    if (!r.ok) return res.status(r.status).json({ error: `RSS fetch failed: ${r.status}`, episodes: [] });
    xmlText = await r.text();
  } catch (e) {
    return res.status(502).json({ error: `RSS fetch error: ${e.message}`, episodes: [] });
  }

  // Parse episodes from RSS XML without an xml parser library
  const episodes = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xmlText)) !== null) {
    const item = match[1];

    const title = decodeXml(getTag(item, 'title'));
    const description = decodeXml(stripHtml(getTag(item, 'description') || getTag(item, 'content:encoded') || getTag(item, 'itunes:summary') || ''));
    const pubDate = getTag(item, 'pubDate');
    const guid = getTag(item, 'guid');

    // Audio URL from enclosure tag
    const enclosureMatch = item.match(/<enclosure[^>]+url="([^"]+)"/i) ||
                           item.match(/<enclosure[^>]+url='([^']+)'/i);
    const audioUrl = enclosureMatch ? enclosureMatch[1] : null;

    // Duration from itunes:duration
    const durationRaw = getTag(item, 'itunes:duration') || '';
    const durationSec = parseDuration(durationRaw);

    if (!title || !audioUrl) continue;

    episodes.push({
      id: guid || audioUrl,
      name: title,
      description: description.slice(0, 500),
      audioUrl,
      durationMs: durationSec * 1000,
      releaseDate: pubDate ? new Date(pubDate).toISOString().slice(0, 10) : '',
    });
  }

  return res.json({ episodes });
}

function getTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}(?:[^>]*)><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'))
    || xml.match(new RegExp(`<${tag}(?:[^>]*)>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? m[1].trim() : '';
}

function decodeXml(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtml(s) {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseDuration(s) {
  if (!s) return 0;
  const parts = s.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parseInt(s) || 0;
}
