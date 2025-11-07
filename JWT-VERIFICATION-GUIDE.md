# JWT Verification Guide

## For External Applications

This guide shows how to verify these JWTs in any application.

## Option 1: Use the Verification Library

### Installation

```bash
npm install jose @simplewebauthn/server
```

### Copy the Verifier

Copy `src/lib/jwt-hybrid-verifier.ts` to your project.

### Verify

```typescript
import { verifyHybridJWT } from "./jwt-hybrid-verifier";

const result = await verifyHybridJWT(jwt, origin, async (credentialId) => {
  // Your database lookup
  const cred = await db.getCredential(credentialId);
  return {
    publicKey: cred.publicKeyBytes,
    counter: cred.counter,
    transports: cred.transports,
    algorithm: cred.algorithm,
  };
});

if (result.valid) {
  console.log("✅ JWT verified!");
  console.log("Payload:", result.payload);
}
```

## Option 2: Use the REST API

```bash
curl -X POST http://localhost:3000/api/validate \
  -H "Content-Type: application/json" \
  -d '{"jwt": "eyJhbGci..."}'
```

**Response:**

```json
{
  "valid": true,
  "jwt_verified": true,
  "passkey_verified": true,
  "payload": { "message": "...", "nonce": "..." },
  "details": {
    "jwt_verification": "JWT signature verified",
    "passkey_verification": "Passkey attested ephemeral key"
  }
}
```

## Option 3: Manual Implementation

### Stage 1: Standard JWT Verification

```typescript
import { jwtVerify, importJWK } from "jose";

// Decode to get ephemeral public key
const parts = jwt.split(".");
const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());

// Import and verify
const publicKey = await importJWK(payload.epk, "EdDSA");
const result = await jwtVerify(jwt, publicKey, { algorithms: ["EdDSA"] });
// ✅ Stage 1 complete
```

### Stage 2: Passkey Attestation

```typescript
import { verifyAuthenticationResponse } from "@simplewebauthn/server";

const attestation = payload.passkey_attestation;

// Verify fingerprint matches
const fingerprintMatches = await verifyPublicKeyFingerprint(
  payload.epk,
  attestation.fingerprint
);

// Verify WebAuthn signature
const webauthnResult = await verifyAuthenticationResponse({
  response: attestation.signature,
  expectedChallenge: attestation.fingerprint,
  expectedOrigin: origin,
  expectedRPID: "localhost",
  credential: {
    /* from your database */
  },
});
// ✅ Stage 2 complete
```

## Verification Modes

### Full (Both Stages)

```json
{ "jwt": "..." }
```

Returns: `{ valid, jwt_verified, passkey_verified }`

### JWT Only (Stage 1)

```json
{ "jwt": "...", "mode": "jwt_only" }
```

Demonstrates standard JWT verification works.

### Inspect (No Verification)

```json
{ "jwt": "...", "mode": "inspect" }
```

Decodes header and payload using jose.

## Other Languages

### Python

```python
import requests

response = requests.post(
    'http://localhost:3000/api/validate',
    json={'jwt': jwt_token}
)
result = response.json()
```

### Go

```go
type ValidationRequest struct {
    JWT string `json:"jwt"`
}

resp, _ := http.Post(
    "http://localhost:3000/api/validate",
    "application/json",
    bytes.NewBuffer(jsonData),
)
```

### Any Language

Use HTTP client → POST to `/api/validate` → Parse JSON response

## FAQ

**Q: Can I use standard JWT libraries?**  
A: Yes for Stage 1! The JWT signature is standard EdDSA. Stage 2 requires WebAuthn verification.

**Q: Why two stages?**  
A: Stage 1 proves JWT integrity (standard). Stage 2 proves the signing key was attested by hardware (WebAuthn security).

**Q: What if I only do Stage 1?**  
A: You get standard JWT security. Stage 2 adds hardware-backed trust.

**Q: Is this production-ready?**  
A: Yes. Uses `jose` (20M+ weekly downloads) and `@simplewebauthn/server` (battle-tested).
