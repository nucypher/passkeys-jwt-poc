/**
 * COSE Algorithm Identifier to JWT "alg" Header Mapping
 *
 * COSE (CBOR Object Signing and Encryption) algorithm identifiers are used
 * in WebAuthn, while JWT uses string-based algorithm names.
 *
 * Reference: https://www.iana.org/assignments/cose/cose.xhtml
 */

export const COSE_TO_JWT_ALG: Record<number, string> = {
  // ECDSA with SHA-256/384/512
  "-7": "ES256", // ECDSA with P-256 curve and SHA-256
  "-35": "ES384", // ECDSA with P-384 curve and SHA-384
  "-36": "ES512", // ECDSA with P-521 curve and SHA-512

  // EdDSA
  "-8": "EdDSA", // Edwards-curve Digital Signature Algorithm (Ed25519/Ed448)

  // RSASSA-PKCS1-v1_5
  "-257": "RS256", // RSA with SHA-256
  "-258": "RS384", // RSA with SHA-384
  "-259": "RS512", // RSA with SHA-512

  // RSASSA-PSS
  "-37": "PS256", // RSA-PSS with SHA-256
  "-38": "PS384", // RSA-PSS with SHA-384
  "-39": "PS512", // RSA-PSS with SHA-512
};

/**
 * Convert COSE algorithm identifier to JWT "alg" header value
 * @param coseAlg COSE algorithm identifier (e.g., -7 for ES256)
 * @returns JWT algorithm name (e.g., "ES256")
 * @throws Error if algorithm is not supported
 */
export function coseAlgToJWT(coseAlg: number): string {
  const jwtAlg = COSE_TO_JWT_ALG[coseAlg];
  if (!jwtAlg) {
    throw new Error(
      `Unsupported COSE algorithm: ${coseAlg}. ` +
        `Supported algorithms: ${Object.keys(COSE_TO_JWT_ALG).join(", ")}`,
    );
  }
  return jwtAlg;
}

/**
 * Get human-readable name for COSE algorithm
 */
export function getCoseAlgorithmName(coseAlg: number): string {
  const names: Record<number, string> = {
    "-7": "ECDSA P-256 with SHA-256",
    "-8": "EdDSA (Ed25519)",
    "-35": "ECDSA P-384 with SHA-384",
    "-36": "ECDSA P-521 with SHA-512",
    "-37": "RSA-PSS with SHA-256",
    "-38": "RSA-PSS with SHA-384",
    "-39": "RSA-PSS with SHA-512",
    "-257": "RSA with SHA-256",
    "-258": "RSA with SHA-384",
    "-259": "RSA with SHA-512",
  };

  return names[coseAlg] || `Unknown algorithm (${coseAlg})`;
}
