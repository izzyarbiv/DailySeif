import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from './firebase';

const YT_UPLOAD_SCOPE = 'https://www.googleapis.com/auth/youtube.upload';

export async function authorizeYouTube(): Promise<string> {
  const provider = new GoogleAuthProvider();
  provider.addScope(YT_UPLOAD_SCOPE);
  provider.setCustomParameters({ prompt: 'consent' });
  const result = await signInWithPopup(auth, provider);
  const cred = GoogleAuthProvider.credentialFromResult(result);
  if (!cred?.accessToken) throw new Error('No YouTube access token received');
  return cred.accessToken;
}

export async function uploadVideoToYouTube(
  accessToken: string,
  file: File,
  title: string,
  description: string,
  onProgress: (percent: number) => void
): Promise<string> {
  // Initiate resumable upload session
  const initRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': file.type || 'video/mp4',
        'X-Upload-Content-Length': String(file.size),
      },
      body: JSON.stringify({
        snippet: { title, description: description || title, selfDeclaredMadeForKids: false },
        status: { privacyStatus: 'unlisted' },
      }),
    }
  );

  if (!initRes.ok) {
    const text = await initRes.text();
    throw new Error(`YouTube init failed (${initRes.status}): ${text.slice(0, 300)}`);
  }

  const uploadUri = initRes.headers.get('Location');
  if (!uploadUri) throw new Error('No upload URI from YouTube');

  // Upload in 50 MB chunks — fewer round-trips = much faster
  const CHUNK = 50 * 1024 * 1024;
  let offset = 0;

  while (offset < file.size) {
    const end = Math.min(offset + CHUNK, file.size);
    const chunk = file.slice(offset, end);

    const res = await fetch(uploadUri, {
      method: 'PUT',
      headers: {
        'Content-Range': `bytes ${offset}-${end - 1}/${file.size}`,
        'Content-Type': file.type || 'video/mp4',
      },
      body: chunk,
    });

    if (res.status === 308) {
      const range = res.headers.get('Range');
      offset = range ? parseInt(range.split('-')[1]) + 1 : end;
    } else if (res.status === 200 || res.status === 201) {
      const data = await res.json() as { id: string };
      onProgress(100);
      return `https://www.youtube.com/watch?v=${data.id}`;
    } else {
      const text = await res.text();
      throw new Error(`Chunk upload failed (${res.status}): ${text.slice(0, 200)}`);
    }

    onProgress(Math.round((offset / file.size) * 100));
  }

  throw new Error('Upload ended without a video ID');
}
