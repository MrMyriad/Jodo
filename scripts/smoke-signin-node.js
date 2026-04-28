// scripts/smoke-signin-node.js
const base = process.env.BASE || 'http://localhost:3000';
const email = process.env.EMAIL || 'dev+test@example.com';
const callbackUrl = base + '/';

if (typeof fetch !== 'function') {
  console.error('Global fetch is not available in this Node runtime. Use Node 18+ or install node-fetch.');
  process.exit(2);
}

(async () => {
  try {
    console.log(`Fetching CSRF token from ${base}/api/auth/csrf`);
    let r = await fetch(`${base}/api/auth/csrf`, { method: 'GET' });
    if (!r.ok) throw new Error(`CSRF fetch failed: ${r.status}`);
    const csrfJson = await r.json();
    const csrfToken = csrfJson.csrfToken;
    console.log('CSRF token received.');
    // capture CSRF cookie set by the server and include it in subsequent requests
    const csrfSetCookie = r.headers.get('set-cookie') || '';
    let cookieJar = '';
    if (csrfSetCookie) {
      cookieJar = csrfSetCookie.split(',').map(s => s.split(';')[0]).join('; ');
    }

    const params = new URLSearchParams();
    params.append('csrfToken', csrfToken);
    params.append('email', email);
    params.append('callbackUrl', callbackUrl);

    console.log(`Posting credentials to provider dev-email for ${email}...`);
    r = await fetch(`${base}/api/auth/callback/dev-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
        , 'cookie': cookieJar
      },
      body: params.toString(),
      redirect: 'manual'
    });

    console.log('Sign-in POST status:', r.status);

    const rawSetCookie = r.headers.get('set-cookie') || '';
    console.log('set-cookie header (raw):', rawSetCookie);

    if (rawSetCookie) {
      const parsed = rawSetCookie.split(',').map(s => s.split(';')[0]).join('; ');
      cookieJar = cookieJar ? cookieJar + '; ' + parsed : parsed;
    }

    if (r.status >= 300 && r.status < 400) {
      const loc = r.headers.get('location');
      console.log('Redirect to', loc);
      const redirectRes = await fetch(loc, { method: 'GET', headers: { cookie: cookieJar } });
      console.log('Redirect final status:', redirectRes.status);
      const redirectText = await redirectRes.text();
      console.log('Redirect content snippet:\n', redirectText.slice(0, 200));
      const setCookie2 = redirectRes.headers.get('set-cookie') || '';
      if (setCookie2) {
        cookieJar = cookieJar ? cookieJar + '; ' + setCookie2.split(';')[0] : setCookie2.split(';')[0];
      }
    }

    console.log('Cookie jar:', cookieJar);

    const sessionRes = await fetch(`${base}/api/auth/session`, { method: 'GET', headers: { cookie: cookieJar } });
    console.log('Session fetch status:', sessionRes.status);
    const sessionJson = await sessionRes.json();
    console.log('Session:', JSON.stringify(sessionJson, null, 2));
    if (sessionJson && sessionJson.user && sessionJson.user.email) {
      console.log('SUCCESS: signed in as', sessionJson.user.email);
      process.exit(0);
    } else {
      console.error('ERROR: session did not contain user.');
      process.exit(1);
    }
  } catch (err) {
    console.error('ERROR', err);
    process.exit(2);
  }
})();
