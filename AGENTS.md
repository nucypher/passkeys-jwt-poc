# Passkey JWT Signing PoC

## Purpose

Proof-of-concept demonstrating WebAuthn passkey-based JWT signing.

> **Note**: This PoC is continuously evolving. It will be expanded, rewritten, and adapted to serve different tasks. Scope changes and architectural shifts are expected as new requirements emerge. When modifiying do not hesitate to rewrite any piece of code. Do not care about backward compatibility. All code is in draft mode and disposable.

## Task

> **Note**: This is the current task. Modify or rewrite it if new requierments come up:

Utilize passkey authentication for JWT signing where:

- Users register/login with passkeys (no passwords)
- Authenticated users sign JWTs using their passkey
- JWTs are stored and verifiable
- Each passkey credential = one participant

## Architecture

```
Passkey Registration → SQLite Storage
       ↓
Passkey Authentication → localStorage Session
       ↓
JWT Signing (WebAuthn signature) → SQLite Storage
       ↓
JWT Verification & Display
```

## Core Components

### Database (SQLite - `./passkeys.db`)

- **credentials** - Stores passkey public keys and metadata
- **signatures** - Stores signed JWTs with payloads and signatures
- **registration_options** - Temporary storage for WebAuthn challenges

### API Routes

- `POST /api/authenticate` - Verify passkey and create session
- `GET /api/authenticate/options` - Generate WebAuthn challenge
- `POST /api/sign` - Sign and store JWT
- `GET /api/signatures` - Retrieve signed JWTs
- `POST /api/validate` - Verify JWT signature
- `GET /api/credentials/[id]` - Get credential details

### Session Management

- **Client-side**: localStorage stores session data (credential ID, session ID)
- **No server-side sessions**: Stateless authentication
- **Lifetime**: Until logout or localStorage clear

### Registration Flow

- Generate timestamp-based user ID (e.g., `user-1234567890`)
- WebAuthn creates passkey with public/private key pair
- Store credential metadata in SQLite

### Authentication Flow

- Any registered passkey can authenticate
- WebAuthn challenge-response verification
- Session created and stored in localStorage
- Session persists across page refreshes

## Documentation

### Project Docs

- `README.md` - Main documentation, features, API endpoints
- `docs/FLOW.md` - Detailed flow diagrams and sequences
- `docs/JWT-VERIFICATION-GUIDE.md` - How to verify JWT signatures
- `docs/TECHNICAL-GUIDE.md` - Implementation details and algorithms

> **Note**: the content of this filder need to be continuously updated and consolidated.

### Agent Docs

- Execution-specific files (e.g., generated reports, temporary artifacts, plan copies) should be stored under `agents/`. Files that are not part of the final project documentation belong there.
- For each plan, keep a copy in `agents/plans` using the naming convention `SEQUENTIAL_ID-TITLE.md` (e.g., `agents/plans/1-multi-user-statement-signing.md`).

## Key Guidelines

### For LLM Agents Working on This Project

1. **No backward compatibility** - This is a PoC, feel free to break things
2. **Documentation location**:
   - Persistent docs → `docs/`
   - Agent-specific → `agents/`
3. **Testing**: Run Jest tests after changes (`npm test`)
4. **Database**: `passkeys.db` When needed feel free to delete in order to reset. The file will be auto-recreated.

### Technology Stack

- **Frontend**: React + Next.js
- **Authentication**: WebAuthn (SimpleWebAuthn library)
- **Database**: SQLite (better-sqlite3)
- **Testing**: Jest + ts-jest
- **JWT Format**: Standard `header.payload.signature` with WebAuthn algorithm

## Quick Commands

```bash
npm install          # Install dependencies
npm run dev         # Start dev server (http://localhost:3000)
npm test            # Run Jest tests
npm run lint        # Check code quality
```

## Current State

- ✅ Passkey registration and authentication
- ✅ JWT signing with WebAuthn signatures
- ✅ SQLite storage for credentials and JWTs
- ✅ Session management with localStorage
- ✅ Multiple signatures per session
- ✅ JWT verification and validation
- ✅ Jest tests for core functionality
- ✅ UI for signing and displaying JWTs
