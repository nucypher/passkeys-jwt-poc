# High-Level Statement Approval Flow

This diagram illustrates the business logic and high-level interactions for the statement approval process, abstracting away the cryptographic details.

```mermaid
sequenceDiagram
    actor User as User<br/>(Creator or Investor)
    participant Client as Client Application
    participant Backend as System Backend

    %% 1. SETUP PHASE
    Note over User,Backend: 1. USER ACCOUNT SETUP
    User->>Client: Register & Setup
    Client->>Backend: Get Registration Options
    Backend-->>Client: Registration options
    Client->>Client: Create Passkey<br/>(prompt for biometric/PIN)
    Client->>Client: Generate JWT Signing Key
    Client->>Client: Attest Key with Passkey<br/>(prompt for biometric/PIN)
    Client->>Backend: Complete Registration
    Backend->>Backend: Verify passkey + create user + register key
    Backend-->>Client: Setup Complete
    Client-->>User: Account Setup Complete ✅

    %% 2. CREATION PHASE (Creator only)
    rect rgba(100, 150, 255, 0.1)
    Note over User,Backend: 2. STATEMENT CREATION<br/>(Creator role only)
    User->>Client: Create Statement
    Client->>Backend: Publish Statement (JSON)
    Backend->>Backend: Store Statement
    Backend-->>Client: Statement ID
    Client-->>User: Statement Created<br/>(Pending Approval)
    end

    %% 3. APPROVAL PHASE
    Note over User,Backend: 3. APPROVAL PROCESS
    User->>Client: View Statement
    Client->>Backend: GET Statement Details
    Backend-->>Client: Statement + Current Approvals
    Client-->>User: Display Statement

    User->>Client: Approve Statement
    Client->>Client: Sign Statement (Instant, no prompt)
    Client->>Backend: Submit Approval (JWT)
    Backend->>Backend: Verify Signature & Store
    Backend-->>Client: Approval Recorded
    Client-->>User: Signature Submitted ✅

    %% 4. STATUS CHECK
    Note over User,Backend: 4. VERIFY APPROVAL STATUS
    User->>Client: Query Statement
    Client->>Backend: GET Statement Details
    Backend->>Backend: Count Signatures & Check Threshold
    alt Threshold Met (e.g. ≥2 signatures)
        Backend-->>Client: Status: Approved ✅
    else Threshold Not Met
        Backend-->>Client: Status: Pending (e.g. 1/2)
    end
    Client-->>User: Display Statement<br/>(and its Status)
```

## Key Concepts

1.  **One-Time Setup (2 API Calls)**: Users set up their account with just 2 API calls:
    - `POST /api/credentials` - Get passkey registration options
    - `POST /api/register/complete` - Verify passkey + create user + register JWT key
2.  **Statement Creation**: Only Creators can create statements.
3.  **Instant Approval**: Any user can approve statements instantly—no biometric prompt needed after setup.
4.  **Threshold Logic**: Status is calculated on query by counting signatures.
