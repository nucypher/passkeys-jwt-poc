/**
 * Two-Stage JWT Verification with Passkey Attestation
 * 
 * This verifier implements a hybrid approach:
 * 1. Stage 1: Verify JWT signature using jose.jwtVerify() with ephemeral public key
 * 2. Stage 2: Verify passkey attestation of the ephemeral public key
 * 
 * This allows:
 * - Standard JWT verification with any JWT library
 * - WebAuthn security through passkey attestation of the signing key
 * - Clean separation of concerns
 */

import { jwtVerify, type JWK } from "jose";
import { verifyAuthenticationResponse, type AuthenticationResponseJSON } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { importPublicKeyFromJWK, verifyPublicKeyFingerprint } from "./ephemeral-keys";
import { getCredential } from "./database";

export interface HybridVerificationResult {
  valid: boolean;
  jwt_verified: boolean;
  passkey_verified: boolean;
  payload?: any;
  header?: any;
  credential_id?: string;
  error?: string;
  details?: {
    jwt_verification?: string;
    passkey_verification?: string;
  };
}

/**
 * Verify a JWT with hybrid verification:
 * 1. Verify JWT signature with ephemeral public key (standard JWT verification)
 * 2. Verify passkey attestation of the ephemeral public key (WebAuthn verification)
 */
export async function verifyHybridJWT(
  jwt: string,
  origin: string
): Promise<HybridVerificationResult> {
  const details: { jwt_verification?: string; passkey_verification?: string } = {};

  try {
    console.log("🔍 Stage 1: Standard JWT Verification...");

    // First, decode the JWT without verification to get the ephemeral public key
    const parts = jwt.split(".");
    if (parts.length !== 3) {
      return {
        valid: false,
        jwt_verified: false,
        passkey_verified: false,
        error: "Invalid JWT format",
      };
    }

    // Decode payload to get the ephemeral public key
    const payloadJson = Buffer.from(parts[1], "base64url").toString("utf-8");
    const payload = JSON.parse(payloadJson);

    if (!payload.epk) {
      return {
        valid: false,
        jwt_verified: false,
        passkey_verified: false,
        error: "JWT payload missing ephemeral public key (epk)",
      };
    }

    if (!payload.passkey_attestation) {
      return {
        valid: false,
        jwt_verified: false,
        passkey_verified: false,
        error: "JWT payload missing passkey attestation",
      };
    }

    // Import the ephemeral public key from JWK
    const ephemeralPublicKey = await importPublicKeyFromJWK(payload.epk as JWK);

    // Verify the JWT signature using the ephemeral public key
    // This is STANDARD JWT verification that any library can do!
    let jwtVerifyResult;
    try {
      jwtVerifyResult = await jwtVerify(jwt, ephemeralPublicKey, {
        algorithms: ["EdDSA"],
      });
      
      console.log("✅ Stage 1 PASSED: JWT signature is valid");
      console.log("   Algorithm: EdDSA");
      console.log("   Verified using ephemeral public key from payload");
      details.jwt_verification = "JWT signature verified successfully with ephemeral public key";
    } catch (jwtError) {
      console.error("❌ Stage 1 FAILED: JWT signature invalid");
      return {
        valid: false,
        jwt_verified: false,
        passkey_verified: false,
        error: `JWT signature verification failed: ${jwtError instanceof Error ? jwtError.message : "Unknown error"}`,
        details,
      };
    }

    console.log("\n🔐 Stage 2: Passkey Attestation Verification...");

    const attestation = payload.passkey_attestation;
    const credentialId = attestation.credential_id;
    const fingerprint = attestation.fingerprint;
    const authResponse: AuthenticationResponseJSON = attestation.signature;

    // Verify that the fingerprint matches the ephemeral public key
    const fingerprintMatches = await verifyPublicKeyFingerprint(payload.epk as JWK, fingerprint);
    if (!fingerprintMatches) {
      console.error("❌ Stage 2 FAILED: Fingerprint mismatch");
      return {
        valid: false,
        jwt_verified: true,
        passkey_verified: false,
        error: "Ephemeral public key fingerprint does not match passkey attestation",
        details: {
          ...details,
          passkey_verification: "Fingerprint mismatch",
        },
      };
    }

    console.log("✅ Fingerprint matches ephemeral public key");

    // Get the passkey's public key from database
    const storedCredential = await getCredential(credentialId);
    if (!storedCredential) {
      return {
        valid: false,
        jwt_verified: true,
        passkey_verified: false,
        error: `Passkey credential not found: ${credentialId}`,
        details,
      };
    }

    // Verify the passkey's signature of the ephemeral public key fingerprint
    const credentialPublicKey = isoBase64URL.toBuffer(storedCredential.publicKey);

    const verificationResponse = await verifyAuthenticationResponse({
      response: authResponse,
      expectedChallenge: fingerprint,
      expectedOrigin: origin,
      expectedRPID: "localhost",
      credential: {
        id: credentialId,
        publicKey: credentialPublicKey,
        counter: storedCredential.counter,
        transports: storedCredential.transports,
      },
    });

    if (!verificationResponse.verified) {
      console.error("❌ Stage 2 FAILED: Passkey attestation invalid");
      return {
        valid: false,
        jwt_verified: true,
        passkey_verified: false,
        error: "Passkey attestation verification failed",
        details: {
          ...details,
          passkey_verification: "WebAuthn signature verification failed",
        },
      };
    }

    console.log("✅ Stage 2 PASSED: Passkey attestation is valid");
    console.log("   Passkey verified the ephemeral public key");
    console.log("   User was present:", verificationResponse.authenticationInfo.userPresent);
    console.log("   User verified:", verificationResponse.authenticationInfo.userVerified);

    details.passkey_verification = `Passkey ${credentialId.substring(0, 8)}... attested the ephemeral key`;

    console.log("\n🎉 BOTH STAGES PASSED!");
    console.log("   ✅ JWT signature valid (standard verification)");
    console.log("   ✅ Passkey attested signing key (WebAuthn security)");

    return {
      valid: true,
      jwt_verified: true,
      passkey_verified: true,
      payload: jwtVerifyResult.payload,
      header: jwtVerifyResult.protectedHeader,
      credential_id: credentialId,
      details,
    };
  } catch (error) {
    console.error("❌ Verification error:", error);
    return {
      valid: false,
      jwt_verified: false,
      passkey_verified: false,
      error: error instanceof Error ? error.message : "Unknown error",
      details,
    };
  }
}

/**
 * Verify JWT signature only (Stage 1)
 * This demonstrates that the JWT can be verified by any standard JWT library
 */
export async function verifyJWTSignatureOnly(jwt: string): Promise<{
  valid: boolean;
  payload?: any;
  header?: any;
  error?: string;
}> {
  try {
    // Decode payload to get ephemeral public key
    const parts = jwt.split(".");
    const payloadJson = Buffer.from(parts[1], "base64url").toString("utf-8");
    const payload = JSON.parse(payloadJson);

    if (!payload.epk) {
      return {
        valid: false,
        error: "Missing ephemeral public key in payload",
      };
    }

    // Import and verify
    const ephemeralPublicKey = await importPublicKeyFromJWK(payload.epk as JWK);
    const result = await jwtVerify(jwt, ephemeralPublicKey, {
      algorithms: ["EdDSA"],
    });

    return {
      valid: true,
      payload: result.payload,
      header: result.protectedHeader,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

