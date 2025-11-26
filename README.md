# Multi-Signature Statement System

> Passkey-attested JWT signing for collaborative statement approval

## What This Does

A user-friendly system for creating and signing JSON statements with passkey-backed security:

1. **Creator** - Creates JSON statements that need signatures
2. **Investors** - Review and sign statements with their passkeys
3. **2-of-3 Requirement** - Statements are valid when signed by 2 or more users
4. **Passkey Security** - Each signature is backed by hardware-secured passkeys

**Result:** User-friendly interface with enterprise-grade security through passkey-attested JWT signatures.

## Quick Start

```bash
npm install
npm run dev     # Start on :3000
```

Visit `http://localhost:3000` and choose your role:

- **Creator** - Create and manage statements
- **Investor** - Review and sign statements

## Features

### User-Friendly Interface

- Simple role-based navigation
- User names instead of technical IDs
- Green checkmarks for signatures
- Collapsible JSON content
- Technical details available separately

### Security

- Passkey-backed authentication
- JWT signatures with EdDSA (Ed25519)
- 2-of-3 multi-signature requirement
- Hardware-backed key attestation
- Each user has a unique signing key

### Technical Details

- Public keys stored in both JWK and PEM formats
- Detached signature architecture
- Standard JWT structure with `kid` header
- Complete audit trail

## System Architecture

### User Roles

1. **Creator** (1 user)

   - Creates JSON statements
   - Can sign own statements
   - Views all statement status

2. **Investors** (2+ users)
   - Review statements
   - Add signatures
   - View signature status

### Signature Flow

```
1. Creator creates a statement (JSON content)
2. Users sign with their passkey-backed JWT keys
3. Statement becomes valid after 2 signatures
4. All signatures are independently verifiable
```

### One-Time Setup (Per User)

1. Choose role (Creator or Investor)
2. Enter name (e.g., "Alice", "Jeff", "Michael")
3. Register passkey with browser
4. System generates JWT signing key
5. Passkey attests the JWT key

After setup, signing is instant - no passkey prompt needed!

## Pages

- `/` - Home page with role selection
- `/creator` - Creator portal (create & sign statements)
- `/investor` - Investor portal (review & sign statements)
- `/technical` - Technical details (users & keys)
- `/technical/statements` - All statements with technical details
- `/technical/statement/[id]` - Individual statement technical view

## Database Schema

-- Users (Creator + Investors)
users (
  user_id, name, role, credential_id, created_at
)

-- Statements created by Creator
statements (
  statement_id, content, creator_id, created_at
)

-- Signatures on statements
statement_signatures (
  id, statement_id, user_id, signature, jwt, signed_at
)

-- JWT keys attested by passkeys
attested_jwt_keys (
  key_id, user_id, credential_id,
  public_key_jwk, public_key_pem,
  public_key_fingerprint, passkey_attestation,
  created_at
)

-- Passkey credentials
passkey_credentials (
  credential_id, public_key_cose_format,
  algorithm, counter, transports, created_at
)
```

## API Routes

### User Management

- `POST /api/users/register` - Register user with name and role
- `GET /api/users/[credentialId]` - Get user info

### Statement Management

- `POST /api/statements/create` - Create new statement
- `GET /api/statements` - List all statements with signatures
- `GET /api/statements/[id]` - Get specific statement
- `POST /api/statements/[id]/sign` - Sign a statement

### JWT Key Management

- `POST /api/jwt-keys/register` - Register JWT key with passkey attestation
- `GET /api/jwt-keys/[id]` - Get JWT key details

## Example Statement

```json
{
  "investment": {
    "amount": 1000000,
    "currency": "USD",
    "date": "2025-11-20"
  },
  "terms": {
    "duration": "5 years",
    "interestRate": "8%"
  },
  "parties": {
    "creator": "Company ABC",
    "investors": ["Investor 1", "Investor 2"]
  }
}
```

## Key Benefits

✅ **User-Friendly** - Names instead of IDs, simple interface  
✅ **Secure** - Passkey-backed hardware security  
✅ **Efficient** - Sign instantly after one-time setup  
✅ **Transparent** - Full technical details available  
✅ **Multi-Signature** - 2-of-3 requirement enforced  
✅ **Standard JWTs** - Verifiable with any JWT library

## Technical Details

### JWT Structure

```json
{
  "header": {
    "alg": "EdDSA",
    "typ": "JWT",
    "kid": "key-id-123..."
  },
  "payload": {
    "statementId": "stmt-abc...",
    "content": "{...statement JSON...}",
    "signer": "user-xyz...",
    "timestamp": 1732147200000
  },
  "signature": "base64url-encoded-signature"
}
```

### Security Properties

**From JWT Signing:**

- Signature integrity (payload cannot be modified)
- Standard EdDSA algorithm
- Fast verification

**From Passkey Attestation:**

- Hardware-backed trust
- Origin verification
- User presence required
- Non-repudiation

**From Multi-Signature:**

- 2-of-3 requirement
- Independent verification
- Audit trail

## Documentation

- `plans/multi-user-statement-signing.md` - Implementation plan
- `docs/FLOW.md` - Detailed signing flow
- `docs/JWT-VERIFICATION-GUIDE.md` - Verification guide

## Tech Stack

- **Next.js** 15.3.4 - React framework
- **jose** 5.9.6 - JWT operations
- **@simplewebauthn/server** & **browser** - WebAuthn/Passkeys
- **better-sqlite3** - Local database
- **TypeScript** - Type safety

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests (if available)
npm test

# Build for production
npm run build
```

## Usage Scenarios

### Scenario 1: Investment Agreement

1. Creator creates statement with investment terms
2. Creator signs the statement (1/3)
3. Investor 1 reviews and signs (2/3) ✅ **Valid!**
4. Investor 2 can optionally sign (3/3)

### Scenario 2: Multi-Party Contract

1. Creator drafts contract as JSON statement
2. All parties independently review
3. Each party signs with their passkey
4. Contract valid after 2 signatures
5. Third signature adds redundancy

## Security Notes

- Private keys stored in browser session (localStorage)
- In production, use secure key storage (e.g., IndexedDB with encryption)
- Each user has unique passkey and JWT key
- Passkeys never leave secure hardware
- Signatures cannot be forged

## Browser Support

Requires browsers with WebAuthn support:

- Chrome/Edge 67+
- Firefox 60+
- Safari 13+

## License

MIT - Educational proof-of-concept

---

**Note:** This is a proof-of-concept demonstrating passkey-based multi-signature workflows. For production use, implement additional security measures, key rotation, and proper key management.
