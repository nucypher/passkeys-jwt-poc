# Multi-Signature Statement Approval System

> Collaborative approval of JSON statements through threshold signatures with passkey-backed security

## Overview

This system enables **multiple parties to collaboratively approve JSON statements** using digital signatures. A statement becomes valid only when it receives a **threshold number of signatures** (e.g., 2 out of 3 users must sign).

**Key Security Feature:** Combines passkey security (hardware-backed attestation) with efficient JWT signing for fast, collaborative workflows.

---

## How It Works

### The Process

1. **Creator** drafts a JSON statement (e.g., investment terms, contract)
2. **Multiple users** review and sign the statement
3. **Threshold reached** (e.g., 2 signatures) → Statement becomes valid ✅

### Two-Key Design

This system uses **two types of keys** for optimal security and efficiency:

| Key Type            | Purpose                      | When Used                          |
| ------------------- | ---------------------------- | ---------------------------------- |
| **Passkey**         | Attests your JWT signing key | Once during setup                  |
| **JWT Signing Key** | Signs statements             | Every time you approve a statement |

**Why?** Passkeys provide hardware-backed security, while JWT signing keys enable fast signing without repeated biometric prompts.

---

## Quick Start

```bash
npm install
npm run dev     # Starts on http://localhost:3000
```

Visit the homepage and select your role:

- **Creator** - Draft JSON statements and check approvals
- **Investor** - Review and sign JSON statements

---

## One-Time Setup

Before you can sign statements, you complete a one-time setup:

1. **Choose your role** (Creator or Investor)
2. **Enter your name** (e.g., "Jeff", "Alice", "Bob", "Carol")
3. **Register a passkey** - Your device prompts for biometric/PIN
4. **System generates your JWT signing key** - Automatic
5. **Passkey attests your signing key** - Creates cryptographic proof

**Result:** You're ready to sign! All future approvals happen instantly without passkey prompts.

### What Just Happened?

- Your passkey created a **cryptographic proof** that your JWT signing key is legitimate
- This proof is stored in the database
- Now you can sign statements **instantly** using your JWT signing key
- The system knows your signatures are trustworthy because your key was attested by a passkey

---

## Key Features

### Collaborative Approval

- Multiple users can sign the same statement
- Configurable threshold (currently 2-of-3)
- Statement becomes valid only when threshold is reached

### Security

- **Hardware-backed**: Passkeys use secure hardware enclaves (TPM, Secure Enclave...)
- **Cryptographic proof**: Each signing key is attested by a passkey
- **Standard JWTs**: Signatures use EdDSA (Ed25519) algorithm
- **Threshold-based signature requirement**: Statement becomes valid only when the threshold of signatures is reached

### User Experience

- **Two-step setup**: Passkey registration (once), then attestation of signing key (once)
- **Instant signing**: No biometric prompts for every signature

---

## System Architecture

### User Roles

**Creator** (1 user)

- Creates JSON statements
- Can sign own statements
- Views approval status for all statements

**Investors** (2+ users)

- Reviews statements and their approval status
- Signs statements to approve

### Threshold Validation

Statements have 2 states:

1. **Pending** - Awaiting sufficient signatures
2. **Approved** - Threshold reached (e.g., 2/3 signatures) ✓

Note: In future, can have a rejected state by adding explicit rejection mechanism.

## Technical Details

### Database Schema

```sql
-- Users with passkey credentials
users (user_id, name, role, credential_id, created_at)
passkey_credentials (credential_id, public_key, counter, ...)

-- JWT signing keys attested by passkeys
attested_jwt_keys (
  key_id,
  user_id,
  credential_id,
  public_key_jwk,
  passkey_attestation,  -- Proof that passkey attested this key
  created_at
)

-- Statements and their signatures
statements (statement_id, title, content, creator_id, created_at)
statement_signatures (
  id,
  statement_id,
  user_id,
  jwt,              -- The actual signature (JWT)
  signed_at
)
```

### JWT Structure

Each user signature of a statement is formatted as a JWT:

```json
{
  "header": {
    "alg": "EdDSA",
    "typ": "JWT",
    "kid": "user-signing-key-id"
  },
  "payload": {
    "statementId": "stmt-123",
    "content": "{...statement JSON...}",
    "signer": "user-abc",
    "timestamp": 1732147200000
  },
  "signature": "..."
}
```

### API

**Registration (Consolidated)**

- `POST /api/credentials` - Get passkey registration options
- `POST /api/register/complete` - Complete registration (verify passkey + create user + register JWT key)

**Authentication**

- `POST /api/authenticate/options` - Get authentication challenge
- `POST /api/authenticate` - Verify passkey authentication

**User Management**

- `GET /api/users` - List all users
- `GET /api/users/[credentialId]` - Get user by credential ID

**Statement Management**

- `POST /api/statements/create` - Create new statement
- `GET /api/statements` - List all statements
- `GET /api/statements/[id]` - Get specific statement
- `POST /api/statements/[id]/sign` - Sign a statement

**Key Management**

- `GET /api/jwt-keys/[id]` - Get key details
- `GET /api/jwt-keys/by-credential/[credentialId]` - Get keys by credential

---

## Example Use Case: Investment Agreement

**Scenario:** Three parties must approve a $1M investment.

1. **Alice (Creator)** drafts the investment terms as JSON
2. **Alice signs** (1/3) - Statement still pending
3. **Bob (Investor) signs** (2/3) - **Threshold reached! ✅ Statement valid**
4. **Carol (Investor) signs** (3/3) - Optional additional approval

The statement became valid at 2 signatures (the threshold).

---

## Security Model

### What Passkeys Provide

- **Hardware protection**: Private keys never leave secure hardware
- **Attestation**: Cryptographic proof that a JWT signing key is legitimate
- **User presence**: Confirms user was present during setup

### What JWT Signing Provides

- **Standard signatures**: Works with any JWT library
- **Fast signing**: No hardware prompts
- **Portability**: Keys can be backed up (if desired)

### Combined Security

1. **Passkey** proves your JWT signing key is trustworthy (one-time)
2. **JWT signing key** creates fast, standard signatures (many times)
3. **Threshold** ensures multiple parties must agree

---

## Development Notes

⚠️ **This is a proof-of-concept for demonstration purposes**

### Current Limitations

**JWT Private Key Storage**

- Private keys stored in browser `localStorage`
- Keys persist across refreshes but lost if browser data cleared
- **Vulnerable to XSS** - not production-ready

### Production Recommendations

1. **Server-side encrypted storage** (recommended)
   - Store encrypted keys server-side
   - Enable cross-device access
   - Implement key rotation

2. **Non-extractable Web Crypto keys**
   - Use `extractable: false`
   - Keys can't be stolen via XSS
   - Device-bound only

3. **Session-bound ephemeral keys**
   - Generate new key each session
   - Maximum security
   - Requires re-attestation each session

---

## Tech Stack

- **Next.js** 15.3.4 - React framework
- **jose** 5.9.6 - JWT operations
- **@simplewebauthn** - WebAuthn/Passkey implementation
- **better-sqlite3** - Local database
- **TypeScript** - Type safety

---

## Browser Support

Requires WebAuthn support:

- Chrome/Edge 67+
- Firefox 60+
- Safari 13+

---

## Documentation

- [`docs/FLOW.md`](docs/FLOW.md) - Detailed process flow
- [`docs/JWT-VERIFICATION-GUIDE.md`](docs/JWT-VERIFICATION-GUIDE.md) - How to verify signatures

---

## License

MIT - Educational proof-of-concept

**Note:** This demonstrates multi-signature workflows with passkey attestation. For production, implement proper key management, security audits, and infrastructure hardening.
