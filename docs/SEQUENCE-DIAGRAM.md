# Statement Approval Flow - Sequence Diagrams

This document contains four sequence diagrams showing the complete flow for statement creation, signing, and verification with passkey-attested JWT keys.

## Table of Contents

- [Statement Approval Flow - Sequence Diagrams](#statement-approval-flow---sequence-diagrams)
  - [Table of Contents](#table-of-contents)
  - [1. User Registration \& Key Setup](#1-user-registration--key-setup)
    - [Key Points](#key-points)
  - [2. Statement Creation](#2-statement-creation)
    - [Key Points](#key-points-1)
  - [3. Statement Signing / Approval](#3-statement-signing--approval)
    - [Key Points](#key-points-2)
  - [4. Statement Verification](#4-statement-verification)
    - [Key Points](#key-points-3)
  - [Summary](#summary)
    - [Flow Overview](#flow-overview)
    - [Security Model](#security-model)
    - [Key Benefits](#key-benefits)
    - [API Endpoints Reference](#api-endpoints-reference)

---

## 1. User Registration & Key Setup

This diagram shows the one-time setup process that any user (Creator or Investor) must complete before they can sign statements.

```mermaid
sequenceDiagram
    actor User
    participant Frontend as Frontend (Browser)
    participant Backend as Backend (API)

    Note over User,Backend: USER ACCOUNT SETUP

    User->>Frontend: Visit /creator or /investor
    User->>Frontend: Click "Get Started"
    Frontend->>User: Prompt for name
    User->>Frontend: Enter name (e.g., "Alice", "Bob")

    Note over Frontend,Backend: API Call 1: Get Registration Options
    Frontend->>Backend: POST /api/credentials<br/>{name, role: "creator" or "investor"}
    Backend->>Backend: Generate WebAuthn registration options
    Note over Backend: challenge, user.id, user.name, RP info
    Backend-->>Frontend: Registration options

    Frontend->>User: Browser prompts for biometric/PIN
    User->>Frontend: Approve with biometric/PIN
    Frontend->>Frontend: Create passkey credential
    Note over Frontend: Private key stored in secure hardware.<br/>Public key returned to app.
    Note over Frontend: credentialId = registrationResponse.id

    Note over Frontend: Generate JWT Key & Attestation (Client-Side)
    Frontend->>Frontend: Generate EdDSA keypair (Ed25519)
    Note over Frontend: keyId = random UUID<br/>publicKey, privateKey (extractable)<br/>publicKeyJWK, privateKeyJWK

    Frontend->>Frontend: Calculate fingerprint
    Note over Frontend: fingerprint = SHA-256(canonical JWK)<br/>canonical = {kty, crv, x}

    Frontend->>Frontend: Construct auth options locally
    Note over Frontend: authOptions = {<br/>  challenge: fingerprint,<br/>  rpId: hostname,<br/>  allowCredentials: [credentialId]<br/>}

    Frontend->>User: Browser prompts for biometric/PIN
    User->>Frontend: Approve with biometric/PIN
    Frontend->>Frontend: Passkey signs fingerprint
    Note over Frontend: passkeyAttestation = {id, response: {<br/>authenticatorData, clientDataJSON, signature}}

    Note over Frontend,Backend: API Call 2: Complete Registration
    Frontend->>Backend: POST /api/register/complete<br/>{registrationResponse, name, role,<br/>passkeyAttestation, jwtKeyData: {keyId,<br/>publicKeyJWK, privateKeyJWK, publicKeyFingerprint}}

    Backend->>Backend: Step 1: Verify passkey registration
    Note over Backend: Verify registrationResponse against<br/>pending registration options
    Backend->>Backend: INSERT INTO passkey_credentials<br/>{credential_id, public_key, counter, ...}

    Backend->>Backend: Step 2: Create user
    Backend->>Backend: INSERT INTO users<br/>{user_id, name, role, credential_id}

    Backend->>Backend: Step 3: Verify passkey attestation
    Note over Backend: 1. Lookup passkey credential<br/>2. Verify signature against challenge<br/>3. Confirm expectedOrigin & rpId

    Backend->>Backend: Step 4: Save JWT key
    Backend->>Backend: Convert JWK to PEM format
    Backend->>Backend: INSERT INTO attested_jwt_keys<br/>{key_id, user_id, credential_id,<br/>public_key_jwk, public_key_pem,<br/>fingerprint, passkey_attestation}

    Backend-->>Frontend: {success: true, user, keyId}

    Frontend->>Frontend: Store session in localStorage
    Note over Frontend: {userId, name, role, credentialId,<br/>keyId, privateKeyJWK}

    Note over User,Backend: Setup Complete!<br/>User can now sign statements instantly without passkey prompts
```

### Key Points

- **One-time process**: Users only do this setup once per device/browser
- **Two API calls**: Get options → Complete registration
- **Two biometric prompts**: One for passkey registration, one for JWT key attestation
- **Client-side auth options**: Authentication options for attestation are constructed locally
- **Result**: User has an attested JWT signing key stored locally
- **Security**: JWT key's legitimacy is cryptographically proven by passkey attestation

---

## 2. Statement Creation

This diagram shows how a Creator defines and submits a new statement for approval.

```mermaid
sequenceDiagram
    actor User
    participant Frontend as Frontend (Browser)
    participant Backend as Backend (API)

    Note over User,Backend: STATEMENT CREATION (Creator role only)

    User->>Frontend: Navigate to Creator Portal
    Frontend->>Frontend: Load session from localStorage
    Note over Frontend: {userId, name, role: "creator", ...}

    User->>Frontend: Define JSON statement
    Note over User: Example:<br/>{<br/>  investment: {<br/>    amount: 1000000,<br/>    currency: "USD"<br/>  },<br/>  terms: {<br/>    closingDate: "2026-11-20",<br/>    lockUpPeriod: "5 years"<br/>  }<br/>}

    User->>Frontend: Click "Create Statement"
    Frontend->>Frontend: Validate JSON format

    Frontend->>Backend: POST /api/statements/create<br/>{content: JSON.stringify(statement),<br/>creatorId: userId, title}

    Backend->>Backend: Generate statement ID
    Note over Backend: statementId = "stmt-" + UUID

    Backend->>Backend: INSERT INTO statements<br/>{statement_id, content, creator_id, created_at}
    Note over Backend: Initial status: pending (0 signatures)

    Backend-->>Frontend: {success: true, statement: {<br/>statementId, content, creatorId, createdAt}}

    Frontend-->>User: Statement created successfully!
    Frontend->>Frontend: Refresh statements list
```

### Key Points

- **Creator only**: Only users with role "creator" can create statements
- **JSON content**: Statement can contain any valid JSON structure
- **Initial state**: Statement starts with 0 signatures (pending)
- **No signing yet**: Creation and signing are separate actions

---

## 3. Statement Signing / Approval

This diagram shows how any user (Creator or Investor) signs a statement to approve it.

```mermaid
sequenceDiagram
    actor User as User (Signer)
    participant Frontend as Frontend (Browser)
    participant Backend as Backend (API)

    Note over User,Backend: STATEMENT SIGNING / APPROVAL

    User->>Frontend: View statements list
    Frontend->>Backend: GET /api/statements
    Backend->>Backend: SELECT statements with signatures
    Backend-->>Frontend: {statements: [{statementId, content,<br/>signatures: [...], signatureCount, status}]}

    Frontend-->>User: Display statements with signature status
    Note over Frontend: Shows: "1/3 signatures" or "2/3 signatures ✓"

    User->>Frontend: Click "Sign Statement"

    Frontend->>Backend: GET /api/statements/{statementId}
    Backend->>Backend: SELECT statement by ID
    Backend-->>Frontend: {statement: {statementId, content, ...}}

    Note over Frontend: JWT Signing (Client-side, NO passkey prompt!)
    Frontend->>Frontend: Load private key from localStorage
    Note over Frontend: privateKey = importJWK(privateKeyJWK, "EdDSA")

    Frontend->>Frontend: Create JWT payload
    Note over Frontend: payload = {<br/>  statementId,<br/>  content: statement.content,<br/>  signer: userId,<br/>  timestamp: Date.now()<br/>}

    Frontend->>Frontend: Sign JWT with EdDSA
    Note over Frontend: jwt = new SignJWT(payload)<br/>  .setProtectedHeader({<br/>    alg: "EdDSA",<br/>    typ: "JWT",<br/>    kid: keyId<br/>  })<br/>  .setIssuedAt()<br/>  .sign(privateKey)

    Note over Frontend: Result: "header.payload.signature"<br/>Instant signing, no user interaction!

    Frontend->>Backend: POST /api/statements/{statementId}/sign<br/>{jwt}

    Note over Backend: JWT Verification & Storage
    Backend->>Backend: Decode JWT header → extract kid
    Backend->>Backend: SELECT * FROM attested_jwt_keys<br/>WHERE key_id = kid
    Note over Backend: Get public_key_jwk, passkey_attestation,<br/>credential_id

    Backend->>Backend: Verify JWT signature (jose library)
    Note over Backend: jwtVerify(jwt, publicKey, {algorithms: ["EdDSA"]})

    Backend->>Backend: Check key has passkey attestation
    Note over Backend: Ensure passkey_attestation IS NOT NULL

    Backend->>Backend: Get user by credentialId
    Backend->>Backend: SELECT * FROM users<br/>WHERE credential_id = credentialId

    Backend->>Backend: Extract signature from JWT
    Note over Backend: signature = jwt.split('.')[2]

    Backend->>Backend: INSERT INTO statement_signatures<br/>{statement_id, user_id, signature, jwt, signed_at}

    Backend->>Backend: Count signatures for statement
    Note over Backend: SELECT COUNT(*) FROM statement_signatures<br/>WHERE statement_id = statementId

    Backend-->>Frontend: {success: true, signatureId,<br/>signatureCount, status}
    Note over Frontend: status = \"approved\" or \"pending\"

    Frontend-->>User: Signature recorded!
    Note over Frontend: Shows: "Your approval recorded (2/3)"<br/>or "Statement approved! (2/3 ✓)"

    Frontend->>Frontend: Refresh statements list
```

### Key Points

- **Any user**: Both Creators and Investors can sign statements
- **No passkey prompt**: JWT signing happens instantly using stored private key
- **Client-side signing**: JWT is created in the browser, not on the server
- **Backend verification**: Server verifies JWT signature and checks attestation
- **Threshold check**: Statement becomes valid when threshold (2/3) is reached
- **One signature per user**: Each user can only sign a statement once

---

## 4. Statement Verification

This diagram shows how anyone can verify a statement's signatures and validity.

```mermaid
sequenceDiagram
    actor Verifier as Verifier (Any User)
    participant Frontend as Frontend (Browser)
    participant Backend as Backend (API)

    Note over Verifier,Backend: STATEMENT VERIFICATION

    Verifier->>Frontend: View statement details
    Note over Verifier: Could be via UI or direct API call

    Frontend->>Backend: GET /api/statements/{statementId}

    Note over Backend: Comprehensive Verification Process
    Backend->>Backend: SELECT statement by ID
    Backend->>Backend: SELECT all signatures for statement
    Note over Backend: SELECT * FROM statement_signatures<br/>WHERE statement_id = statementId

    Backend->>Backend: For each signature, verify:

    Note over Backend: Step 1: Decode JWT
    Backend->>Backend: Decode JWT header → extract kid
    Backend->>Backend: Decode JWT payload → extract claims

    Note over Backend: Step 2: Lookup signing key
    Backend->>Backend: SELECT * FROM attested_jwt_keys<br/>WHERE key_id = kid
    Note over Backend: Get: public_key_jwk, public_key_pem,<br/>fingerprint, passkey_attestation, credential_id

    Backend->>Backend: Check key exists
    Note over Backend: If not found → signature invalid

    Note over Backend: Step 3: Verify JWT signature
    Backend->>Backend: Import public key from JWK
    Backend->>Backend: jwtVerify(jwt, publicKey, {<br/>  algorithms: ["EdDSA"]<br/>})
    Note over Backend: Cryptographically verify signature<br/>using EdDSA (Ed25519)

    Note over Backend: Step 4: Verify key authorization
    Backend->>Backend: Check passkey_attestation IS NOT NULL
    Note over Backend: Ensures key was attested by passkey,<br/>not just any random key

    Note over Backend: Step 5: Verify payload integrity
    Backend->>Backend: Check statementId matches
    Backend->>Backend: Check content matches
    Backend->>Backend: Check signer exists

    Note over Backend: Step 6: Get signer details
    Backend->>Backend: SELECT * FROM users<br/>WHERE credential_id = :credentialId
    Note over Backend: Get: user_id, name, role

    Backend->>Backend: Build signature verification result
    Note over Backend: {<br/>  valid: true/false,<br/>  userId, userName, userRole,<br/>  signedAt, jwt<br/>}

    Backend->>Backend: Count valid signatures
    Backend->>Backend: Check threshold (e.g., >= 2)
    Note over Backend: status = validSignatureCount >= 2 ? "approved" : "pending"

    Backend-->>Frontend: {<br/>  statement: {statementId, content, ...},<br/>  signatures: [{<br/>    valid: true, userId, userName,<br/>    userRole, signedAt, jwt<br/>  }],<br/>  signatureCount: 2,<br/>  status: "approved"<br/>}

    Frontend->>Frontend: Display verification results
    Note over Frontend: Show:<br/>✓ All signatures valid<br/>✓ Keys authorized (attested)<br/>✓ Threshold met (2/3)<br/>✓ Statement APPROVED

    Frontend-->>Verifier: Statement is valid and approved
```

### Key Points

- **Anyone can verify**: Verification is public and doesn't require authentication
- **Multi-step verification**: Each signature goes through 6 verification steps
- **Cryptographic proof**: JWT signatures are verified using EdDSA algorithm
- **Attestation check**: System ensures signing keys were attested by passkeys
- **Threshold validation**: Statement is only valid if threshold (2/3) is met
- **Standard JWT**: Uses standard JWT verification (jose library)

---

## Summary

### Flow Overview

1. **Setup** (one-time): User registers passkey → Creates account → Generates JWT key → Attests with passkey
2. **Create** (Creator): Draft JSON statement → Submit to backend → Store in database
3. **Sign** (Any user): View statement → Sign JWT locally (instant) → Submit to backend → Verify & store
4. **Verify** (Anyone): Fetch statement → Backend validates all signatures → Check threshold → Return result

### Security Model

| Layer         | Purpose                   | Technology                 |
| ------------- | ------------------------- | -------------------------- |
| **Passkey**   | Proves JWT key legitimacy | WebAuthn, Hardware-backed  |
| **JWT**       | Fast, standard signatures | EdDSA (Ed25519)            |
| **Threshold** | Multi-party approval      | 2-of-3 signatures required |

### Key Benefits

- **Security**: Hardware-backed passkey attestation proves key legitimacy
- **Efficiency**: No biometric prompts for every signature (only during setup)
- **Standard**: Uses standard JWT format, verifiable with any JWT library
- **Collaborative**: Multiple parties must approve (threshold-based)

### API Endpoints Reference

| Endpoint                    | Method | Purpose                                         |
| --------------------------- | ------ | ----------------------------------------------- |
| `/api/credentials`          | POST   | Generate passkey registration options           |
| `/api/register/complete`    | POST   | Verify passkey + create user + register JWT key |
| `/api/authenticate/options` | POST   | Generate passkey authentication challenge       |
| `/api/statements/create`    | POST   | Create new statement                            |
| `/api/statements`           | GET    | List all statements                             |
| `/api/statements/{id}`      | GET    | Get statement details with signatures           |
| `/api/statements/{id}/sign` | POST   | Sign statement with JWT                         |
