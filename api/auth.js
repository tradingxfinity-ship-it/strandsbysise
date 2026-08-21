/* Step 1 of signing in to the admin panel.
 *
 * Sends the browser to GitHub to ask permission. GitHub sends it back to
 * api/callback.js with a short-lived code.
 *
 * The client secret is never in this repo — it lives in the Vercel
 * environment variables. See README §7.
 */
import crypto from "node:crypto";

export default function handler(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    res.status(500).send(
      "GITHUB_CLIENT_ID is not set. Add it in Vercel → Settings → Environment Variables."
    );
    return;
  }

  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";

  /* Carried through the round trip and checked on the way back, so a
     response can't be replayed from somewhere else. */
  const state = crypto.randomBytes(16).toString("hex");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${proto}://${host}/api/callback`,
    scope: "repo,user",
    state,
  });

  res.setHeader(
    "Set-Cookie",
    `sbs_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
  );
  res.redirect(302, `https://github.com/login/oauth/authorize?${params}`);
}
