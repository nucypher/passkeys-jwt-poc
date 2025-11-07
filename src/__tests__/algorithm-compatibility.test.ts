/**
 * Algorithm compatibility tests
 * Tests COSE ↔ JWT algorithm mapping and compatibility scenarios
 */

import { describe, it, expect } from "@jest/globals";
import { coseAlgToJWT, getCoseAlgorithmName, COSE_TO_JWT_ALG } from "@/lib/cose-to-jwt";

describe("Algorithm Compatibility", () => {
  describe("COSE to JWT Mapping", () => {
    it("should map ES256 correctly", () => {
      expect(coseAlgToJWT(-7)).toBe("ES256");
    });

    it("should map EdDSA correctly", () => {
      expect(coseAlgToJWT(-8)).toBe("EdDSA");
    });

    it("should map RS256 correctly", () => {
      expect(coseAlgToJWT(-257)).toBe("RS256");
    });

    it("should map ES384 correctly", () => {
      expect(coseAlgToJWT(-35)).toBe("ES384");
    });

    it("should map ES512 correctly", () => {
      expect(coseAlgToJWT(-36)).toBe("ES512");
    });

    it("should map PS256 correctly", () => {
      expect(coseAlgToJWT(-37)).toBe("PS256");
    });

    it("should throw error for unsupported algorithm", () => {
      expect(() => coseAlgToJWT(999)).toThrow("Unsupported COSE algorithm");
    });
  });

  describe("Algorithm Names", () => {
    it("should provide readable name for ES256", () => {
      const name = getCoseAlgorithmName(-7);
      expect(name).toBe("ECDSA P-256 with SHA-256");
    });

    it("should provide readable name for EdDSA", () => {
      const name = getCoseAlgorithmName(-8);
      expect(name).toBe("EdDSA (Ed25519)");
    });

    it("should provide readable name for RS256", () => {
      const name = getCoseAlgorithmName(-257);
      expect(name).toBe("RSA with SHA-256");
    });

    it("should handle unknown algorithm gracefully", () => {
      const name = getCoseAlgorithmName(999);
      expect(name).toContain("Unknown");
      expect(name).toContain("999");
    });
  });

  describe("Supported Algorithms", () => {
    it("should have ES256 as a supported algorithm", () => {
      expect(COSE_TO_JWT_ALG[-7]).toBe("ES256");
    });

    it("should have RS256 as a supported algorithm", () => {
      expect(COSE_TO_JWT_ALG[-257]).toBe("RS256");
    });

    it("should support all common ECDSA algorithms", () => {
      expect(COSE_TO_JWT_ALG[-7]).toBe("ES256");
      expect(COSE_TO_JWT_ALG[-35]).toBe("ES384");
      expect(COSE_TO_JWT_ALG[-36]).toBe("ES512");
    });

    it("should support all common RSA algorithms", () => {
      expect(COSE_TO_JWT_ALG[-257]).toBe("RS256");
      expect(COSE_TO_JWT_ALG[-258]).toBe("RS384");
      expect(COSE_TO_JWT_ALG[-259]).toBe("RS512");
    });

    it("should support RSA-PSS algorithms", () => {
      expect(COSE_TO_JWT_ALG[-37]).toBe("PS256");
      expect(COSE_TO_JWT_ALG[-38]).toBe("PS384");
      expect(COSE_TO_JWT_ALG[-39]).toBe("PS512");
    });

    it("should support EdDSA", () => {
      expect(COSE_TO_JWT_ALG[-8]).toBe("EdDSA");
    });
  });

  describe("JWT Header Generation", () => {
    it("should generate correct JWT header for ES256 passkey", () => {
      const coseAlg = -7; // ES256
      const jwtAlg = coseAlgToJWT(coseAlg);
      const header = { alg: jwtAlg, typ: "JWT" };
      
      expect(header.alg).toBe("ES256");
      expect(header.typ).toBe("JWT");
      
      // Verify it's a valid JWT header structure
      const headerJson = JSON.stringify(header);
      expect(headerJson).toContain('"alg":"ES256"');
      expect(headerJson).toContain('"typ":"JWT"');
    });

    it("should generate correct JWT header for RS256 passkey", () => {
      const coseAlg = -257; // RS256
      const jwtAlg = coseAlgToJWT(coseAlg);
      const header = { alg: jwtAlg, typ: "JWT" };
      
      expect(header.alg).toBe("RS256");
      expect(header.typ).toBe("JWT");
    });

    it("should generate correct JWT header for EdDSA passkey", () => {
      const coseAlg = -8; // EdDSA
      const jwtAlg = coseAlgToJWT(coseAlg);
      const header = { alg: jwtAlg, typ: "JWT" };
      
      expect(header.alg).toBe("EdDSA");
      expect(header.typ).toBe("JWT");
    });
  });

  describe("Algorithm Compatibility Scenarios", () => {
    it("should handle the default passkey configuration (ES256, RS256)", () => {
      // This is our current supportedAlgorithmIDs: [-7, -257]
      const supportedAlgorithms = [-7, -257];
      
      // Simulate passkey choosing ES256 (most common)
      const selectedAlgorithm = supportedAlgorithms[0];
      const jwtAlg = coseAlgToJWT(selectedAlgorithm);
      
      expect(jwtAlg).toBe("ES256");
      expect(selectedAlgorithm).toBe(-7);
    });

    it("should validate that COSE and JWT names match", () => {
      // For standard algorithms, COSE and JWT use the same names
      const standardAlgorithms = [
        { cose: -7, jwt: "ES256" },
        { cose: -35, jwt: "ES384" },
        { cose: -36, jwt: "ES512" },
        { cose: -8, jwt: "EdDSA" },
        { cose: -257, jwt: "RS256" },
        { cose: -258, jwt: "RS384" },
        { cose: -259, jwt: "RS512" },
        { cose: -37, jwt: "PS256" },
        { cose: -38, jwt: "PS384" },
        { cose: -39, jwt: "PS512" },
      ];

      for (const { cose, jwt } of standardAlgorithms) {
        expect(coseAlgToJWT(cose)).toBe(jwt);
      }
    });
  });

  describe("Real-world Scenarios", () => {
    it("should use correct algorithm from passkey", () => {
      const passkeyAlgorithm = -7; // ES256 (most common)
      const jwtHeader = { alg: coseAlgToJWT(passkeyAlgorithm), typ: "JWT" };
      
      expect(jwtHeader.alg).toBe("ES256");
    });

    it("should handle multiple passkeys with different algorithms", () => {
      const passkey1 = { id: "abc", algorithm: -7 };    // ES256
      const passkey2 = { id: "xyz", algorithm: -257 };  // RS256
      
      expect(coseAlgToJWT(passkey1.algorithm)).toBe("ES256");
      expect(coseAlgToJWT(passkey2.algorithm)).toBe("RS256");
    });
  });
});

