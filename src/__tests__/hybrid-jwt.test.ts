/**
 * Hybrid JWT System Tests
 * Tests ephemeral key generation, standard JWT signing, and passkey attestation
 */

import { describe, it, expect } from "@jest/globals";
import {
  generateEphemeralKeyPair,
  verifyPublicKeyFingerprint,
  importPublicKeyFromJWK,
} from "@/lib/ephemeral-keys";
import { SignJWT, jwtVerify, decodeProtectedHeader, decodeJwt } from "jose";

describe("Hybrid JWT System", () => {
  describe("Ephemeral Key Generation", () => {
    it("should generate an ephemeral EdDSA key pair", async () => {
      const keyPair = await generateEphemeralKeyPair();

      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.privateKey).toBeDefined();
      expect(keyPair.publicKeyJWK).toBeDefined();
      expect(keyPair.publicKeyFingerprint).toBeDefined();
    });

    it("should generate different keys each time", async () => {
      const keyPair1 = await generateEphemeralKeyPair();
      const keyPair2 = await generateEphemeralKeyPair();

      expect(keyPair1.publicKeyFingerprint).not.toBe(
        keyPair2.publicKeyFingerprint
      );
      expect(keyPair1.publicKeyJWK.x).not.toBe(keyPair2.publicKeyJWK.x);
    });

    it("should create valid JWK format", async () => {
      const keyPair = await generateEphemeralKeyPair();
      const jwk = keyPair.publicKeyJWK;

      expect(jwk.kty).toBe("OKP");
      expect(jwk.crv).toBe("Ed25519");
      expect(jwk.x).toBeDefined();
      expect(typeof jwk.x).toBe("string");
    });

    it("should verify fingerprint matches public key", async () => {
      const keyPair = await generateEphemeralKeyPair();
      const matches = await verifyPublicKeyFingerprint(
        keyPair.publicKeyJWK,
        keyPair.publicKeyFingerprint
      );
      expect(matches).toBe(true);
    });

    it("should detect fingerprint mismatch", async () => {
      const keyPair = await generateEphemeralKeyPair();
      const fakeFingerprint =
        "0000000000000000000000000000000000000000000000000000000000000000";
      const matches = await verifyPublicKeyFingerprint(
        keyPair.publicKeyJWK,
        fakeFingerprint
      );
      expect(matches).toBe(false);
    });
  });

  describe("Standard JWT Signing with Ephemeral Keys", () => {
    it("should sign JWT with ephemeral private key using jose.SignJWT", async () => {
      const keyPair = await generateEphemeralKeyPair();
      const payload = {
        message: "test message",
        nonce: "test-nonce",
        timestamp: Date.now(),
        epk: keyPair.publicKeyJWK,
      };

      const jwt = await new SignJWT(payload)
        .setProtectedHeader({ alg: "EdDSA", typ: "JWT" })
        .setIssuedAt()
        .sign(keyPair.privateKey);

      const parts = jwt.split(".");
      expect(parts.length).toBe(3);
    });

    it("should verify JWT signature with ephemeral public key using jose.jwtVerify", async () => {
      const keyPair = await generateEphemeralKeyPair();
      const payload = {
        message: "test message",
        nonce: "test-nonce",
        timestamp: Date.now(),
        epk: keyPair.publicKeyJWK,
      };

      const jwt = await new SignJWT(payload)
        .setProtectedHeader({ alg: "EdDSA", typ: "JWT" })
        .setIssuedAt()
        .sign(keyPair.privateKey);

      const importedKey = await importPublicKeyFromJWK(keyPair.publicKeyJWK);
      const verifyResult = await jwtVerify(jwt, importedKey, {
        algorithms: ["EdDSA"],
      });

      expect(verifyResult.payload.message).toBe("test message");
      expect(verifyResult.payload.nonce).toBe("test-nonce");
      expect(verifyResult.protectedHeader.alg).toBe("EdDSA");
    });

    it("should verify JWT using public key from payload", async () => {
      const keyPair = await generateEphemeralKeyPair();
      const payload = {
        message: "important data",
        epk: keyPair.publicKeyJWK,
      };

      const jwt = await new SignJWT(payload)
        .setProtectedHeader({ alg: "EdDSA", typ: "JWT" })
        .sign(keyPair.privateKey);

      // Extract public key from payload
      const parts = jwt.split(".");
      const payloadJson = Buffer.from(parts[1], "base64url").toString("utf-8");
      const decodedPayload = JSON.parse(payloadJson);

      expect(decodedPayload.epk).toBeDefined();

      const publicKey = await importPublicKeyFromJWK(decodedPayload.epk);
      const result = await jwtVerify(jwt, publicKey, {
        algorithms: ["EdDSA"],
      });

      expect(result.payload.message).toBe("important data");
    });

    it("should fail verification with wrong public key", async () => {
      const keyPair1 = await generateEphemeralKeyPair();
      const keyPair2 = await generateEphemeralKeyPair();

      const jwt = await new SignJWT({ message: "test" })
        .setProtectedHeader({ alg: "EdDSA", typ: "JWT" })
        .sign(keyPair1.privateKey);

      const wrongKey = await importPublicKeyFromJWK(keyPair2.publicKeyJWK);

      await expect(
        jwtVerify(jwt, wrongKey, { algorithms: ["EdDSA"] })
      ).rejects.toThrow();
    });
  });

  describe("Complete Hybrid Flow", () => {
    it("should demonstrate the complete flow", async () => {
      // Step 1: Generate ephemeral key pair
      const ephemeralKeys = await generateEphemeralKeyPair();

      // Step 2: Create JWT payload with passkey attestation
      const payload = {
        message: "This is secure data",
        nonce: "unique-nonce-123",
        timestamp: Date.now(),
        epk: ephemeralKeys.publicKeyJWK,
        passkey_attestation: {
          credential_id: "mock-credential-id",
          fingerprint: ephemeralKeys.publicKeyFingerprint,
          signature: "mock-passkey-signature",
        },
      };

      // Step 3: Sign JWT with ephemeral private key
      const jwt = await new SignJWT(payload)
        .setProtectedHeader({ alg: "EdDSA", typ: "JWT" })
        .setIssuedAt()
        .sign(ephemeralKeys.privateKey);

      // Step 4: Verify JWT (Stage 1 - Standard JWT Verification)
      const publicKey = await importPublicKeyFromJWK(
        ephemeralKeys.publicKeyJWK
      );
      const jwtResult = await jwtVerify(jwt, publicKey, {
        algorithms: ["EdDSA"],
      });

      // Step 5: Verify passkey attestation (Stage 2)
      const fingerprintMatches = await verifyPublicKeyFingerprint(
        payload.epk,
        payload.passkey_attestation.fingerprint
      );

      expect(jwtResult.payload.message).toBe("This is secure data");
      expect(fingerprintMatches).toBe(true);
    });
  });

  describe("JWT Structure and Interoperability", () => {
    it("should create standard JWT format", async () => {
      const keyPair = await generateEphemeralKeyPair();
      const jwt = await new SignJWT({
        message: "hello",
        epk: keyPair.publicKeyJWK,
      })
        .setProtectedHeader({ alg: "EdDSA", typ: "JWT" })
        .setIssuedAt()
        .sign(keyPair.privateKey);

      const parts = jwt.split(".");
      expect(parts.length).toBe(3);
      expect(parts[0]).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(parts[1]).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(parts[2]).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("should be decodable with jose functions", async () => {
      const keyPair = await generateEphemeralKeyPair();
      const payload = {
        sub: "user123",
        data: "test data",
        epk: keyPair.publicKeyJWK,
      };

      const jwt = await new SignJWT(payload)
        .setProtectedHeader({ alg: "EdDSA", typ: "JWT" })
        .sign(keyPair.privateKey);

      const header = decodeProtectedHeader(jwt);
      const decodedPayload = decodeJwt(jwt);

      expect(header.alg).toBe("EdDSA");
      expect(header.typ).toBe("JWT");
      expect(decodedPayload.sub).toBe("user123");
      expect(decodedPayload.data).toBe("test data");
    });
  });
});
