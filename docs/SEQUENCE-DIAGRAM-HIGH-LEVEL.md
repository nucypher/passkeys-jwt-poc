# High-Level Statement Approval Flow

This diagram illustrates the business logic and high-level interactions for the statement approval process, abstracting away the cryptographic details.

```mermaid
sequenceDiagram
    actor Creator
    actor Investor
    participant Client as Client Application
    participant Backend as System Backend

    %% 1. SETUP PHASE
    Note over Creator,Backend: 1. ONE-TIME SETUP
    Creator->>Client: Register & Setup
    Client->>Client: Generate Signing Key
    Client->>Client: Attest Key with Passkey
    Client->>Backend: Register Attested Key
    Backend-->>Client: Setup Complete

    rect rgba(128, 128, 128, 0.2)
    Note right of Investor: Same setup flow as Creator
    Investor->>Client: Register & Setup
    Client->>Client: Generate Signing Key
    Client->>Client: Attest Key with Passkey
    Client->>Backend: Register Attested Key
    Backend-->>Client: Setup Complete
    end

    %% 2. CREATION PHASE
    Note over Creator,Backend: 2. STATEMENT CREATION
    Creator->>Client: Create Statement
    Client->>Backend: Publish Statement (JSON)
    Backend->>Backend: Store Statement
    Backend-->>Client: Statement Created (Status: Pending)

    %% 3. APPROVAL PHASE
    Note over Creator,Backend: 3. APPROVAL PROCESS

    %% Creator Approval
    opt Optional: Creator may also need to approve
    Creator->>Client: Approve Statement
    Client->>Client: Sign Statement (Instant)
    Client->>Backend: Submit Approval (JWT)
    Backend->>Backend: Verify Signature & Store
    Backend-->>Client: Approval Recorded (Progress: 1/2)
    end

    %% Investor Approval
    rect rgba(128, 128, 128, 0.2)
    Note right of Investor: Same approval flow as Creator
    Investor->>Client: Review Statement
    Client->>Backend: Fetch Statement Details
    Backend-->>Client: Return Statement & Current Approvals

    Investor->>Client: Approve Statement
    Client->>Client: Sign Statement (Instant)
    Client->>Backend: Submit Approval (JWT)
    Backend->>Backend: Verify Signature
    Backend->>Backend: Check Threshold (2/2 Reached)
    end

    %% 4. COMPLETION
    Note over Backend: If Threshold Met ✅
    Backend-->>Client: Statement Fully Approved
    Client-->>Creator: Notification: Approved
    Client-->>Investor: Notification: Approved
```

## Key Concepts

1.  **One-Time Setup**: Users (Creators and Investors) set up their account once. This links a fast signing key to their secure passkey.
2.  **Statement Creation**: A Creator defines the statement (e.g., investment terms).
3.  **Instant Approval**: Users can approve statements instantly. The "Signing" happens automatically in the background using the setup from step 1.
4.  **Threshold Logic**: The system waits until enough approvals (e.g., 2 out of 2) are collected before marking the statement as valid.
