import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from './firebase';

const YT_UPLOAD_SCOPE = 'https://www.googleapis.com/auth/youtube.upload';
const TOKEN_KEY = 'yt_token';
const EXPIRY_KEY = 'yt_token_expiry';

export function getCachedYouTubeToken(): string | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiry = localStorage.getItem(EXPIRY_KEY);
    if (!token || !expiry || Date.now() > parseInt(expiry)) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(EXPIRY_KEY);
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

function setCachedToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    // Expire 5 min early to avoid edge-case 401s
    localStorage.setItem(EXPIRY_KEY, String(Date.now() + 55 * 60 * 1000));
  } catch {}
}

export function clearYouTubeToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
  } catch {}
}

export async function authorizeYouTube(): Promise<string> {
  const cached = getCachedYouTubeToken();
  if (cached) return cached;

  const provider = new GoogleAuthProvider();
  provider.addScope(YT_UPLOAD_SCOPE);
  const result = await signInWithPopup(auth, provider);
  const cred = GoogleAuthProvider.credentialFromResult(result);
  if (!cred?.accessToken) throw new Error('No YouTube access token received');
  setCachedToken(cred.accessToken);
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
    if (initRes.status === 401) clearYouTubeToken();
    throw new Error(`YouTube init failed (${initRes.status}): ${text.slice(0, 300)}`);
  }

  const uploadUri = initRes.headers.get('Location');
  if (!uploadUri) throw new Error('No upload URI from YouTube');

  // Stream the entire file in one XHR request — native progress, no chunk overhead
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          const data = JSON.parse(xhr.responseText) as { id: string };
          onProgress(100);
          resolve(`https://www.youtube.com/watch?v=${data.id}`);
        } catch {
          reject(new Error('Could not parse YouTube response'));
        }
      } else {
        if (xhr.status === 401) clearYouTubeToken();
        reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText.slice(0, 300)}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error — check your connection and try again'));
    xhr.ontimeout = () => reject(new Error('Upload timed out — try a smaller file or check your connection'));

    xhr.open('PUT', uploadUri);
    xhr.setRequestHeader('Content-Range', `bytes 0-${file.size - 1}/${file.size}`);
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
    xhr.send(file);
  });
}
