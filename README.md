# Passkeys JWT Signing PoC

> Hybrid JWT signing: Ephemeral EdDSA keys + Passkey attestation

## What This Does

Signs JWTs using:

1. **Ephemeral EdDSA key** (generated fresh each time)
2. **Passkey attestation** (proves the ephemeral key is legitimate)

**Result:** Standard JWT verifiable with `jose.jwtVerify()` + hardware-backed security from passkeys.

## Quick Start

```bash
npm install
npm test        # Run 43 tests
npm run dev     # Start on :3000
```

## Core Concept

```
1. Generate ephemeral EdDSA key pair
2. Passkey signs ephemeral public key fingerprint
3. Sign JWT with ephemeral private key
4. JWT includes: data + public key + passkey attestation
```

**Verification (Two Stages):**

1. Verify JWT signature with ephemeral public key (standard JWT)
2. Verify passkey attestation of that public key (WebAuthn)

**[→ See detailed flow](./FLOW.md)**

## JWT Structure

```json
{
  "header": { "alg": "EdDSA", "typ": "JWT" },
  "payload": {
    "message": "your data",
    "nonce": "...",
    "timestamp": 123,
    "epk": { "kty": "OKP", "crv": "Ed25519", "x": "..." },
    "passkey_attestation": {
      "credential_id": "...",
      "fingerprint": "...",
      "signature": {
        /* WebAuthn response */
      }
    }
  },
  "signature": "..." // EdDSA signature
}
```

## Key Benefits

✅ **Standard JWT verification** - Works with `jose.jwtVerify()`  
✅ **Hardware-backed security** - Passkey attests ephemeral key  
✅ **No custom formats** - Uses "EdDSA" algorithm

## Usage

### Register Passkey

Click "Register Passkey" → Follow browser prompts

### Sign JWT

Click "Sign JWT" → Authenticate → JWT created and verified

Console shows:

```
🔑 Generating ephemeral key...
🔏 Getting passkey attestation...
✍️  Signing JWT...
🔍 Verifying (2 stages)...
✅ JWT FULLY VERIFIED!
```

### View JWTs

Click "Show All Details" to see:

- JWT Header
- JWT Payload (user data, ephemeral key, passkey attestation)
- JWT Signature
- Security properties

## API

| Endpoint                           | Purpose                                  |
| ---------------------------------- | ---------------------------------------- |
| `POST /api/sign`                   | Save JWT                                 |
| `POST /api/validate`               | Verify JWT (both stages)                 |
| `POST /api/validate?mode=jwt_only` | Stage 1 only (demonstrates standard JWT) |
| `POST /api/validate?mode=inspect`  | Decode without verification              |

## Testing

```bash
npm test
```

Tests covering:

- Ephemeral key generation
- Standard JWT signing/verification (jose)
- Passkey attestation
- Two-stage verification
- Algorithm compatibility

## Tech Stack

- **jose** v5.9.6 - JWT operations
- **@simplewebauthn/server** v13.1.x - WebAuthn
- **better-sqlite3** - Storage
- **Next.js** 15.3.4 - Framework
- **Jest** 29.7.0 - Testing

## Documentation

- **[FLOW.md](./FLOW.md)** - Detailed signing & verification flows
- **[JWT-VERIFICATION-GUIDE.md](./JWT-VERIFICATION-GUIDE.md)** - Integration guide

## File Structure

```
src/
├── lib/
│   ├── ephemeral-keys.ts         # Key generation
│   ├── jwt-hybrid-verifier.ts    # Two-stage verification
│   └── cose-to-jwt.ts            # Algorithm mapping
├── components/
│   ├── sign-jwt-button.tsx       # Client signing
│   └── jwt-signatures-list.tsx   # Display JWTs
├── app/api/
│   ├── sign/route.ts             # Save JWT
│   └── validate/route.ts         # Verify JWT
└── __tests__/
    ├── hybrid-jwt.test.ts        # 12 tests
    └── ...
```

## Security

**From JWT (Stage 1):**

- Signature integrity
- Standard verification

**From Passkey (Stage 2):**

- Hardware-backed trust
- Origin verification
- User presence
- Replay protection
- Non-repudiation

MIT - Educational proof-of-concept
