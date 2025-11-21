/**
 * JWT Verification with Detached Passkey Attestation
 *
 * This verifier checks:
 * 1. JWT signature is valid (standard JWT verification)
 * 2. JWT signing key is authorized (exists in DB with passkey attestation)
 *
 * The passkey attestation is stored separately in the DB,
 * not embedded in the JWT payload.
 */

import { jwtVerify, importJWK, decodeProtectedHeader, decodeJwt } from "jose";
import { getJWTKey } from "./database";

export interface DetachedVerificationResult {
  valid: boolean;
  jwtVerified: boolean;
  keyAuthorized: boolean;
  keyId?: string;
  credentialId?: string;
  payload?: any;
  header?: any;
  error?: string;
  details?: {
    jwtVerification?: string;
    keyAuthorization?: string;
  };
}

/**
 * Verify a JWT with detached passkey attestation
 *
 * Steps:
 * 1. Extract kid from JWT header
 * 2. Lookup JWT public key in DB
 * 3. Verify JWT signature with public key
 * 4. Confirm key is authorized (has passkey attestation in DB)
 */
export async function verifyDetachedJWT(
  jwt: string
): Promise<DetachedVerificationResult> {
  const details: { jwtVerification?: string; keyAuthorization?: string } = {};

  try {
    console.log("🔍 Stage 1: Extracting key ID from JWT...");

    // Decode header to get kid (key ID)
    const header = decodeProtectedHeader(jwt);

    if (!header.kid) {
      return {
        valid: false,
        jwtVerified: false,
        keyAuthorized: false,
        error: "JWT header missing 'kid' (key ID)",
      };
    }

    const keyId = header.kid as string;
    console.log("✅ Key ID:", keyId);

    console.log("\n🔍 Stage 2: Looking up JWT public key in database...");

    // Lookup JWT key in database
    const jwtKey = await getJWTKey(keyId);

    if (!jwtKey) {
      return {
        valid: false,
        jwtVerified: false,
        keyAuthorized: false,
        error: `JWT key not found: ${keyId}`,
        details,
      };
    }

    console.log("✅ JWT key found in database");
    console.log("   Credential ID:", jwtKey.credentialId);
    console.log("   Created:", new Date(jwtKey.createdAt).toISOString());

    // Check that passkey attestation exists (key is authorized)
    if (!jwtKey.passkeyAttestation) {
      return {
        valid: false,
        jwtVerified: false,
        keyAuthorized: false,
        error: "JWT key missing passkey attestation",
        details,
      };
    }

    console.log("✅ Key is authorized (has passkey attestation)");
    details.keyAuthorization = `Key attested by passkey ${jwtKey.credentialId}`;

    console.log("\n🔍 Stage 3: Verifying JWT signature...");

    // Import the public key
    const publicKey = await importJWK(jwtKey.publicKeyJWK, "EdDSA");

    // Verify JWT signature using jose.jwtVerify
    // This is STANDARD JWT verification!
    let verifyResult;
    try {
      verifyResult = await jwtVerify(jwt, publicKey, {
        algorithms: ["EdDSA"],
      });

      console.log("✅ JWT signature verified successfully");
      console.log("   Algorithm: EdDSA");
      console.log("   Verified with standard jose.jwtVerify()");

      details.jwtVerification =
        "JWT signature verified with registered public key";
    } catch (jwtError) {
      console.error("❌ JWT signature verification failed:", jwtError);
      return {
        valid: false,
        jwtVerified: false,
        keyAuthorized: true, // Key exists, but JWT signature is invalid
        keyId,
        credentialId: jwtKey.credentialId,
        error: `JWT signature verification failed: ${
          jwtError instanceof Error ? jwtError.message : "Unknown error"
        }`,
        details,
      };
    }

    console.log("\n🎉 VERIFICATION COMPLETE!");
    console.log("   ✅ JWT signature valid");
    console.log("   ✅ Key is authorized by passkey");

    return {
      valid: true,
      jwtVerified: true,
      keyAuthorized: true,
      keyId,
      credentialId: jwtKey.credentialId,
      payload: verifyResult.payload,
      header: verifyResult.protectedHeader,
      details,
    };
  } catch (error) {
    console.error("❌ Verification error:", error);
    return {
      valid: false,
      jwtVerified: false,
      keyAuthorized: false,
      error: error instanceof Error ? error.message : "Unknown error",
      details,
    };
  }
}

/**
 * Inspect a JWT without full verification
 * Useful for debugging
 */
export function inspectDetachedJWT(jwt: string) {
  try {
    const header = decodeProtectedHeader(jwt);
    const payload = decodeJwt(jwt);

    return {
      header,
      payload,
      keyId: header.kid,
      algorithm: header.alg,
    };
  } catch (error) {
    throw new Error(
      `Failed to inspect JWT: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
