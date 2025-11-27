import { NextRequest, NextResponse } from "next/server";
import { generateJWTKeyPair } from "@/lib/jwt-key-registration";
import { saveJWTKey, getCredential } from "@/lib/database";
import {
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { jwkToPemServer } from "@/lib/pem-utils";
import type { JWK } from "jose";
import { getWebAuthnConfig, getExpectedOrigin } from "@/lib/webauthn-config";

/**
 * Register a JWT signing key attested by a passkey
 *
 * Flow:
 * 1. Generate JWT key pair
 * 2. Client calls this endpoint with credentialId
 * 3. Server returns challenge (JWT public key fingerprint)
 * 4. Client uses passkey to sign challenge
 * 5. Client sends back attestation
 * 6. Server verifies and saves JWT key + attestation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credentialId, userId, passkeyAttestation, jwtKeyData } = body as {
      credentialId: string;
      userId?: string;
      passkeyAttestation?: AuthenticationResponseJSON;
      jwtKeyData?: {
        publicKeyJWK: JWK;
        privateKeyJWK?: JWK;
        publicKeyFingerprint: string;
        keyId: string;
      };
    };

    if (!credentialId) {
      return NextResponse.json(
        { error: "credentialId is required" },
        { status: 400 },
      );
    }

    // Check if JWT key already exists for this credential
    const { getJWTKeyByCredentialId } = await import("@/lib/database");
    const existingKey = await getJWTKeyByCredentialId(credentialId);

    if (existingKey) {
      return NextResponse.json({
        exists: true,
        keyId: existingKey.keyId,
        publicKeyJWK: existingKey.publicKeyJWK,
        publicKeyPEM: existingKey.publicKeyPEM,
        message: "JWT key already registered for this passkey",
      });
    }

    // If we're registering a new key, userId must be provided
    if (passkeyAttestation && jwtKeyData && !userId) {
      return NextResponse.json(
        { error: "userId is required for JWT key registration" },
        { status: 400 },
      );
    }

    // If no attestation provided yet, this is step 1: generate key and return challenge
    if (!passkeyAttestation || !jwtKeyData) {
      // Generate JWT key pair on server (for now - could be client-side)
      const jwtKey = await generateJWTKeyPair();

      console.log("📝 Generated JWT key pair");
      console.log("   Key ID:", jwtKey.keyId);
      console.log("   Fingerprint:", jwtKey.publicKeyFingerprint);

      // Return the challenge (fingerprint) for passkey to sign
      return NextResponse.json({
        step: "challenge",
        keyId: jwtKey.keyId,
        publicKeyJWK: jwtKey.publicKeyJWK,
        publicKeyFingerprint: jwtKey.publicKeyFingerprint,
        message: "Use passkey to sign this fingerprint",
      });
    }

    // Step 2: Verify passkey attestation and save
    console.log("🔐 Verifying passkey attestation...");
    console.log("   Looking up credential ID:", credentialId);

    // Get credential from DB
    const credential = await getCredential(credentialId);
    if (!credential) {
      console.error("❌ Credential not found in database");
      console.error("   Searched for credential ID:", credentialId);
      return NextResponse.json(
        { error: "Credential not found" },
        { status: 404 },
      );
    }

    // Get config
    const expectedOrigin = await getExpectedOrigin();
    const { rpId } = getWebAuthnConfig();

    // Verify the passkey signature
    const verificationResult = await verifyAuthenticationResponse({
      response: passkeyAttestation,
      expectedChallenge: jwtKeyData.publicKeyFingerprint,
      expectedOrigin,
      expectedRPID: rpId,
      credential: {
        id: credentialId,
        publicKey: isoBase64URL.toBuffer(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports,
      },
    });

    if (!verificationResult.verified) {
      return NextResponse.json(
        { error: "Passkey attestation verification failed" },
        { status: 400 },
      );
    }

    console.log("✅ Passkey attestation verified");

    // Convert JWK to PEM format for display
    const publicKeyPEM = jwkToPemServer(jwtKeyData.publicKeyJWK);

    // Save JWT key with passkey attestation
    await saveJWTKey(
      jwtKeyData.keyId,
      userId!,
      credentialId,
      JSON.stringify(jwtKeyData.publicKeyJWK),
      publicKeyPEM,
      jwtKeyData.publicKeyFingerprint,
      JSON.stringify(passkeyAttestation),
      jwtKeyData.privateKeyJWK
        ? JSON.stringify(jwtKeyData.privateKeyJWK)
        : undefined,
    );

    console.log("✅ JWT key registered and saved");

    return NextResponse.json({
      success: true,
      keyId: jwtKeyData.keyId,
      publicKeyJWK: jwtKeyData.publicKeyJWK,
      publicKeyPEM,
      message: "JWT key registered successfully",
    });
  } catch (error) {
    console.error("❌ Error registering JWT key:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to register JWT key",
      },
      { status: 500 },
    );
  }
}
