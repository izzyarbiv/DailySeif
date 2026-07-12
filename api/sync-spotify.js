// Server-side Spotify → Firestore sync, run by Vercel Cron daily.
// Writes via the Firestore REST API using a Google OAuth refresh token
// (project owner credentials bypass security rules), so no admin needs
// to visit the site for new episodes to appear.
import { fetchSpotifyEpisodes } from './_lib/spotify.js';

// Firebase Tools public OAuth client (open source at github.com/firebase/firebase-tools)
const GOOGLE_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

const FS_BASE = 'https://firestore.googleapis.com/v1/projects/dailyseif/databases/(default)';

async function googleAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const d = await res.json();
  if (!d.access_token) throw new Error(`Google token refresh failed: ${d.error ?? res.status}`);
  return d.access_token;
}

export default async function handler(req, res) {
  // Vercel Cron sends Authorization: Bearer $CRON_SECRET
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const SHOW_ID = process.env.SPOTIFY_SHOW_ID;
  if (!SHOW_ID) return res.status(503).json({ error: 'SPOTIFY_SHOW_ID not set' });
  if (!process.env.GOOGLE_REFRESH_TOKEN) return res.status(503).json({ error: 'GOOGLE_REFRESH_TOKEN not set' });

  try {
    const [episodes, gtoken] = await Promise.all([
      fetchSpotifyEpisodes(SHOW_ID),
      googleAccessToken(),
    ]);
    const auth = { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' };

    // All existing spotifyUrls — includes "removed" tombstones, so deleted
    // classes are not re-imported
    const qRes = await fetch(`${FS_BASE}/documents:runQuery`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'lessons' }],
          orderBy: [{ field: { fieldPath: 'spotifyUrl' } }],
          select: { fields: [{ fieldPath: 'spotifyUrl' }] },
        },
      }),
    });
    const rows = await qRes.json();
    if (!qRes.ok) throw new Error(`Firestore query failed: ${JSON.stringify(rows).slice(0, 200)}`);
    const existing = new Set(
      rows
        .filter((r) => r.document)
        .map((r) => r.document.fields?.spotifyUrl?.stringValue)
        .filter(Boolean)
    );

    const now = new Date().toISOString();
    let added = 0;
    for (const ep of episodes) {
      if (existing.has(ep.url)) continue;
      const fields = {
        title: { stringValue: ep.name },
        description: { stringValue: ep.description },
        spotifyUrl: { stringValue: ep.url },
        category: { stringValue: 'shulchan-aruch' },
        instructor: { stringValue: "R' Saks" },
        tags: { arrayValue: {} },
        isPublished: { booleanValue: true },
        publishedAt: { timestampValue: now },
        createdAt: { timestampValue: now },
        updatedAt: { timestampValue: now },
        viewCount: { integerValue: '0' },
        completionCount: { integerValue: '0' },
      };
      if (ep.durationMs) fields.duration = { integerValue: String(Math.round(ep.durationMs / 60000)) };
      if (ep.thumbnailUrl) fields.thumbnailUrl = { stringValue: ep.thumbnailUrl };

      const cRes = await fetch(`${FS_BASE}/documents/lessons`, {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ fields }),
      });
      if (!cRes.ok) throw new Error(`Firestore create failed: ${(await cRes.text()).slice(0, 200)}`);
      added++;
    }

    return res.json({ ok: true, added, totalEpisodes: episodes.length });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
