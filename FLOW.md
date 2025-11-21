# Detached Signature Flow

## Registration Flow (One-Time)

### Step 1: Generate JWT Signing Key

```typescript
const jwtKey = await generateJWTKeyPair();
// Creates: { publicKey, privateKey, publicKeyJWK, publicKeyFingerprint, keyId }
```

**What happens:**

- Ed25519 key pair generated using Web Crypto API
- Public key exported as JWK (JSON Web Key)
- Fingerprint = SHA-256(canonical JWK)
- Unique key ID generated

### Step 2: Passkey Attests JWT Public Key

```typescript
const passkeyAttestation = await startAuthentication({
  challenge: jwtKey.publicKeyFingerprint,
});
```

**What happens:**

- Challenge = JWT public key fingerprint
- User authenticates with passkey (biometric, PIN, etc.)
- Passkey (in secure hardware) signs the fingerprint
- Returns WebAuthn authentication response

### Step 3: Save to Database

```typescript
await saveJWTKey(
  keyId,
  credentialId,
  publicKeyJWK,
  publicKeyFingerprint,
  passkeyAttestation
);
```

**What happens:**

- JWT public key stored in DB
- Passkey attestation stored in DB (detached!)
- 1:1 relationship: credential_id ← → key_id

**Database:**

```sql
jwt_keys:
  - key_id: "abc123..."
  - credential_id: "passkey-credential-id"
  - public_key_jwk: { kty: "OKP", crv: "Ed25519", x: "..." }
  - public_key_fingerprint: "sha256-hash..."
  - passkey_attestation: { id: "...", response: {...} }
```

---

## Signing Flow (Many Times)

### Step 1: Create JWT Payload

```typescript
const payload = {
  message: "your data",
  nonce: "unique-value",
  timestamp: Date.now(),
};
```

**What happens:**

- Create your JWT payload
- No special fields needed
- Clean, standard JWT payload

### Step 2: Sign with JWT Private Key

```typescript
const jwt = await new SignJWT(payload)
  .setProtectedHeader({
    alg: "EdDSA",
    typ: "JWT",
    kid: keyId, // Key ID for lookup
  })
  .sign(privateKey);
```

**What happens:**

- Sign with JWT private key (NOT passkey!)
- No user interaction needed
- Fast, standard JWT signing
- `kid` header points to registered key

**Result:**

```
eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCIsImtpZCI6ImFiYzEyMyJ9.
eyJtZXNzYWdlIjoieW91ciBkYXRhIiwibm9uY2UiOiJ1bmlxdWUifQ.
<EdDSA-signature>

Header:  { "alg": "EdDSA", "typ": "JWT", "kid": "abc123" }
Payload: { "message": "your data", "nonce": "unique" }
Signature: <Standard EdDSA signature>
```

### Step 3: Save (Optional)

```typescript
await saveSignature(keyId, JSON.stringify(payload), signature, jwt);
```

**What happens:**

- JWT saved to database for record-keeping
- Links to key_id (not credential_id)

---

## Verification Flow

### Step 1: Extract Key ID

```typescript
const header = decodeProtectedHeader(jwt);
const keyId = header.kid;
```

**What happens:**

- Parse JWT header
- Extract `kid` (key ID)

### Step 2: Lookup JWT Public Key

```typescript
const jwtKey = await getJWTKey(keyId);
```

**What happens:**

- Lookup JWT key in database by key ID
- Retrieve public key JWK
- Get passkey attestation

**Database query:**

```sql
SELECT public_key_jwk, passkey_attestation, credential_id
FROM jwt_keys
WHERE key_id = ?
```

### Step 3: Verify JWT Signature

```typescript
const publicKey = await importJWK(jwtKey.publicKeyJWK, "EdDSA");
const result = await jwtVerify(jwt, publicKey, {
  algorithms: ["EdDSA"],
});
```

**What happens:**

- Import public key from JWK
- **Standard JWT verification with `jose.jwtVerify()`**
- Verifies signature is valid
- Returns decoded payload

### Step 4: Check Authorization

```typescript
if (!jwtKey.passkeyAttestation) {
  throw new Error("Key not authorized");
}
```

**What happens:**

- Confirm JWT key has passkey attestation
- Ensures key is authorized (passkey-attested)

**Result:**

```json
{
  "valid": true,
  "jwtVerified": true,
  "keyAuthorized": true,
  "payload": { "message": "your data" }
}
```

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ REGISTRATION (Once)                                          │
├─────────────────────────────────────────────────────────────┤
│ 1. Generate JWT key pair                                     │
│ 2. Passkey signs JWT public key fingerprint                 │
│ 3. Save to DB: JWT key + passkey attestation                │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ SIGNING (Many Times, NO Passkey!)                           │
├─────────────────────────────────────────────────────────────┤
│ 1. Create JWT payload                                        │
│ 2. Sign with JWT private key (jose.SignJWT)                 │
│ 3. JWT has kid header pointing to registered key            │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ VERIFICATION                                                  │
├─────────────────────────────────────────────────────────────┤
│ 1. Extract kid from JWT header                               │
│ 2. Lookup JWT public key in DB                               │
│ 3. Verify JWT signature (jose.jwtVerify)                    │
│ 4. Check key is authorized (has passkey attestation)         │
└─────────────────────────────────────────────────────────────┘
```

## Key Benefits

✅ **Register once, sign many** - No passkey prompt after registration  
✅ **Fast signing** - No WebAuthn overhead  
✅ **Clean JWTs** - No embedded attestation  
✅ **Standard verification** - `jose.jwtVerify()` works  
✅ **Passkey-secured** - Keys are attested by passkeys  
✅ **Detached attestation** - Stored separately in DB

## Security Properties

### From JWT Signing

- Signature integrity (payload cannot be modified)
- Standard algorithm (EdDSA)
- Fast verification

### From Passkey Attestation

- Hardware-backed trust (JWT key attested at registration)
- Origin verification (checked during registration)
- User presence (user was present during key registration)
- Non-repudiation (only passkey holder could attest)

### From DB Storage

- Authorization tracking (know which keys are authorized)
- Revocation (can revoke JWT keys)
- Audit trail (track all JWTs by key)
