// One-time setup for server-side sync: obtains a Google OAuth refresh
// token (browser sign-in) and stores it DIRECTLY into Vercel env as
// GOOGLE_REFRESH_TOKEN. The token is never printed or written to disk.
import { createServer } from 'http';
import { exec, spawn } from 'child_process';
import { request as httpsRequest } from 'https';

const PORT = 9005;
const REDIR = `http://localhost:${PORT}`;

// Firebase Tools public OAuth client (open source at github.com/firebase/firebase-tools)
const C = [
  '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
  'j9iVZfS8kkCEFUPaAeJV0sAi',
];

const SCOPES = [
  'email', 'openid',
  'https://www.googleapis.com/auth/cloud-platform',
].join(' ');

function httpsCall(opts, body) {
  return new Promise((resolve, reject) => {
    const data = body ? Buffer.from(body) : null;
    if (data) opts.headers = { ...opts.headers, 'Content-Length': data.length };
    const req = httpsRequest(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, body: d }); } });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function getCode() {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, REDIR);
      const code = url.searchParams.get('code');
      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h2 style="font-family:sans-serif;padding:40px">✅ Authenticated! You can close this tab.</h2><script>setTimeout(()=>window.close(),1500)</script>');
        server.close();
        resolve(code);
      } else {
        res.writeHead(400); res.end('Error'); reject(new Error('No code'));
      }
    });
    server.listen(PORT, () => {
      const u = new URL('https://accounts.google.com/o/oauth2/auth');
      u.searchParams.set('client_id', C[0]);
      u.searchParams.set('redirect_uri', REDIR);
      u.searchParams.set('response_type', 'code');
      u.searchParams.set('scope', SCOPES);
      u.searchParams.set('access_type', 'offline');
      u.searchParams.set('prompt', 'consent select_account');
      console.log('\n🌐 Opening browser — sign in with izzy.arbiv@gmail.com...\n');
      exec(`open "${u.toString()}"`);
    });
    setTimeout(() => { server.close(); reject(new Error('Timed out waiting for browser auth')); }, 180000);
  });
}

function vercelEnv(args, stdinValue) {
  return new Promise((resolve, reject) => {
    const p = spawn('npx', ['vercel', 'env', ...args], { stdio: [stdinValue ? 'pipe' : 'ignore', 'ignore', 'ignore'] });
    if (stdinValue) { p.stdin.write(stdinValue); p.stdin.end(); }
    p.on('close', (code) => resolve(code));
    p.on('error', reject);
  });
}

async function run() {
  const code = await getCode();

  const tokenRes = await httpsCall({
    hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  }, new URLSearchParams({ code, client_id: C[0], client_secret: C[1], redirect_uri: REDIR, grant_type: 'authorization_code' }).toString());

  const refreshToken = tokenRes.body.refresh_token;
  if (!refreshToken) throw new Error('No refresh token returned (status ' + tokenRes.status + ')');

  console.log('🔐 Storing token in Vercel env (GOOGLE_REFRESH_TOKEN)...');
  await vercelEnv(['rm', 'GOOGLE_REFRESH_TOKEN', 'production', '--yes']); // ok if missing
  const codeAdd = await vercelEnv(['add', 'GOOGLE_REFRESH_TOKEN', 'production'], refreshToken);
  if (codeAdd !== 0) throw new Error('vercel env add failed');

  console.log('✅ GOOGLE_REFRESH_TOKEN stored in Vercel production env.\n');
}

run().catch(e => { console.error('\n❌ Error:', e.message, '\n'); process.exit(1); });
