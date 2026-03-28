---
title: "Access Tokens & Refresh Tokens: A Production Security Guide"
description: "What access tokens and refresh tokens are, how they work together, and the exact patterns you need to implement them securely in production."
author: "aliek"
date: 2026-03-15
topic: "dev"
layout: blog
---

Authentication is one of the most critical—and most misunderstood—parts of any production system. Get it wrong, and a stolen credential can silently compromise user accounts for weeks. Get it right, and even a leaked token becomes nearly useless to an attacker within minutes.

The two-token pattern—access tokens paired with refresh tokens—is the industry standard for stateless, revocable, secure authentication. This post explains exactly how it works, why each design decision matters, and the concrete rules you need to follow in production.

---

## The core problem with a single token

The naive approach is to issue one long-lived token on login and send it with every request. Simple. But consider the attack surface:

- **Every API request exposes the token.** It travels over the wire, sits in headers, and sometimes ends up in logs.
- **Once compromised, it stays compromised.** If an attacker steals a 30-day token on day one, they have 29 days of free access.
- **Revocation is hard.** Stateless tokens (like JWTs) can't be "un-issued." You'd need a server-side blocklist—which defeats much of the purpose of stateless auth.

The two-token system solves all three of these problems by splitting the credential into two pieces with different lifetimes, storage locations, and exposure surfaces.

---

## What is an access token?

An access token is a **short-lived credential** sent with every API request to prove the caller is authorized.

- **Lifetime:** 5 to 60 minutes (15 minutes is a common production default)
- **Format:** Usually a signed JWT (JSON Web Token)
- **Where it lives:** In memory, or as an `Authorization: Bearer <token>` header on requests
- **What it contains:** User ID, roles/permissions, expiry timestamp—all cryptographically signed

Because it's sent with every request, it has the highest exposure of the two tokens. The short lifetime is its defense: even if an attacker intercepts it, it expires before they can do much with it.

### What a decoded JWT access token looks like

```json
{
  "sub": "user_8f2k39",
  "email": "futoid@aliek.com",
  "roles": ["user"],
  "iat": 1742000000,
  "exp": 1742000900
}
```

The `exp` field is the expiry—900 seconds (15 minutes) after issue. The signature covering this payload is what makes it tamper-proof.

---

## What is a refresh token?

A refresh token is a **long-lived credential** used for exactly one purpose: obtaining a new access token when the current one expires. It never touches your API directly.

- **Lifetime:** Days to weeks (7–30 days is typical)
- **Format:** An opaque string (not a JWT)—it's just a secure random identifier
- **Where it lives:** Stored server-side (in a database) and client-side in a secure, httpOnly cookie
- **What it does:** Sent to the auth server's `/refresh` endpoint to get a fresh access token

The refresh token's power comes from its storage. Because it lives in an `httpOnly` cookie, JavaScript running in the browser—including any injected XSS payload—cannot read it. It's invisible to the code layer that handles your API calls.

---

## How they work together

Here's the complete lifecycle:

```
1. User logs in with credentials
   → Auth server issues: access token + refresh token

2. Client stores:
   → Access token: in memory (JS variable or React state)
   → Refresh token: in httpOnly, Secure, SameSite=Strict cookie

3. API call
   → Client sends: Authorization: Bearer <access_token>
   → Server validates signature + checks expiry
   → Returns: data

4. Access token expires (after 15 min)
   → Client silently calls: POST /auth/refresh
   → Browser automatically sends httpOnly cookie with request
   → Auth server validates refresh token, issues new access token
   → Client swaps the old access token in memory for the new one
   → API calls resume transparently

5. User logs out (or suspicious activity detected)
   → Auth server marks refresh token as revoked in database
   → All future refresh requests fail
   → Active sessions expire within 15 minutes at most
```

The user never sees steps 4 and 5 happening. From their perspective, they just stay logged in—or they get logged out immediately if something goes wrong.

---

## Why this is more secure

### Short exposure window

If an access token is stolen—through a log leak, a misconfigured proxy, or a compromised third-party script—the attacker has at most 15 minutes of access. The refresh token, stored in an httpOnly cookie, was never accessible to the attacker in the first place.

### Instant revocation

Because refresh tokens are stored in your database, you can revoke any session immediately:

- User changes their password → revoke all refresh tokens
- Admin flags suspicious activity → revoke that user's tokens
- User logs out → revoke that specific token

Without this, the best you can do with a stateless access token is wait for it to expire.

### Defense against XSS

XSS (cross-site scripting) attacks can steal anything JavaScript can read. Access tokens in `localStorage` are wide open. Refresh tokens in httpOnly cookies are completely invisible to JavaScript. Even a fully compromised XSS payload cannot extract the refresh token.

---

## Refresh token rotation

Static refresh tokens (ones that never change) are a liability. If one is ever leaked, the attacker has it indefinitely.

**Refresh token rotation** solves this: every time the client exchanges a refresh token for a new access token, the auth server also issues a brand new refresh token and invalidates the old one.

```
Client sends: refresh_token_A
Server responds: new_access_token + refresh_token_B (token_A is now invalid)
```

Additionally, implement **reuse detection**: if `refresh_token_A` is presented after it has already been exchanged, something is wrong—either a replay attack or a compromised token. The correct response is to revoke the entire token family (all sessions for that user) and force a re-login.

---

## Production implementation checklist

### Token issuance

```javascript
// On successful login
const accessToken = jwt.sign(
  { sub: user.id, roles: user.roles },
  process.env.JWT_SECRET,
  { expiresIn: "15m" },
);

const refreshToken = crypto.randomBytes(64).toString("hex");

// Store refresh token hash in database (never the raw token)
await db.refreshTokens.create({
  tokenHash: await bcrypt.hash(refreshToken, 10),
  userId: user.id,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  family: generateTokenFamily(), // for reuse detection
});

// Send refresh token as httpOnly cookie
res.cookie("refresh_token", refreshToken, {
  httpOnly: true, // not accessible to JavaScript
  secure: true, // HTTPS only
  sameSite: "strict", // no cross-site requests
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/auth/refresh", // cookie only sent to this endpoint
});

// Send access token in response body
res.json({ accessToken });
```

### Token refresh endpoint

```javascript
app.post("/auth/refresh", async (req, res) => {
  const rawToken = req.cookies.refresh_token;
  if (!rawToken) return res.status(401).json({ error: "No refresh token" });

  // Find matching token record
  const records = await db.refreshTokens.findByFamily(/* ... */);
  const record = await findMatchingRecord(rawToken, records);

  if (!record) {
    // Reuse detected: revoke entire family
    await db.refreshTokens.revokeFamily(req.cookies.family_id);
    return res.status(401).json({ error: "Token reuse detected" });
  }

  if (record.expiresAt < new Date()) {
    return res.status(401).json({ error: "Refresh token expired" });
  }

  // Rotate: invalidate old token, issue new one
  await db.refreshTokens.revoke(record.id);

  const newRefreshToken = crypto.randomBytes(64).toString("hex");
  await db.refreshTokens.create({
    /* ... */
  });

  const newAccessToken = jwt.sign(
    { sub: record.userId },
    process.env.JWT_SECRET,
    { expiresIn: "15m" },
  );

  res.cookie("refresh_token", newRefreshToken, {
    /* same options */
  });
  res.json({ accessToken: newAccessToken });
});
```

### Client-side token handling

```javascript
// Store access token in memory only — never localStorage
let accessToken = null;

// Axios interceptor: attach token to every request
axios.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Axios interceptor: silently refresh on 401
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const { data } = await axios.post("/auth/refresh");
      accessToken = data.accessToken; // update in-memory token
      error.config.headers.Authorization = `Bearer ${accessToken}`;
      return axios(error.config); // retry original request
    }
    return Promise.reject(error);
  },
);
```

---

## What not to do

**Never store access tokens in `localStorage` or `sessionStorage`.** Both are readable by any JavaScript on the page, including injected scripts.

**Never store refresh tokens in `localStorage`.** Same reason, with higher stakes given the longer lifetime.

**Never put sensitive data in the JWT payload.** JWTs are base64-encoded, not encrypted. Anyone who intercepts one can decode the payload. Keep it to user ID and roles only.

**Never log full tokens.** Logs are often stored, replicated, and accessed by more people than your application. Log token IDs or hashes, not the tokens themselves.

**Never skip HTTPS.** Every security property described here assumes transport-layer encryption. On plain HTTP, all of it falls apart.

**Don't set refresh token lifetimes too long.** 7 days is a reasonable default. 90-day refresh tokens are common but require especially robust rotation and revocation logic.

---

## A quick comparison

| Property         | Access Token         | Refresh Token        |
| ---------------- | -------------------- | -------------------- |
| Lifetime         | 5–60 minutes         | Days to weeks        |
| Sent with        | Every API request    | Only `/auth/refresh` |
| Storage (client) | In memory            | httpOnly cookie      |
| Storage (server) | Not stored           | Hashed in database   |
| Readable by JS   | Yes (from memory)    | No (httpOnly)        |
| Can be revoked   | No (waits to expire) | Yes, immediately     |
| Format           | Signed JWT           | Opaque random string |

---

## Summary

The access token / refresh token split is not unnecessary complexity—it's the minimum viable security model for any production system handling authenticated users.

Short-lived access tokens limit damage from exposure. Long-lived refresh tokens in httpOnly cookies let users stay logged in without the risk of a persistent stolen credential. Rotation and reuse detection turn any compromised token into an alarm rather than a free pass.

Follow the storage rules strictly (memory for access tokens, httpOnly cookie for refresh tokens), implement rotation on every refresh, and wire up revocation for logout and password changes. That's the foundation everything else builds on.
