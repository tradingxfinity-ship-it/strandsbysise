/* Step 2 of signing in to the admin panel.
 *
 * GitHub sends the browser back here with a code. We swap it for an access
 * token and hand that to the panel, which opened this in a popup.
 *
 * The token is passed straight to the opener window and never stored on a
 * server — there isn't one to store it on.
 */

function page(status, payload) {
  /* Decap listens for this exact handshake on the opener window. */
  const body = JSON.stringify(payload);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Signing in…</title></head>
<body style="font-family:system-ui;display:grid;place-content:center;height:100vh;color:#6b6360">
<p>${status === "success" ? "Signed in. You can close this window." : "Sign-in failed."}</p>
<script>
  (function () {
    var message = 'authorization:github:${status}:' + ${JSON.stringify(body)};
    function send(e) { window.opener.postMessage(message, e.origin); }
    if (!window.opener) { document.body.innerHTML = '<p>Open the admin panel first.</p>'; return; }
    window.addEventListener('message', send, false);
    window.opener.postMessage('authorizing:github', '*');
  })();
</script>
</body></html>`;
}

function cookie(req, name) {
  return (req.headers.cookie || "")
    .split(";")
    .map((c) => c.trim().split("="))
    .filter(([k]) => k === name)
    .map(([, v]) => v)[0];
}

export default async function handler(req, res) {
  const { code, state } = req.query;
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  res.setHeader("Content-Type", "text/html; charset=utf-8");

  if (!clientId || !clientSecret) {
    res.status(500).send(page("error", { message: "GitHub credentials are not configured." }));
    return;
  }
  /* The state must match the one we set on the way out. */
  if (!state || state !== cookie(req, "sbs_oauth_state")) {
    res.status(400).send(page("error", { message: "Sign-in expired. Close this and try again." }));
    return;
  }

  try {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    const data = await response.json();

    if (data.error || !data.access_token) {
      res.status(401).send(page("error", { message: data.error_description || "GitHub refused the sign-in." }));
      return;
    }

    /* One-time use — clear it so the same round trip can't be repeated. */
    res.setHeader("Set-Cookie", "sbs_oauth_state=; Path=/; Max-Age=0");
    res.status(200).send(page("success", { token: data.access_token, provider: "github" }));
  } catch (err) {
    res.status(500).send(page("error", { message: "Could not reach GitHub. Try again." }));
  }
}
