# Passkeys JWT Signing PoC

> Detached signature architecture: Register JWT key once, sign many JWTs

## What This Does

Signs JWTs using a **detached signature** approach:

1. **Register once** - Passkey attests JWT signing key (one-time setup)
2. **Sign many** - Use JWT private key to sign JWTs (no passkey interaction!)
3. **Detached attestation** - Passkey signature stored in DB, not in JWT
4. **Standard JWTs** - Clean JWT structure with `kid` header

**Result:** Standard JWT verifiable with `jose.jwtVerify()` + hardware-backed security from passkeys.

## Quick Start

```bash
npm install
npm test        # Run 44 tests
npm run dev     # Start on :3000
```

## Architecture

### Registration Phase (Once)

```
1. User registers passkey (WebAuthn)
2. Generate JWT signing key pair (EdDSA)
3. Passkey signs JWT public key fingerprint
4. Store in DB:
   - JWT public key (JWK)
   - JWT public key fingerprint
   - Passkey attestation
   - Link: credential_id → key_id
```

### Signing Phase (Many Times)

```
1. Create JWT payload (message, nonce, timestamp)
2. Sign with JWT private key (jose.SignJWT)
3. NO passkey interaction needed!
4. JWT structure:
   Header:  { "alg": "EdDSA", "typ": "JWT", "kid": "..." }
   Payload: { "message": "...", "nonce": "..." }
   Signature: <EdDSA signature>
```

### Verification Phase

```
1. Extract kid from JWT header
2. Lookup JWT public key in DB by kid
3. Verify JWT signature (jose.jwtVerify)
4. Check that this JWT key is authorized (passkey in DB)
5. (Optional) Verify passkey attestation
```

**[→ See detailed flow diagrams](./FLOW.md)**

## Key Concepts

1. **One-time registration** - Passkey signs and attests a JWT public key ONCE
2. **Multiple JWT signing** - The JWT private key can sign many JWTs without passkey interaction
3. **Separate storage** - Passkey attestation is stored in DB, not in JWT payload
4. **1:1 relationship** - Each passkey links to exactly one JWT signing key

## JWT Structure

```json
{
  "header": {
    "alg": "EdDSA",
    "typ": "JWT",
    "kid": "abc123..." // Key ID for lookup
  },
  "payload": {
    "message": "your data",
    "nonce": "unique-value",
    "timestamp": 1762495377455
  },
  "signature": "<EdDSA signature>"
}
```

**Note:** The JWT does NOT contain the passkey attestation. It's clean and standard!

## Benefits

✅ **Register once, sign many** - No passkey interaction for each JWT  
✅ **Standard JWT** - Clean JWT structure without embedded attestation  
✅ **Efficient** - Fast JWT signing without WebAuthn overhead  
✅ **Simple verification** - DB lookup + standard JWT verify  
✅ **Passkey security** - JWT key is still attested by passkey

## Usage

### Register Passkey

Click "Register Passkey" → Follow browser prompts

### Register JWT Key (One-Time)

Click "Register JWT Key" → Authenticate with passkey → JWT key registered

Console shows:

```
🔑 Step 1: Generating new EdDSA JWT signing key pair...
✅ JWT key pair generated. Key ID: abc123...

🔏 Step 2: Getting passkey to attest JWT public key...
✅ Passkey attestation obtained

💾 Step 3: Registering JWT key with passkey attestation on server...
✅ JWT key registered successfully. Key ID: abc123...
```

### Sign JWT (No Passkey Prompt!)

Click "Sign JWT" → JWT created instantly (no passkey prompt!)

Console shows:

```
📝 Step 1: Creating JWT payload...
✅ JWT payload created

✍️  Step 2: Signing JWT with registered private key (using jose)...
   Key ID: abc123...
   NO passkey interaction needed!
✅ JWT signed with registered key
   This is a STANDARD JWT verifiable with jose.jwtVerify()!

💾 Step 3: Saving JWT to server...
✅ JWT saved

🔍 Step 4: Validating JWT...
   This will do TWO verifications:
   1️⃣  Standard JWT signature (with public key from DB)
   2️⃣  Passkey attestation (of that public key)

✅ JWT FULLY VERIFIED!
   JWT signature verified: ✅ PASS
   Key authorized by Passkey: ✅ PASS
```

### View JWTs

Click "Show All Details" to see:

- JWT Header
- JWT Payload (user data only, no attestation)
- JWT Signature
- Security properties

## API

| Endpoint                           | Purpose                       |
| ---------------------------------- | ----------------------------- |
| `POST /api/jwt-keys/register`      | Register JWT key with passkey |
| `GET /api/jwt-keys/:keyId`         | Get JWT key info              |
| `POST /api/sign`                   | Save JWT                      |
| `POST /api/validate`               | Verify JWT (two stages)       |
| `POST /api/validate?mode=jwt_only` | Stage 1 only (standard JWT)   |
| `POST /api/validate?mode=inspect`  | Decode without verification   |

## Testing

```bash
npm test
```

44 tests covering:

- ✅ JWT key generation (13 tests)
- ✅ JWT key registration and storage
- ✅ Standard JWT signing/verification (jose)
- ✅ Detached signature verification
- ✅ Authorization checks
- ✅ Algorithm compatibility (19 tests)
- ✅ JWT core operations (12 tests)

## Database Schema

```sql
-- Passkey credentials
CREATE TABLE credentials (
  credential_id TEXT PRIMARY KEY,
  public_key TEXT NOT NULL,
  algorithm INTEGER NOT NULL,
  counter INTEGER NOT NULL,
  transports TEXT,
  created_at INTEGER NOT NULL
);

-- JWT signing keys attested by passkeys
CREATE TABLE jwt_keys (
  key_id TEXT PRIMARY KEY,
  credential_id TEXT NOT NULL UNIQUE,  -- 1:1 relationship
  public_key_jwk TEXT NOT NULL,
  public_key_fingerprint TEXT NOT NULL,
  passkey_attestation TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (credential_id) REFERENCES credentials (credential_id)
);

-- JWTs signed with JWT keys
CREATE TABLE signatures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_id TEXT NOT NULL,
  jwt_payload TEXT NOT NULL,
  signature TEXT NOT NULL,
  jwt TEXT,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (key_id) REFERENCES jwt_keys (key_id)
);
```

## Comparison with Other Approaches

### vs. Ephemeral Keys (Previous Approach)

| Aspect                  | Detached Signature   | Ephemeral Keys               |
| ----------------------- | -------------------- | ---------------------------- |
| **Key lifetime**        | Persistent           | Per-JWT                      |
| **Passkey interaction** | Once (registration)  | Every JWT                    |
| **JWT size**            | Small                | Large (includes attestation) |
| **Signing speed**       | Fast                 | Slower (passkey)             |
| **JWT structure**       | Clean                | Embedded attestation         |
| **Security**            | Passkey-attested key | Direct passkey sig           |

### vs. Direct Passkey Signing (Original Approach)

| Aspect           | Detached Signature            | Direct Passkey         |
| ---------------- | ----------------------------- | ---------------------- |
| **Algorithm**    | EdDSA (standard)              | WebAuthn-specific      |
| **Verification** | jose.jwtVerify + DB lookup    | Custom WebAuthn verify |
| **Passkey use**  | Registration only             | Every JWT              |
| **Speed**        | Very fast                     | Moderate               |
| **UX**           | No prompts after registration | Prompt every time      |

## Tech Stack

- **jose** v5.9.6 - JWT operations
- **@simplewebauthn/server** v13.1.x - WebAuthn
- **better-sqlite3** - Storage
- **Next.js** 15.3.4 - Framework
- **Jest** 29.7.0 - Testing

## Documentation

- **[FLOW.md](./FLOW.md)** - Detailed signing & verification flows
- **[JWT-VERIFICATION-GUIDE.md](./JWT-VERIFICATION-GUIDE.md)** - Integration guide for external applications

## File Structure

```
src/
├── lib/
│   ├── jwt-key-registration.ts      # JWT key generation
│   ├── jwt-detached-verifier.ts     # Two-stage verification
│   ├── database.ts                  # DB operations
│   └── cose-to-jwt.ts               # Algorithm mapping
├── components/
│   ├── sign-jwt-button.tsx          # Client signing
│   └── jwt-signatures-list.tsx      # Display JWTs
├── app/api/
│   ├── jwt-keys/register/route.ts   # Register JWT key
│   ├── jwt-keys/[id]/route.ts       # Get JWT key
│   ├── sign/route.ts                # Save JWT
│   └── validate/route.ts            # Verify JWT
└── __tests__/
    ├── detached-signature.test.ts   # 13 tests
    ├── algorithm-compatibility.test.ts # 19 tests
    └── jwt-core.test.ts             # 12 tests
```

## Security Properties

### From JWT Signing

✅ **Signature integrity** - Payload cannot be modified  
✅ **Standard algorithm** - EdDSA is well-known  
✅ **Fast verification** - Standard JWT libraries work

### From Passkey Attestation

✅ **Hardware-backed trust** - JWT key attested by secure hardware  
✅ **Origin verification** - Passkey verified origin during registration  
✅ **User presence** - User was present during key registration  
✅ **Non-repudiation** - Only passkey holder could attest the key

### From DB Storage

✅ **Authorization tracking** - Know which keys are authorized  
✅ **Revocation** - Can revoke JWT keys independently  
✅ **Audit trail** - Track all JWTs signed by each key

MIT - Educational proof-of-concept
