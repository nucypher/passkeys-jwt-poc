"use client";

import Link from "next/link";

export default function VerificationGuidePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href="/technical"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mb-4 inline-block"
          >
            ← Back to Technical Dashboard
          </Link>
          <h1 className="text-3xl font-bold mb-2">JWT Verification Guide</h1>
          <p className="text-gray-600 dark:text-gray-400">
            How to verify statement signatures in external applications.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 prose dark:prose-invert max-w-none">
          <h2>Overview</h2>
          <p>
            This guide explains how to verify signatures (JWTs) created by the
            multi-signature statement system.
          </p>
          <p>
            <strong>Key Concept:</strong> You verify the JWT signature using a
            public key fetched from the system&apos;s API. The API provides a{" "}
            <strong>verifiable attestation</strong> (WebAuthn assertion) that
            proves the key was authorized by a passkey.
          </p>

          <hr className="my-6 border-gray-200 dark:border-gray-700" />

          <h2>Verification Steps</h2>
          <p>To verify a signature, you need to:</p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              <strong>
                Extract the Key ID (<code>kid</code>)
              </strong>{" "}
              from the JWT header
            </li>
            <li>
              <strong>Fetch the Public Key & Attestation</strong> from the
              system API.
              <blockquote className="border-l-4 border-blue-500 pl-4 italic my-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                <strong>Design Note:</strong> We store the attestation in the
                database to keep JWTs lightweight. <em>Alternative:</em> The
                attestation could be embedded directly inside the JWT to
                eliminate the API call, but this would significantly increase
                the size of every signature.
              </blockquote>
            </li>
            <li>
              <strong>Verify the Passkey Attestation</strong> (optional but
              recommended)
            </li>
            <li>
              <strong>Verify the JWT Signature</strong> using any standard JWT
              library
            </li>
          </ol>

          <hr className="my-6 border-gray-200 dark:border-gray-700" />

          <h2>Step-by-Step Implementation</h2>

          <h3>1. Extract Key ID</h3>
          <p>
            The JWT header contains the <code>kid</code> which identifies the
            signing key.
          </p>
          <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto">
            <code>{`import { decodeProtectedHeader } from "jose";

const jwt = "eyJhbGciOiJFZERTQS..."; // The signature string
const header = decodeProtectedHeader(jwt);
const keyId = header.kid;`}</code>
          </pre>

          <h3>2. Fetch Public Key & Attestation</h3>
          <p>
            Query the system&apos;s API to get the public key and the passkey
            attestation.
          </p>
          <p>
            <strong>Endpoint:</strong> <code>GET /api/jwt-keys/:keyId</code>
          </p>
          <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto">
            <code>{`async function getSigningKeyData(keyId: string) {
  const response = await fetch(\`https://app-domain.com/api/jwt-keys/\\\${keyId}\`);
  
  if (!response.ok) {
    throw new Error("Signing key not found or revoked");
  }
  
  return await response.json();
}`}</code>
          </pre>

          <h3>3. Verify Passkey Attestation</h3>
          <p>
            The API returns a <code>passkeyAttestation</code> object. This is a
            WebAuthn authentication response where the passkey signed the{" "}
            <strong>fingerprint of the JWT public key</strong>.
          </p>
          <p>
            To verify this, you check that the passkey signed the correct
            challenge (the JWT key fingerprint).
          </p>
          <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto">
            <code>{`import { verifyAuthenticationResponse } from "@simplewebauthn/server";

async function verifyAttestation(keyData: any) {
  // keyData is the JSON returned from getSigningKeyData()
  const { passkeyAttestation, publicKeyFingerprint, credentialId } = keyData;

  // The "challenge" the passkey signed was the JWT key&apos;s fingerprint
  const expectedChallenge = publicKeyFingerprint;

  const verification = await verifyAuthenticationResponse({
    response: passkeyAttestation,
    expectedChallenge,
    expectedOrigin: "https://app-domain.com", // The origin where the key was registered
    expectedRPID: "app-domain.com",           // The RP ID of the application
    authenticator: {
      // You would typically need the passkey&apos;s public key here to fully verify
      // For this PoC, we assume the API provided valid data, but in a real
      // scenario, you might fetch the passkey&apos;s public key from a trusted source
      credentialPublicKey: keyData.passkeyPublicKey, 
      credentialID: credentialId,
      counter: 0, // You might track counters
    }
  });

  if (!verification.verified) {
    throw new Error("Passkey attestation invalid");
  }
  
  return true;
}`}</code>
          </pre>
          <p className="text-sm text-gray-500 italic mt-2">
            <strong>Note:</strong> Full external verification of the WebAuthn
            response requires knowing the passkey&apos;s public key (which is
            stored in the <code>passkey_credentials</code> table). The API
            currently returns the JWT key information. For strict verification,
            you would need the passkey&apos;s public key as well.
          </p>

          <h3>4. Verify JWT Signature</h3>
          <p>Use the fetched JWK to verify the JWT signature.</p>
          <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto">
            <code>{`import { jwtVerify, importJWK } from "jose";

async function verifyStatementSignature(jwt: string) {
  // 1. Get Key ID
  const header = decodeProtectedHeader(jwt);
  
  // 2. Fetch Key Data
  const keyData = await getSigningKeyData(header.kid);
  
  // 3. Verify Attestation (Optional)
  // await verifyAttestation(keyData);
  
  // 4. Verify JWT
  const publicKey = await importJWK(keyData.publicKeyJWK, "EdDSA");
  const { payload } = await jwtVerify(jwt, publicKey, {
    algorithms: ["EdDSA"]
  });
  
  return payload;
}`}</code>
          </pre>

          <hr className="my-6 border-gray-200 dark:border-gray-700" />

          <h2>API Response Format</h2>
          <p>
            The <code>/api/jwt-keys/:id</code> endpoint returns:
          </p>
          <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto">
            <code>{`{
  "keyId": "942c92a4901ae28969c8eb586b0672f4",
  "publicKeyJWK": {
    "kty": "OKP",
    "crv": "Ed25519",
    "x": "11qYAYKxCrfVS_7TyWQHOg7hcvP9QV8AwYp5yQghwFE"
  },
  "publicKeyFingerprint": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "passkeyAttestation": {
    "id": "mMhuCn9BzTq4...",
    "rawId": "(same as id)", // Represents the binary buffer
    "response": {
      "authenticatorData": "SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2MBAAAAAA",
      "clientDataJSON": "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoiZTNiMGM0NDI5OGZjMWMxNDlhZmJmNGM4OTk2ZmI5MjQyN2FlNDFlNDY0OWI5MzRjYTQ5NTk5MWI3ODUyYjg1NSIsIm9yaWdpbiI6Imh0dHBzOi8vYXBwLWRvbWFpbi5jb20iLCJjcm9zc09yaWdpbiI6ZmFsc2V9",
      "signature": "MEUCIQDl3..."
    },
    "type": "public-key"
  }
}`}</code>
          </pre>

          <hr className="my-6 border-gray-200 dark:border-gray-700" />

          <h2>FAQ</h2>

          <h3>Q: What does the passkey attestation prove?</h3>
          <p>
            It proves that the <strong>JWT signing key</strong> (identified by
            its fingerprint) was explicitly authorized by the user&apos;s
            passkey. The user had to perform a biometric/PIN check to generate
            this attestation.
          </p>

          <h3>Q: Why verify the attestation?</h3>
          <p>
            Verifying the attestation allows you to independently confirm that
            the signing key was authorized by a passkey. It provides a
            cryptographic chain of trust from the user&apos;s hardware token to
            the JWT signature.
          </p>

          <h3>Q: Which libraries can I use?</h3>
          <p>
            You can use any standard WebAuthn library for your language, such as{" "}
            <code>@simplewebauthn/server</code> (Node.js),{" "}
            <code>webauthn-ruby</code> (Ruby), <code>go-webauthn</code> (Go), or
            others.
          </p>
        </div>
      </div>
    </div>
  );
}
