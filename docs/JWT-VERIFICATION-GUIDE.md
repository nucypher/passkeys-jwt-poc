# JWT Signature Verification Guide

> How to verify statement signatures in external applications

## Overview

This guide explains how to verify signatures (JWTs) created by the multi-signature statement system.

**Key Concept:** You verify the JWT signature using a public key fetched from the system's API. The API provides a **verifiable attestation** (WebAuthn assertion) that proves the key was authorized by a passkey.

---

## Verification Steps

To verify a signature, you need to:

1. **Extract the Key ID (`kid`)** from the JWT header
2. **Fetch the Public Key & Attestation** from the system API.
   > **Design Note:** We store the attestation in the database to keep JWTs lightweight. _Alternative:_ The attestation could be embedded directly inside the JWT to eliminate the API call, but this would significantly increase the size of every signature.
3. **Verify the Passkey Attestation** essential to trust the JWT signature.
4. **Verify the JWT Signature** using any standard JWT library

---

## Step-by-Step Implementation

### 1. Extract Key ID

The JWT header contains the `kid` which identifies the signing key.

```typescript
import { decodeProtectedHeader } from "jose";

const jwt = "eyJhbGciOiJFZERTQS..."; // The signature string
const header = decodeProtectedHeader(jwt);
const keyId = header.kid;
```

### 2. Fetch Public Key & Attestation

Query the system's API to get the public key and the passkey attestation.

**Endpoint:** `GET /api/jwt-keys/:keyId`

```typescript
async function getSigningKeyData(keyId: string) {
  const response = await fetch(`https://app-domain.com/api/jwt-keys/${keyId}`);

  if (!response.ok) {
    throw new Error("Signing key not found or revoked");
  }

  return await response.json();
}
```

### 3. Verify Passkey Attestation

The API returns a `passkeyAttestation` object. This is a WebAuthn authentication response where the passkey signed the **fingerprint of the JWT public key**.

To verify this, you check that the passkey signed the correct challenge (the JWT key fingerprint).

```typescript
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";

async function verifyAttestation(keyData: any) {
  // keyData is the JSON returned from getSigningKeyData()
  const { passkeyAttestation, publicKeyFingerprint, credentialId } = keyData;

  // The "challenge" the passkey signed was the JWT key's fingerprint
  const expectedChallenge = publicKeyFingerprint;

  const verification = await verifyAuthenticationResponse({
    response: passkeyAttestation,
    expectedChallenge,
    expectedOrigin: "https://app-domain.com", // The origin where the key was registered
    expectedRPID: "app-domain.com", // The RP ID of the application
    credential: {
      id: credentialId,
      // CRITICAL: We must provide the Passkey's Public Key here.
      // Why? This is an "Authentication Assertion", which proves the user signed
      // the challenge but DOES NOT contain the public key itself (unlike Registration).
      //
      // Trust Note: In this PoC, we trust the API to return the correct public key.
      // In a zero-trust model, you would fetch this key from a separate trusted source.
      publicKey: isoBase64URL.toBuffer(keyData.passkeyPublicKey),
      counter: 0,
    },
  });

  if (!verification.verified) {
    throw new Error("Passkey attestation invalid");
  }

  return true;
}
```

**Note:** Full external verification of the WebAuthn response requires knowing the passkey's public key (which is stored in the `passkey_credentials` table). The API currently returns the JWT key information. For strict verification, you would need the passkey's public key as well.

### 4. Verify JWT Signature

Use the fetched JWK to verify the JWT signature.

```typescript
import { jwtVerify, importJWK } from "jose";

async function verifyStatementSignature(jwt: string) {
  // 1. Get Key ID
  const header = decodeProtectedHeader(jwt);

  // 2. Fetch Key Data
  const keyData = await getSigningKeyData(header.kid);

  // 3. Verify Attestation (Optional)
  // await verifyAttestation(keyData);

  // 4. Verify JWT
  const publicKey = await importJWK(keyData.publicKeyJWK, "EdDSA");
  const { payload } = await jwtVerify(jwt, publicKey, {
    algorithms: ["EdDSA"],
  });

  return payload;
}
```

---

## API Response Format

The `/api/jwt-keys/:id` endpoint returns:

```json
{
  "keyId": "942c92a4901ae28969c8eb586b0672f4",
  "publicKeyJWK": {
    "kty": "OKP",
    "crv": "Ed25519",
    "x": "11qYAYKxCrfVS_7TyWQHOg7hcvP9QV8AwYp5yQghwFE"
  },
  "publicKeyFingerprint": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "passkeyAttestation": {
    "id": "mMhuCn9BzTq4...",
    "rawId": "(same as id)", // Represents the binary buffer
    "response": {
      "authenticatorData": "SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2MBAAAAAA",
      "clientDataJSON": "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoiZTNiMGM0NDI5OGZjMWMxNDlhZmJmNGM4OTk2ZmI5MjQyN2FlNDFlNDY0OWI5MzRjYTQ5NTk5MWI3ODUyYjg1NSIsIm9yaWdpbiI6Imh0dHBzOi8vYXBwLWRvbWFpbi5jb20iLCJjcm9zc09yaWdpbiI6ZmFsc2V9",
      "signature": "MEUCIQDl3..."
    },
    "type": "public-key"
  }
}
```

---

## FAQ

### Q: What does the passkey attestation prove?

It proves that the **JWT signing key** (identified by its fingerprint) was explicitly authorized by the user's passkey. The user had to perform a biometric/PIN check to generate this attestation.

### Q: Why verify the attestation?

Verifying the attestation allows you to independently confirm that the signing key was authorized by a passkey. It provides a cryptographic chain of trust from the user's hardware token to the JWT signature.

### Q: Which libraries can I use?

You can use any standard WebAuthn library for your language, such as `@simplewebauthn/server` (Node.js), `webauthn-ruby` (Ruby), `go-webauthn` (Go), or others.
