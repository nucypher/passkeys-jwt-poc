/**
 * Ephemeral Key Management for JWT Signing
 * 
 * This module handles the generation of ephemeral EdDSA key pairs
 * that are used to sign JWTs. Each JWT gets a new key pair, and the
 * public key is attested by a WebAuthn passkey.
 */

import { exportJWK, importJWK, type JWK } from "jose";

export interface EphemeralKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  publicKeyJWK: JWK;
  publicKeyFingerprint: string;
}

/**
 * Generate an ephemeral EdDSA (Ed25519) key pair
 * This key pair is generated fresh for each JWT and discarded after use
 */
export async function generateEphemeralKeyPair(): Promise<EphemeralKeyPair> {
  // Generate Ed25519 key pair using Web Crypto API
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "Ed25519",
    } as EcKeyGenParams,
    true, // extractable (we need to export the public key)
    ["sign", "verify"]
  );

  if (!keyPair.publicKey || !keyPair.privateKey) {
    throw new Error("Failed to generate key pair");
  }

  // Export public key as JWK (JSON Web Key format)
  const publicKeyJWK = await exportJWK(keyPair.publicKey);

  // Create a fingerprint of the public key (for passkey to sign)
  // This is a canonical representation that can be verified
  const publicKeyFingerprint = await createPublicKeyFingerprint(publicKeyJWK);

  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
    publicKeyJWK,
    publicKeyFingerprint,
  };
}

/**
 * Create a canonical fingerprint of a public key
 * This is what the passkey will sign to attest the ephemeral key
 */
async function createPublicKeyFingerprint(jwk: JWK): Promise<string> {
  // Create a canonical JSON representation
  const canonical = JSON.stringify({
    kty: jwk.kty,
    crv: jwk.crv,
    x: jwk.x,
    // Only include the public key components
  });

  // Hash it to create a fingerprint
  const encoder = new TextEncoder();
  const data = encoder.encode(canonical);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  
  // Convert to base64url
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Import a public key from JWK format
 * Used during verification to import the ephemeral public key
 */
export async function importPublicKeyFromJWK(jwk: JWK): Promise<CryptoKey> {
  return await importJWK(jwk, "EdDSA");
}

/**
 * Verify that a fingerprint matches a public key
 */
export async function verifyPublicKeyFingerprint(
  jwk: JWK,
  fingerprint: string
): Promise<boolean> {
  const computedFingerprint = await createPublicKeyFingerprint(jwk);
  return computedFingerprint === fingerprint;
}

