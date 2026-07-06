import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from './firebase';

const YT_UPLOAD_SCOPE = 'https://www.googleapis.com/auth/youtube.upload';
const TOKEN_KEY = 'yt_token';
const EXPIRY_KEY = 'yt_token_expiry';
const RESUME_URI_KEY = 'yt_resume_uri';
const RESUME_FILE_KEY = 'yt_resume_file';

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
  } catch { return null; }
}

function setCachedToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(EXPIRY_KEY, String(Date.now() + 55 * 60 * 1000));
  } catch {}
}

export function clearYouTubeToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
  } catch {}
}

function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function saveResume(file: File, uri: string) {
  try {
    localStorage.setItem(RESUME_URI_KEY, uri);
    localStorage.setItem(RESUME_FILE_KEY, fileKey(file));
  } catch {}
}

function clearResume() {
  try {
    localStorage.removeItem(RESUME_URI_KEY);
    localStorage.removeItem(RESUME_FILE_KEY);
  } catch {}
}

async function queryResumeOffset(uri: string, fileSize: number): Promise<number | 'done' | null> {
  try {
    const res = await fetch(uri, {
      method: 'PUT',
      headers: { 'Content-Range': `bytes */${fileSize}`, 'Content-Length': '0' },
    });
    if (res.status === 308) {
      const range = res.headers.get('Range');
      return range ? parseInt(range.split('-')[1]) + 1 : 0;
    }
    if (res.status === 200 || res.status === 201) return 'done';
  } catch {}
  return null;
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
  let uploadUri: string | null = null;
  let startByte = 0;

  // Try to resume a previous upload for this exact file
  try {
    const savedFile = localStorage.getItem(RESUME_FILE_KEY);
    const savedUri = localStorage.getItem(RESUME_URI_KEY);
    if (savedUri && savedFile === fileKey(file)) {
      const offset = await queryResumeOffset(savedUri, file.size);
      if (offset === 'done') {
        clearResume();
      } else if (typeof offset === 'number') {
        uploadUri = savedUri;
        startByte = offset;
        if (startByte > 0) onProgress(Math.round((startByte / file.size) * 100));
      }
    }
  } catch {}

  // Start a fresh session if no valid resume
  if (!uploadUri) {
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
    uploadUri = initRes.headers.get('Location');
    if (!uploadUri) throw new Error('No upload URI from YouTube');
    saveResume(file, uploadUri);
  }

  const slice = startByte > 0 ? file.slice(startByte) : file;

  // Streaming fetch (Chrome 105+) — no buffering, true streaming upload
  const canStreamFetch =
    typeof TransformStream !== 'undefined' &&
    typeof ReadableStream !== 'undefined' &&
    'body' in Request.prototype;

  if (canStreamFetch) {
    let bytesUploaded = startByte;
    const progressStream = new TransformStream({
      transform(chunk: Uint8Array, controller) {
        bytesUploaded += chunk.byteLength;
        onProgress(Math.round((bytesUploaded / file.size) * 100));
        controller.enqueue(chunk);
      },
    });

    const res = await fetch(uploadUri, {
      method: 'PUT',
      headers: {
        'Content-Range': `bytes ${startByte}-${file.size - 1}/${file.size}`,
        'Content-Type': file.type || 'video/mp4',
      },
      // @ts-expect-error duplex required for streaming request body in Chrome
      duplex: 'half',
      body: slice.stream().pipeThrough(progressStream),
    });

    if (res.ok) {
      clearResume();
      const data = (await res.json()) as { id: string };
      onProgress(100);
      return `https://www.youtube.com/watch?v=${data.id}`;
    }
    if (res.status === 401) clearYouTubeToken();
    const text = await res.text();
    throw new Error(`Upload failed (${res.status}): ${text.slice(0, 300)}`);
  }

  // XHR fallback
  return new Promise((resolve, reject) => {
    let bytesUploaded = startByte;
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        bytesUploaded = startByte + e.loaded;
        onProgress(Math.round((bytesUploaded / file.size) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        clearResume();
        try {
          const data = JSON.parse(xhr.responseText) as { id: string };
          onProgress(100);
          resolve(`https://www.youtube.com/watch?v=${data.id}`);
        } catch { reject(new Error('Could not parse YouTube response')); }
      } else {
        if (xhr.status === 401) clearYouTubeToken();
        reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText.slice(0, 300)}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error — check your connection and try again'));
    xhr.open('PUT', uploadUri!);
    xhr.setRequestHeader('Content-Range', `bytes ${startByte}-${file.size - 1}/${file.size}`);
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
    xhr.send(slice);
  });
}
