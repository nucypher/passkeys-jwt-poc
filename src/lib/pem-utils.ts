/**
 * PEM Format Utilities
 *
 * Converts JWK (JSON Web Key) format to PEM format for display purposes.
 * Both formats are stored in the database:
 * - JWK: Used for signing and verification
 * - PEM: Used for user-friendly display
 */

import { type JWK } from "jose";

/**
 * Convert a JWK public key to PEM format
 * Supports Ed25519 keys (EdDSA algorithm)
 */
export function jwkToPem(jwk: JWK): string {
  if (jwk.kty === "OKP" && jwk.crv === "Ed25519" && jwk.x) {
    // Ed25519 public key
    // The 'x' parameter contains the base64url-encoded public key
    const publicKeyBytes = base64UrlToBytes(jwk.x);
    const base64Key = bytesToBase64(publicKeyBytes);

    return `-----BEGIN PUBLIC KEY-----\n${formatBase64(base64Key)}\n-----END PUBLIC KEY-----`;
  }

  throw new Error(`Unsupported key type: ${jwk.kty} ${jwk.crv}`);
}

/**
 * Convert base64url to bytes
 */
function base64UrlToBytes(base64url: string): Uint8Array {
  // Convert base64url to base64
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  // Pad if necessary
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );

  // Decode base64 to bytes
  const binaryString = atob(padded);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
}

/**
 * Convert bytes to base64
 */
function bytesToBase64(bytes: Uint8Array): string {
  const binaryString = Array.from(bytes)
    .map((byte) => String.fromCharCode(byte))
    .join("");
  return btoa(binaryString);
}

/**
 * Format base64 string into 64-character lines for PEM format
 */
function formatBase64(base64: string): string {
  const lines: string[] = [];
  for (let i = 0; i < base64.length; i += 64) {
    lines.push(base64.substring(i, i + 64));
  }
  return lines.join("\n");
}

/**
 * Server-side version using Node.js crypto
 * Use this in API routes and server components
 */
export function jwkToPemServer(jwk: JWK): string {
  if (jwk.kty === "OKP" && jwk.crv === "Ed25519" && jwk.x) {
    // Ed25519 public key - 32 bytes
    const publicKeyBuffer = Buffer.from(jwk.x, "base64url");

    // ASN.1 DER encoding for Ed25519 public key
    // SubjectPublicKeyInfo structure
    const header = Buffer.from([
      0x30,
      0x2a, // SEQUENCE, 42 bytes
      0x30,
      0x05, // SEQUENCE, 5 bytes (algorithm identifier)
      0x06,
      0x03,
      0x2b,
      0x65,
      0x70, // OID 1.3.101.112 (Ed25519)
      0x03,
      0x21, // BIT STRING, 33 bytes
      0x00, // No padding
    ]);

    const derKey = Buffer.concat([header, publicKeyBuffer]);
    const base64Key = derKey.toString("base64");

    return `-----BEGIN PUBLIC KEY-----\n${formatBase64(base64Key)}\n-----END PUBLIC KEY-----`;
  }

  throw new Error(`Unsupported key type: ${jwk.kty} ${jwk.crv}`);
}
