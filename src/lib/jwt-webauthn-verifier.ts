/**
 * Standardized JWT verification for WebAuthn-signed JWTs using jose library
 *
 * This provides maximum compatibility with standard JWT libraries while
 * maintaining WebAuthn's security properties.
 *
 * For other applications to verify these JWTs:
 * 1. Install: npm install jose @simplewebauthn/server
 * 2. Import this verification function
 * 3. Call verifyWebAuthnJWT(jwt, origin, getPublicKeyFunction)
 */

import { decodeProtectedHeader, decodeJwt, base64url } from "jose";
import { getCredential } from "./database";
import {
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import crypto from "crypto";
import type { JWTPayload } from "./jwt-signing";

export interface JWTVerificationResult {
  valid: boolean;
  credentialId?: string;
  payload?: Record<string, unknown>;
  header?: Record<string, unknown>;
  error?: string;
  webauthnDetails?: {
    userVerified: boolean;
    counter: number;
    origin: string;
  };
}

/**
 * Verify a WebAuthn-signed JWT
 *
 * This function uses the jose library for all JWT parsing and encoding,
 * making it compatible with standard JWT tools while properly verifying
 * the WebAuthn signature.
 *
 * @param jwt - The JWT string to verify
 * @param origin - Expected origin (e.g., "http://localhost:3000")
 * @param getPublicKey - Function to retrieve public key for a credential ID
 * @returns Verification result with detailed information
 */
export async function verifyWebAuthnJWT(
  jwt: string,
  origin: string,
  getPublicKey: (credentialId: string) => Promise<{
    publicKey: Uint8Array;
    counter: number;
    transports: string[];
  } | null>
): Promise<JWTVerificationResult> {
  try {
    // Step 1: Parse JWT structure using jose (standards-compliant)
    const parts = jwt.split(".");
    if (parts.length !== 3) {
      return {
        valid: false,
        error: "Invalid JWT format: expected 3 parts separated by dots",
      };
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;

    // Step 2: Decode header and payload using jose
    const header = decodeProtectedHeader(jwt);
    const payload = decodeJwt(jwt) as JWTPayload;

    console.log("📋 Decoded JWT using jose:");
    console.log("  Header:", header);
    console.log("  Payload:", payload);

    // Step 3: Reconstruct the JWT message that was hashed and signed
    const jwtMessage = `${encodedHeader}.${encodedPayload}`;

    // Step 4: Recreate the challenge (SHA-256 hash of JWT message)
    // We use jose's base64url encoding for consistency
    const msgBuffer = Buffer.from(jwtMessage, "utf-8");
    const hash = crypto.createHash("sha256").update(msgBuffer).digest();
    const challengeBase64url = base64url.encode(hash);

    console.log("🔐 Challenge (SHA-256 of JWT message):", challengeBase64url);

    // Step 5: Decode the signature part (contains WebAuthn auth response)
    // Using jose's base64url decode for standards compliance
    const signatureBytes = base64url.decode(encodedSignature);
    const signatureJson = Buffer.from(signatureBytes).toString("utf-8");
    const authResponse: AuthenticationResponseJSON = JSON.parse(signatureJson);

    console.log("✅ Decoded WebAuthn authentication response");

    // Step 6: Get the credential's public key
    const credentialId = authResponse.id;
    const storedCredential = await getPublicKey(credentialId);

    if (!storedCredential) {
      return {
        valid: false,
        error: `Credential not found: ${credentialId}`,
      };
    }

    // Step 7: Verify the WebAuthn signature
    // This verifies:
    // - Signature is cryptographically valid
    // - Challenge matches (binds signature to JWT payload)
    // - Origin matches (prevents phishing)
    // - User was present (security flag)
    // - Counter hasn't decreased (prevents replay)
    const verificationResponse = await verifyAuthenticationResponse({
      response: authResponse,
      expectedChallenge: challengeBase64url,
      expectedOrigin: origin,
      expectedRPID: "localhost",
      credential: {
        id: credentialId,
        publicKey: storedCredential.publicKey,
        counter: storedCredential.counter,
        transports: storedCredential.transports as AuthenticatorTransportFuture[],
      },
    });

    if (!verificationResponse.verified) {
      return {
        valid: false,
        error: "WebAuthn signature verification failed",
      };
    }

    console.log("✅ WebAuthn signature verified successfully!");

    return {
      valid: true,
      credentialId,
      payload,
      header,
      webauthnDetails: {
        userVerified: verificationResponse.authenticationInfo.userVerified,
        counter: verificationResponse.authenticationInfo.newCounter,
        origin: verificationResponse.authenticationInfo.origin,
      },
    };
  } catch (error) {
    console.error("❌ JWT verification error:", error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Convenience function that uses the database to get the public key
 * This is the main function used by this application
 */
export async function verifyJWTFromDatabase(
  jwt: string,
  origin: string
): Promise<JWTVerificationResult> {
  return verifyWebAuthnJWT(jwt, origin, async (credentialId: string) => {
    const storedCredential = await getCredential(credentialId);
    if (!storedCredential) return null;

    return {
      publicKey: isoBase64URL.toBuffer(storedCredential.publicKey),
      counter: storedCredential.counter,
      transports: storedCredential.transports,
    };
  });
}

/**
 * Inspect JWT structure without verification
 * Useful for debugging and understanding the JWT format
 */
export function inspectJWT(jwt: string): {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signaturePreview: string;
  isStandardFormat: boolean;
} {
  try {
    const parts = jwt.split(".");

    // Use jose to decode (standards-compliant)
    const header = decodeProtectedHeader(jwt);
    const payload = decodeJwt(jwt);

    const signaturePreview = parts[2]
      ? `${parts[2].substring(0, 50)}...`
      : "N/A";

    return {
      header,
      payload,
      signaturePreview,
      isStandardFormat: parts.length === 3,
    };
  } catch (error) {
    throw new Error(
      `Failed to inspect JWT: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
