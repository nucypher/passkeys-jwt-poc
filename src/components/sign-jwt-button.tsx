"use client";

import { useState, useEffect } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { createJWTPayload, type JWTPayload } from "@/lib/jwt-signing";
import { SignJWT, generateKeyPair, exportJWK, type KeyLike, type JWK } from "jose";

interface SignJWTButtonProps {
  credentialId: string;
  onSignatureCreated: () => void;
}

interface JWTKeyInfo {
  keyId: string;
  publicKeyJWK: JWK;
  privateKey: KeyLike;
}

export default function SignJWTButton({
  credentialId,
  onSignatureCreated,
}: SignJWTButtonProps) {
  const [isSigning, setIsSigning] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [jwtKey, setJwtKey] = useState<JWTKeyInfo | null>(null);
  const [keyStatus, setKeyStatus] = useState<
    "checking" | "ready" | "needs_registration"
  >("checking");

  // Check if JWT key is already registered when component mounts
  useEffect(() => {
    checkJWTKeyRegistration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credentialId]);

  async function checkJWTKeyRegistration() {
    try {
      setKeyStatus("checking");

      // Check if JWT key exists for this passkey
      const response = await fetch("/api/jwt-keys/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentialId }),
      });

      const result = await response.json();

      if (result.exists) {
        console.log("✅ JWT key already registered");
        setKeyStatus("needs_registration"); // We have it in DB but not the private key
        // Note: In a real app, you'd store the private key securely (e.g., IndexedDB)
      } else {
        console.log("⚠️ JWT key not registered yet");
        setKeyStatus("needs_registration");
      }
    } catch (error) {
      console.error("Error checking JWT key registration:", error);
      setKeyStatus("needs_registration");
    }
  }

  async function registerJWTKey() {
    try {
      setIsRegistering(true);
      console.log("🔑 Step 1: Generating JWT signing key pair...");

      // Generate JWT key pair client-side
      const keyPair = await generateKeyPair("EdDSA", { crv: "Ed25519" });
      const publicKeyJWK = await exportJWK(keyPair.publicKey);

      // Create fingerprint
      const canonical = JSON.stringify({
        kty: publicKeyJWK.kty,
        crv: publicKeyJWK.crv,
        x: publicKeyJWK.x,
      });
      const msgBuffer = new TextEncoder().encode(canonical);
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
      const publicKeyFingerprint = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const keyId = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      console.log("✅ JWT key pair generated");
      console.log("   Key ID:", keyId);
      console.log("   Fingerprint:", publicKeyFingerprint);

      console.log("\n🔏 Step 2: Getting passkey to attest JWT public key...");

      // Get authentication options with fingerprint as challenge
      // Constrain to only the authenticated credential
      const optionsResponse = await fetch("/api/authenticate/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge: publicKeyFingerprint,
          credentialId: credentialId,
        }),
      });

      if (!optionsResponse.ok) {
        throw new Error("Failed to get authentication options");
      }

      const authOptions = await optionsResponse.json();

      // Passkey signs the JWT public key fingerprint
      const passkeyAttestation = await startAuthentication({
        optionsJSON: authOptions,
      });

      console.log("✅ Passkey attestation obtained");
      console.log("   Used credential ID:", passkeyAttestation.id);

      console.log("\n💾 Step 3: Registering JWT key...");

      // Register JWT key with passkey attestation
      // Use the credential ID from the attestation response, not the prop
      // (in case user selected a different credential)
      const usedCredentialId = passkeyAttestation.id;
      const registerResponse = await fetch("/api/jwt-keys/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credentialId: usedCredentialId,
          passkeyAttestation,
          jwtKeyData: {
            keyId,
            publicKeyJWK,
            publicKeyFingerprint,
          },
        }),
      });

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json();
        throw new Error(errorData.error || "Failed to register JWT key");
      }

      const registerResult = await registerResponse.json();
      console.log("✅ JWT key registered:", registerResult);

      // Store JWT key info (including private key) in state
      // Note: In production, store private key securely (e.g., IndexedDB with encryption)
      setJwtKey({
        keyId,
        publicKeyJWK,
        privateKey: keyPair.privateKey,
      });
      setKeyStatus("ready");

      alert("JWT key registered successfully! You can now sign JWTs.");
    } catch (error) {
      console.error("❌ Error registering JWT key:", error);
      alert(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsRegistering(false);
    }
  }

  async function signJWT() {
    if (!jwtKey) {
      alert("Please register JWT key first");
      return;
    }

    try {
      setIsSigning(true);

      console.log("📝 Step 1: Creating JWT payload...");
      const payload: JWTPayload = createJWTPayload();
      console.log("   Payload:", payload);

      console.log("\n✍️  Step 2: Signing JWT with JWT private key...");
      console.log("   NO passkey interaction needed!");

      // Sign JWT with JWT private key using jose.SignJWT
      // This is STANDARD JWT signing - no passkey involved!
      const jwt = await new SignJWT(payload)
        .setProtectedHeader({
          alg: "EdDSA",
          typ: "JWT",
          kid: jwtKey.keyId, // Include key ID for lookup
        })
        .setIssuedAt()
        .sign(jwtKey.privateKey);

      console.log("✅ JWT signed with JWT private key");
      console.log("   Algorithm: EdDSA");
      console.log("   Key ID:", jwtKey.keyId);
      console.log("   This is a STANDARD JWT!");

      console.log("\n💾 Step 3: Saving JWT to server...");

      const response = await fetch("/api/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jwt, keyId: jwtKey.keyId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save JWT");
      }

      const result = await response.json();
      console.log("✅ JWT saved:", result);

      console.log("\n🔍 Step 4: Validating JWT...");

      const validateResponse = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jwt }),
      });

      if (validateResponse.ok) {
        const validationResult = await validateResponse.json();
        console.log("\n✅ JWT VERIFIED!");
        console.log(
          "   JWT signature verified:",
          validationResult.jwtVerified ? "✅" : "❌"
        );
        console.log(
          "   Key authorized:",
          validationResult.keyAuthorized ? "✅" : "❌"
        );
        console.log("\n📋 Full result:", validationResult);
      } else {
        const errorResult = await validateResponse.json();
        console.error("❌ Verification failed:", errorResult);
      }

      onSignatureCreated();
    } catch (error) {
      console.error("❌ Error signing JWT:", error);
      alert(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsSigning(false);
    }
  }

  if (keyStatus === "checking") {
    return (
      <button
        className="rounded-full border border-solid border-gray-400 transition-colors flex items-center justify-center bg-gray-100 text-gray-600 gap-2 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
        disabled
      >
        Checking...
      </button>
    );
  }

  if (keyStatus === "needs_registration") {
    return (
      <div className="flex flex-col gap-2">
        <button
          className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-yellow-600 text-white gap-2 hover:bg-yellow-700 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={registerJWTKey}
          disabled={isRegistering}
        >
          {isRegistering ? "Registering Key..." : "Register JWT Key"}
        </button>
        <span className="text-xs text-gray-600">
          (One-time setup with passkey)
        </span>
      </div>
    );
  }

  return (
    <button
      className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-blue-600 text-white gap-2 hover:bg-blue-700 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={signJWT}
      disabled={isSigning}
    >
      {isSigning ? "Signing..." : "Sign JWT"}
    </button>
  );
}
