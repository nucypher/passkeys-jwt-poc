# JWT Verification Guide

## For External Applications

This guide shows how to verify JWTs created with the **detached signature architecture** in any application.

## What Makes These JWTs Different?

These JWTs use **detached passkey attestation**:

- JWT is signed with a standard EdDSA key
- The JWT signing key is attested by a passkey
- Passkey attestation is stored in database, not in JWT
- JWT has `kid` header pointing to the registered key

**Result:** Standard JWT structure + passkey security!

## Verification Methods

### Method 1: Use Our Verification Library (Recommended)

#### Installation

```bash
npm install jose @simplewebauthn/server
```

#### Copy the Verifier

Copy `src/lib/jwt-detached-verifier.ts` to your project.

#### Implement Database Lookup

```typescript
import { getJWTKey } from "./your-database";

// Your database should return:
// {
//   keyId: string,
//   credentialId: string,
//   publicKeyJWK: JWK,
//   publicKeyFingerprint: string,
//   passkeyAttestation: AuthenticationResponseJSON
// }
```

#### Verify

```typescript
import { verifyDetachedJWT } from "./jwt-detached-verifier";

const result = await verifyDetachedJWT(jwt);

if (result.valid) {
  console.log("✅ JWT verified!");
  console.log("Payload:", result.payload);
  console.log("Key ID:", result.keyId);
  console.log("Credential ID:", result.credentialId);
} else {
  console.error("❌ Verification failed:", result.error);
}
```

---

### Method 2: Use Our REST API (Any Language)

#### Endpoint

```
POST http://localhost:3000/api/validate
Content-Type: application/json

{
  "jwt": "eyJhbGci..."
}
```

#### Response

```json
{
  "valid": true,
  "jwtVerified": true,
  "keyAuthorized": true,
  "keyId": "abc123...",
  "credentialId": "credential-456...",
  "payload": {
    "message": "your data",
    "nonce": "unique"
  },
  "details": {
    "jwtVerification": "JWT signature verified with registered public key",
    "keyAuthorization": "Key attested by passkey abc12..."
  }
}
```

#### Example: Python

```python
import requests

def verify_jwt(jwt_token: str) -> dict:
    response = requests.post(
        "http://localhost:3000/api/validate",
        json={"jwt": jwt_token}
    )
    return response.json()

# Use it
result = verify_jwt("eyJhbGci...")
if result["valid"]:
    print("✅ JWT verified!")
    print("Payload:", result["payload"])
```

#### Example: Go

```go
package main

import (
    "bytes"
    "encoding/json"
    "net/http"
)

func verifyJWT(jwt string) (map[string]interface{}, error) {
    payload := map[string]string{"jwt": jwt}
    jsonData, _ := json.Marshal(payload)

    resp, err := http.Post(
        "http://localhost:3000/api/validate",
        "application/json",
        bytes.NewBuffer(jsonData),
    )
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)
    return result, nil
}
```

---

### Method 3: Standard JWT Verification Only

If you only need JWT signature verification (without checking passkey authorization):

```typescript
import { jwtVerify, importJWK, decodeProtectedHeader } from "jose";

// Extract kid from header
const header = decodeProtectedHeader(jwt);
const keyId = header.kid;

// Lookup public key in your database
const jwtKey = await yourDatabase.getJWTKey(keyId);

// Standard JWT verification
const publicKey = await importJWK(jwtKey.publicKeyJWK, "EdDSA");
const result = await jwtVerify(jwt, publicKey, {
  algorithms: ["EdDSA"],
});

console.log("✅ JWT signature verified!");
console.log("Payload:", result.payload);
```

**Note:** This verifies the JWT signature but doesn't check if the key is passkey-authorized.

---

## Inspect Mode

To just decode the JWT without verification:

```bash
curl -X POST http://localhost:3000/api/validate \
  -H "Content-Type: application/json" \
  -d '{"jwt": "eyJhbGci...", "mode": "inspect"}'
```

Response:

```json
{
  "mode": "inspection",
  "header": {
    "alg": "EdDSA",
    "typ": "JWT",
    "kid": "abc123..."
  },
  "payload": {
    "message": "your data",
    "nonce": "unique",
    "timestamp": 1234567890
  },
  "keyId": "abc123...",
  "algorithm": "EdDSA"
}
```

---

## Two-Stage Verification

The verification process has two stages:

### Stage 1: JWT Signature Verification

```typescript
// Standard JWT verification with jose.jwtVerify()
const result = await jwtVerify(jwt, publicKey);
// ✅ Verifies JWT signature is valid
```

**What this proves:**

- JWT payload hasn't been tampered with
- Signature was created by holder of private key

### Stage 2: Key Authorization Check

```typescript
// Check that key is passkey-authorized
if (!jwtKey.passkeyAttestation) {
  throw new Error("Key not authorized");
}
// ✅ Confirms key was attested by passkey
```

**What this proves:**

- JWT signing key is legitimate
- Key was attested by passkey in secure hardware
- User was present during key registration

---

## Database Schema

Your application needs to store JWT keys with their passkey attestations:

```sql
CREATE TABLE attested_jwt_keys (
  key_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key_jwk TEXT NOT NULL,
  public_key_pem TEXT NOT NULL,
  public_key_fingerprint TEXT NOT NULL,
  passkey_attestation TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (credential_id) REFERENCES passkey_credentials (credential_id),
  FOREIGN KEY (user_id) REFERENCES users (user_id)
);
```

---

## FAQ

### Q: Can I verify these JWTs with standard JWT libraries?

**A: YES!** That's the whole point of this architecture.

```javascript
// Stage 1 works with ANY JWT library
const result = await jose.jwtVerify(jwt, publicKey);
```

You just need to:

1. Extract `kid` from JWT header
2. Lookup public key in your database
3. Verify with standard `jose.jwtVerify()`

### Q: Do I need to verify the passkey attestation every time?

**A: No!** The passkey attestation was verified once during key registration. After that, you only need to:

1. Verify JWT signature (Stage 1)
2. Check that key exists in DB with passkey attestation (Stage 2)

### Q: What if I only want standard JWT verification?

**A: Use Method 3 above.** You can verify just the JWT signature without checking passkey authorization. This is faster but doesn't provide passkey security guarantees.

### Q: How do I revoke a JWT key?

**A: Delete from database:**

```sql
DELETE FROM attested_jwt_keys WHERE key_id = ?;
```

After deletion, any JWTs signed with that key will fail verification (key not found in DB).

### Q: Can I use a different algorithm?

**A: Yes!** The architecture supports any algorithm. Currently using EdDSA (Ed25519), but you can use ES256, RS256, etc. Just update the key generation and verification accordingly.

---

## Security Guarantees

### From JWT Signing

✅ Signature integrity - Payload cannot be modified  
✅ Standard algorithm - EdDSA is well-known  
✅ Fast verification - No WebAuthn overhead

### From Passkey Attestation

✅ Hardware-backed trust - Key attested by secure hardware  
✅ Origin verification - Verified during registration  
✅ User presence - User was present during registration  
✅ Non-repudiation - Only passkey holder could attest

### From Detached Storage

✅ Clean JWTs - No embedded attestation  
✅ Authorization tracking - Know which keys are authorized  
✅ Revocation - Can revoke keys independently

---

## Summary

This detached signature architecture provides:

✅ **Standard JWT verification** - Works with `jose.jwtVerify()`  
✅ **Passkey security** - Keys are attested by passkeys  
✅ **Clean JWTs** - No embedded attestation  
✅ **Fast verification** - No WebAuthn overhead  
✅ **Easy integration** - Use our library, API, or standard JWT libs

**The best of both worlds!** 🎉
