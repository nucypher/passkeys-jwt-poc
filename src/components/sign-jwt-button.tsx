"use client";

import { useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { createJWTPayload, type JWTPayload } from "@/lib/jwt-signing";
import { SignJWT, base64url } from "jose";
import { generateEphemeralKeyPair } from "@/lib/ephemeral-keys";

interface SignJWTButtonProps {
  credentialId: string;
  onSignatureCreated: () => void;
}

export default function SignJWTButton({
  credentialId,
  onSignatureCreated,
}: SignJWTButtonProps) {
  const [isSigning, setIsSigning] = useState(false);

  async function handleClick() {
    try {
      setIsSigning(true);

      console.log("🔑 Step 1: Generating ephemeral EdDSA key pair...");
      
      // Generate a fresh ephemeral key pair for this JWT
      const ephemeralKeys = await generateEphemeralKeyPair();
      
      console.log("✅ Ephemeral key pair generated");
      console.log("   Public Key JWK:", ephemeralKeys.publicKeyJWK);
      console.log("   Fingerprint:", ephemeralKeys.publicKeyFingerprint);

      console.log("\n🔏 Step 2: Getting passkey to attest ephemeral public key...");

      // Have the passkey sign the fingerprint of the ephemeral public key
      // This creates a cryptographic attestation that this ephemeral key is legitimate
      const attestationChallenge = ephemeralKeys.publicKeyFingerprint;

      const optionsResponse = await fetch("/api/authenticate/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge: attestationChallenge }),
      });

      if (!optionsResponse.ok) {
        throw new Error("Failed to get authentication options");
      }

      const authOptions = await optionsResponse.json();

      // Passkey signs the ephemeral public key fingerprint
      const passkeyAttestation = await startAuthentication({
        optionsJSON: authOptions,
      });

      console.log("✅ Passkey attestation obtained");

      console.log("\n📝 Step 3: Creating JWT payload with attestation...");

      // Create JWT payload that includes the passkey attestation
      const basePayload: JWTPayload = createJWTPayload();
      
      const payloadWithAttestation = {
        ...basePayload,
        // Include the ephemeral public key
        epk: ephemeralKeys.publicKeyJWK,
        // Include the passkey attestation of the ephemeral public key
        passkey_attestation: {
          credential_id: credentialId,
          fingerprint: ephemeralKeys.publicKeyFingerprint,
          signature: passkeyAttestation,
        },
      };

      console.log("✅ JWT payload created with passkey attestation");

      console.log("\n✍️  Step 4: Signing JWT with ephemeral private key (using jose)...");

      // Sign the JWT using the ephemeral private key with jose.SignJWT
      // This creates a STANDARD JWT that can be verified with jose.jwtVerify()!
      const jwt = await new SignJWT(payloadWithAttestation)
        .setProtectedHeader({ alg: "EdDSA", typ: "JWT" })
        .setIssuedAt()
        .sign(ephemeralKeys.privateKey);

      console.log("✅ JWT signed with ephemeral key");
      console.log("   This is a STANDARD JWT verifiable with jose.jwtVerify()!");

      console.log("\n💾 Step 5: Saving JWT to server...");

      // Send to server to save
      const response = await fetch("/api/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jwt,
          credentialId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save JWT");
      }

      const result = await response.json();
      console.log("✅ JWT saved:", result);

      // Automatically validate the JWT
      console.log("\n🔍 Step 6: Validating JWT...");
      console.log("   This will do TWO verifications:");
      console.log("   1️⃣  Standard JWT signature (with ephemeral public key)");
      console.log("   2️⃣  Passkey attestation (of ephemeral public key)");
      
      const validateResponse = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jwt }),
      });

      if (validateResponse.ok) {
        const validationResult = await validateResponse.json();
        console.log("\n✅ JWT FULLY VERIFIED!");
        console.log("   Standard JWT verification:", validationResult.jwt_verified ? "✅ PASS" : "❌ FAIL");
        console.log("   Passkey attestation:", validationResult.passkey_verified ? "✅ PASS" : "❌ FAIL");
        console.log("\n📋 Full result:", validationResult);
      } else {
        const errorResult = await validateResponse.json();
        console.error("❌ Verification failed:", errorResult);
      }

      onSignatureCreated();
    } catch (error) {
      console.error("❌ Error signing JWT:", error);
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSigning(false);
    }
  }

  return (
    <button
      className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-blue-600 text-white gap-2 hover:bg-blue-700 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={handleClick}
      disabled={isSigning}
    >
      {isSigning ? "Signing..." : "Sign JWT"}
    </button>
  );
}

