# Testing Guide - Multi-Signature Statement System

## Quick Start

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

## Multi-Signature Flow Testing (2 of 3)

### Prerequisites

- Modern browser with WebAuthn support (Chrome, Firefox, Safari)
- Three browser profiles or private windows (to simulate 3 different users)

### Test Scenario: Investment Agreement

#### Setup Phase (15 minutes)

**Browser 1 - Creator (Alice)**

1. Go to `http://localhost:3000`
2. Click "I am Creator"
3. Click "Get Started"
4. Enter name: "Alice"
5. Click "Continue"
6. Register passkey when prompted
7. Authenticate with passkey (one-time JWT key attestation)
8. Wait for setup to complete

**Browser 2 - Investor 1 (Bob)**

1. Open new private window or browser profile
2. Go to `http://localhost:3000`
3. Click "I am an Investor"
4. Click "Get Started"
5. Enter name: "Bob"
6. Click "Continue"
7. Register passkey when prompted
8. Authenticate with passkey
9. Wait for setup to complete

**Browser 3 - Investor 2 (Carol)**

1. Open another private window or browser profile
2. Go to `http://localhost:3000`
3. Click "I am an Investor"
4. Click "Get Started"
5. Enter name: "Carol"
6. Click "Continue"
7. Register passkey when prompted
8. Authenticate with passkey
9. Wait for setup to complete

#### Testing Flow

**Step 1: Creator Creates Statement**

- In Browser 1 (Alice - Creator):
  - Edit the sample JSON or use default
  - Click "Create Statement"
  - Verify success message

**Step 2: Creator Signs Statement (1/3)**

- Still in Browser 1 (Alice):
  - Click "Sign Statement" on the newly created statement
  - Verify: Status shows "1/3 signatures"
  - Verify: Yellow badge (not yet valid)
  - Verify: Green checkmark with Alice's name

**Step 3: Investor 1 Signs (2/3 - VALID!)**

- Switch to Browser 2 (Bob - Investor 1):
  - Refresh page or wait for auto-update
  - See the statement in "Available Statements"
  - Click "Sign Statement"
  - Verify: Status shows "2/3 signatures"
  - Verify: GREEN badge (valid!)
  - Verify: Two green checkmarks (Alice and Bob)

**Step 4: Investor 2 Signs (3/3 - Redundancy)**

- Switch to Browser 3 (Carol - Investor 2):
  - See the statement
  - Click "Sign Statement"
  - Verify: Status shows "3/3 signatures"
  - Verify: Still GREEN badge (valid)
  - Verify: Three green checkmarks (Alice, Bob, and Carol)

### Expected Results

✅ Statement becomes valid after 2 signatures (not before)
✅ Each user can sign only once
✅ Signature indicators show user names
✅ Green checkmarks appear for signed users
✅ Badge color: Yellow (0-1 sigs), Green (2-3 sigs)
✅ No passkey prompt after initial setup

### Testing Edge Cases

#### Attempt Duplicate Signature

- Try signing the same statement twice with the same user
- Expected: Error message "User has already signed this statement"

#### Check Statement Without 2 Signatures

- Create a new statement
- Sign with only Creator (1/3)
- Verify: Status shows "1/3 signatures" with yellow badge
- Expected: Not valid yet

#### Verify Technical Details

- Click "Technical Details" link
- Verify all users are registered with JWT keys
- Click "Technical Details" on a statement
- Verify: Full JWT structure, signatures visible
- Verify: PEM format public keys displayed

### UI/UX Checks

✅ User names displayed (not credential IDs)
✅ No base64 signatures in main view
✅ Collapsible JSON content
✅ Hover tooltips on checkmarks
✅ Clear signature count (2/3, 3/3, etc.)
✅ Role-based navigation working

### Cleanup

To reset and test again:

```bash
rm passkeys.db
npm run dev
```

## Troubleshooting

### Issue: Passkey prompt not appearing

- Check browser supports WebAuthn
- Try localhost instead of 127.0.0.1
- Clear browser data and retry

### Issue: Session lost on refresh

- Check browser console for errors
- Verify localStorage is enabled
- Re-setup the user

### Issue: Statement not appearing for investors

- Refresh the page
- Check creator created the statement successfully
- Verify database file exists

## Performance Metrics

Expected performance:

- **Initial setup**: 5-10 seconds (passkey + JWT key registration)
- **Sign statement**: < 500ms (no passkey prompt!)
- **Page load**: < 2 seconds
- **Database queries**: < 50ms

## Security Checks

✅ Private keys stored only in browser (localStorage)
✅ Passkeys never leave secure hardware
✅ Each signature independently verifiable
✅ 2-of-3 multi-signature enforcement
✅ Standard JWT format (EdDSA)
✅ PEM format for interoperability

---

**Happy Testing!** 🎉
