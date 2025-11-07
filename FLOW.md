# Signing & Verification Flow

## Signing Flow

### Step 1: Generate Ephemeral Key Pair

```typescript
const ephemeralKeys = await generateEphemeralKeyPair();
// Creates: { publicKey, privateKey, publicKeyJWK, publicKeyFingerprint }
```

**What happens:**

- Ed25519 key pair generated using Web Crypto API
- Public key exported as JWK (JSON Web Key)
- Fingerprint = SHA-256(canonical JWK)

### Step 2: Passkey Signs Ephemeral Public Key

```typescript
const passkeyAttestation = await startAuthentication({
  challenge: ephemeralKeys.publicKeyFingerprint,
});
```

**What happens:**

- Challenge = ephemeral public key fingerprint
- User authenticates (biometric, PIN, etc.)
- Passkey (in secure hardware) signs the challenge
- Returns WebAuthn `AuthenticationResponseJSON`

### Step 3: Build JWT Payload

```typescript
const payload = {
  message: "your data",
  nonce: "unique-value",
  timestamp: Date.now(),
  epk: ephemeralKeys.publicKeyJWK, // Ephemeral public key
  passkey_attestation: {
    credential_id: credentialId,
    fingerprint: ephemeralKeys.publicKeyFingerprint,
    signature: passkeyAttestation, // WebAuthn response
  },
};
```

### Step 4: Sign JWT with Ephemeral Private Key

```typescript
const jwt = await new SignJWT(payload)
  .setProtectedHeader({ alg: "EdDSA", typ: "JWT" })
  .sign(ephemeralKeys.privateKey);
```

**Result:** Standard JWT with structure `header.payload.signature`

---

## Verification Flow

### Stage 1: Standard JWT Verification

```typescript
// Extract ephemeral public key from payload
const parts = jwt.split(".");
const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
const publicKey = await importJWK(payload.epk, "EdDSA");

// Verify JWT signature using jose
const result = await jwtVerify(jwt, publicKey, { algorithms: ["EdDSA"] });
// ✅ JWT signature valid
```

**Works with ANY JWT library** - This is standard JWT verification.

### Stage 2: Passkey Attestation Verification

```typescript
const attestation = payload.passkey_attestation;

// 1. Verify fingerprint matches ephemeral public key
const fingerprintValid = await verifyPublicKeyFingerprint(
  payload.epk,
  attestation.fingerprint
);

// 2. Verify passkey signed the fingerprint
const passkeyValid = await verifyAuthenticationResponse({
  response: attestation.signature,
  expectedChallenge: attestation.fingerprint,
  expectedOrigin: origin,
  expectedRPID: "localhost",
  credential: { id, publicKey, counter, transports },
});
// ✅ Passkey attestation valid
```

**WebAuthn verification** - Ensures hardware-backed trust.

---

## JWT Structure

```
eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdl...
│                                     │
│  Header (base64url)                 │  Payload (base64url)
│  { alg: "EdDSA", typ: "JWT" }       │  {
│                                     │    message: "...",
│                                     │    epk: { kty, crv, x },
│                                     │    passkey_attestation: { ... }
│                                     │  }
│
│  Signature (base64url)
│  EdDSA signature by ephemeral private key
```

---

## Security Properties

### From Stage 1 (JWT)

- Signature integrity (payload can't be modified)
- Standard verification (any JWT library)

### From Stage 2 (Passkey)

- Hardware-backed trust (ephemeral key is attested)
- Origin verification (prevents phishing)
- User presence (proves user interaction)
- Replay protection (counter mechanism)
- Non-repudiation (only passkey holder can attest)

---

## API Endpoints

### Sign JWT

```typescript
POST /api/sign
{ jwt: "eyJ...", credentialId: "..." }
```

### Verify JWT

```typescript
POST / api / validate;
{
  jwt: "eyJ...";
}
// Returns: { valid, jwt_verified, passkey_verified, ... }
```

### Verify JWT Only (Stage 1)

```typescript
POST /api/validate
{ jwt: "eyJ...", mode: "jwt_only" }
// Demonstrates standard JWT verification works
```

### Inspect JWT

```typescript
POST /api/validate
{ jwt: "eyJ...", mode: "inspect" }
// Decodes without verification
```
