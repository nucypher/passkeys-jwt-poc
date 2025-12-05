# Statement Approval Flow

> How users approve JSON statements using JWT signatures in a multi-signature threshold system

## Overview

This document explains how the system works from a technical perspective. The core flow is:

1. **Setup** (once) - User's passkey attests their JWT signing key
2. **Sign** (many) - Users sign statements to approve them
3. **Validate** - Statement becomes valid when threshold is reached

---

## Part 1: One-Time Setup

Before a user can approve statements, they must complete a one-time setup.

### Step 1: Generate JWT Signing Key

**Code:**

```typescript
const signingKey = await generateJWTKeyPair();
```

**Result:**

```javascript
{
  keyId: "unique-key-id",
  publicKey: CryptoKey,      // For verification
  privateKey: CryptoKey,     // For signing (kept secret)
  publicKeyJWK: {...},       // Public key in JWK format
  publicKeyFingerprint: "sha256-hash"
}
```

**Technical Details:**

- Algorithm: EdDSA (Ed25519 curve)
- Generated using Web Crypto API
- Fingerprint = SHA-256 hash of canonical JWK
- This key will sign statements (NOT the passkey)

### Step 2: Passkey Attests the Signing Key

**Code:**

```typescript
const attestation = await startAuthentication({
  challenge: signingKey.publicKeyFingerprint,
});
```

**What Happens:**

1. Browser prompts user for biometric/PIN (passkey authentication)
2. Passkey cryptographically signs the signing key's fingerprint
3. Returns WebAuthn authentication response containing the signature

**Why This Matters:**

- Creates cryptographic proof that this signing key belongs to this passkey owner
- Passkey's private key (in secure hardware) signs the signing key's public key
- This proof can be verified later

### Step 3: Store in Database

**Code:**

```typescript
await saveJWTKey({
  keyId,
  userId,
  credentialId, // Passkey identifier
  publicKeyJWK,
  publicKeyFingerprint,
  passkeyAttestation, // The proof from Step 2
});
```

**Database State:**

```
| Table                 | What's Stored                               |
| --------------------- | ------------------------------------------- |
| `users`               | User identity, linked to passkey credential |
| `passkey_credentials` | Passkey public key and metadata             |
| `attested_jwt_keys`   | JWT signing key + passkey attestation proof |
```

**Key Relationship:**

```
User → Passkey → Attests → JWT Signing Key
```

**Setup Complete!** The user can now sign statements instantly without passkey prompts.

---

## Part 2: Statement Signing (Approval)

When a user wants to approve a statement, they sign it with their JWT signing key.

### Step 1: Creator Creates Statement

**Code:**

```typescript
const statement = {
  investment: {
    amount: 1000000,
    currency: "USD",
  },
  terms: {
    closingDate: "2026-11-20",
    lockUpPeriod: "5 years",
  },
};

await createStatement(
  JSON.stringify(statement),
  creatorUserId,
  "Expression of Interest 1234", // Title parameter
);
```

**Database:**

```sql
INSERT INTO statements (statement_id, title, content, creator_id, created_at)
VALUES ('stmt-abc', 'Expression of Interest 1234', '{...}', 'user-123', 1732147200);
```

### Step 2: User Signs Statement

**Code:**

```typescript
const jwt = await new SignJWT({
  statementId: "stmt-abc",
  content: JSON.stringify(statement),
  signer: userId,
  timestamp: Date.now(),
})
  .setProtectedHeader({
    alg: "EdDSA",
    typ: "JWT",
    kid: signingKeyId, // Links to attested key
  })
  .sign(signingPrivateKey); // Fast, no passkey needed!
```

**JWT Structure:**

```
eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCIsImtpZCI6ImtleS0xMjMifQ.
eyJzdGF0ZW1lbnRJZCI6InN0bXQtYWJjIiwi...fQ.
<EdDSA-signature-bytes>

Decoded Header:
{
  "alg": "EdDSA",
  "typ": "JWT",
  "kid": "key-123"   // Reference to attested signing key
}

Decoded Payload:
{
  "statementId": "stmt-abc",
  "content":{...statement...},
  "signer": "user-123",
  "timestamp": 1732147200000
}
```

**Save Signature:**

```typescript
await saveStatementSignature(statementId, userId, jwt);
```

**Database:**

```sql
INSERT INTO statement_signatures (statement_id, user_id, jwt, signed_at)
VALUES ('stmt-abc', 'user-123', 'eyJ...', 1732147250);
```

### Step 3: Check Threshold

**Code:**

```typescript
const signatures = await getStatementSignatures(statementId);
const status = signatures.length >= THRESHOLD ? "approved" : "pending";
```

**Status States:**

```
| Signatures | Status         | Example                                    |
| ---------- | -------------- | ------------------------------------------ |
| 1          | Pending        | No approvals yet or needs more signatures  |
| 2          | **Approved** ✓ | Threshold reached! or extra redundancy     |
```

---

## Part 3: Signature Verification

Anyone can verify a statement signature using standard JWT libraries.

### Step 1: Extract Key Reference

**Code:**

```typescript
const header = decodeProtectedHeader(jwt);
const signingKeyId = header.kid; // "key-123"
```

### Step 2: Lookup Signing Key

**Code:**

```typescript
const keyData = await getJWTKey(signingKeyId);
```

**Database Query:**

```sql
SELECT
  public_key_jwk,
  passkey_attestation,
  credential_id
FROM attested_jwt_keys
WHERE key_id = 'key-123';
```

**Returns:**

```javascript
{
  publicKeyJWK: { kty: "OKP", crv: "Ed25519", x: "..." },
  passkeyAttestation: {...},  // Proof key is legitimate
  credentialId: "passkey-xyz"
}
```

### Step 3: Verify JWT Signature

**Code:**

```typescript
const publicKey = await importJWK(keyData.publicKeyJWK, "EdDSA");
const result = await jwtVerify(jwt, publicKey, {
  algorithms: ["EdDSA"],
});
```

**This is Standard JWT Verification!**

- Uses `jose` library or any JWT library
- Verifies signature cryptographically
- Returns decoded payload if valid

### Step 4: Verify Key Authorization

**Code:**

```typescript
if (!keyData.passkeyAttestation) {
  throw new Error("Signing key not attested by passkey");
}
```

**What This Checks:**

- The signing key has passkey attestation in the database
- Proves the key is legitimate (not just any random key)

**Complete Verification Result:**

```javascript
{
  valid: true,
  jwtVerified: true,          // ✅ Signature is cryptographically valid
  keyAuthorized: true,         // ✅ Key was attested by passkey
  payload: { statementId, ... }
}
```

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│ ONE-TIME SETUP                                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1. Generate JWT signing key (EdDSA)                │
│  2. Passkey attests signing key                     │
│  3. Store: signing key + attestation proof          │
│                                                     │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ STATEMENT CREATION                                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Creator defines JSON statement                     │
│  Stores in database                                 │
│  State: Pending (0 signatures)                      │
│                                                     │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ SIGNING / APPROVAL (Repeated)                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  User 1 signs → JWT created → Saved                 │
│  State: Pending (1/3 signatures)                    │
│                                                     │
│  User 2 signs → JWT created → Saved                 │
│  Status: Approved ✓ (2/3 - threshold reached!)      │
│                                                     │
│  User 3 signs → JWT created → Saved                 │
│  Status: Approved ✓ (3/3 - extra redundancy)       │
│                                                     │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ VERIFICATION (Anytime)                              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1. Extract kid from JWT header                     │
│  2. Lookup signing key in database                  │
│  3. Verify JWT signature (standard verification)    │
│  4. Check key has passkey attestation               │
│                                                     │
│  Result: Signature valid + key authorized ✅        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Key Principles

### Two Types of Keys

```
| Key                 | Purpose             | Frequency      | User Interaction     |
| ------------------- | ------------------- | -------------- | -------------------- |
| **Passkey**         | Attests signing key | Once           | Biometric/PIN prompt |
| **JWT Signing Key** | Signs statements    | Every approval | None (automated)     |
```

### Why This Design?

**Problem:** Passkeys are secure but prompt users every time  
**Solution:** Use passkey once to attest a signing key, then use that key for fast signing

**Benefits:**

- ✅ Security: Hardware-backed attestation proves key legitimacy
- ✅ Efficiency: No biometric prompts for every approval
- ✅ Standard: JWTs work with any library

### Security Model

1. **Passkey Layer** - Hardware-backed, proves legitimacy
2. **JWT Layer** - Standard signatures, fast verification
3. **Threshold Layer** - Multiple approvals required

---

## Technical Notes

### Signature Integrity

Each JWT signature is **tamper-proof**:

- Changing payload invalidates signature
- Only holder of private signing key can create valid signatures
- Standard EdDSA cryptography

### Attestation Proof

Passkey attestation is **cryptographic proof**:

- Passkey signs the signing key's fingerprint
- Stored in database as verification evidence
- Can't be forged without access to passkey's private key (in secure hardware)

### Threshold Validation

Statement validity is **collaborative**:

- Single signature insufficient
- Threshold (e.g., 2-of-3) enforces multi-party approval
- Each signature independently verifiable

---

## Summary

1. **Setup**: Passkey attests JWT signing key → Store proof in DB
2. **Sign**: Use JWT signing key to sign statements → Fast, no passkey prompts
3. **Validate**: Check threshold reached → Statement approved
4. **Verify**: Standard JWT verification + check key attestation → Trustworthy

**Result:** Secure multi-signature approvals with excellent UX.
