/**
 * JWT Key Registration with Passkey Attestation
 *
 * This module handles registering JWT signing keys that are attested by passkeys.
 *
 * Flow:
 * 1. Generate a JWT signing key pair (EdDSA)
 * 2. Passkey signs the JWT public key fingerprint
 * 3. Store: JWT public key + passkey signature in DB
 * 4. JWT signing only needs the JWT private key (no passkey interaction)
 * 5. Verification: Check JWT signature + lookup passkey authorization in DB
 *
 * Benefits:
 * - Register once, sign many times
 * - No passkey interaction needed for each JWT
 * - Passkey attestation stored separately from JWT
 * - 1:1 relationship between passkey and JWT key
 */

import { generateKeyPair, exportJWK, type JWK, type KeyLike } from "jose";
import crypto from "crypto";

export interface JWTKeyPair {
  publicKey: KeyLike;
  privateKey: KeyLike;
  publicKeyJWK: JWK;
  publicKeyFingerprint: string;
  keyId: string; // Unique identifier for this key pair
}

/**
 * Generate a JWT signing key pair (EdDSA/Ed25519)
 * This key pair is persistent and can be used to sign multiple JWTs
 */
export async function generateJWTKeyPair(): Promise<JWTKeyPair> {
  // Generate Ed25519 key pair
  const keyPair = await generateKeyPair("EdDSA", { crv: "Ed25519" });

  // Export public key as JWK
  const publicKeyJWK = await exportJWK(keyPair.publicKey);

  // Create a fingerprint of the public key (for passkey to sign)
  const publicKeyFingerprint = await createPublicKeyFingerprint(publicKeyJWK);

  // Generate a unique key ID
  const keyId = crypto.randomBytes(16).toString("hex");

  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
    publicKeyJWK,
    publicKeyFingerprint,
    keyId,
  };
}

/**
 * Create a canonical fingerprint of a public key
 * This is what the passkey will sign to attest the JWT key
 */
async function createPublicKeyFingerprint(jwk: JWK): Promise<string> {
  // Create a canonical JSON representation
  const canonical = JSON.stringify({
    kty: jwk.kty,
    crv: jwk.crv,
    x: jwk.x,
  });

  // Hash it to create a fingerprint
  const hash = crypto.createHash("sha256").update(canonical).digest("hex");
  return hash;
}

/**
 * Verify that a fingerprint matches a public key
 */
export async function verifyPublicKeyFingerprint(
  jwk: JWK,
  fingerprint: string,
): Promise<boolean> {
  const computedFingerprint = await createPublicKeyFingerprint(jwk);
  return computedFingerprint === fingerprint;
}
