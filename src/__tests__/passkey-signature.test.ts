/**
 * Multi-Signature Statement System Tests
 *
 * Tests the complete workflow:
 * 1. JWT signing key is generated
 * 2. Passkey attests the JWT signing key (one-time setup)
 * 3. JWT signing key signs statements (many times, no passkey needed)
 * 4. Passkey attestation stored in DB proves key legitimacy
 */

import { describe, it, expect, afterAll } from "@jest/globals";
import {
  generateJWTKeyPair,
  verifyPublicKeyFingerprint,
} from "@/lib/jwt-key-registration";
import {
  verifyPasskeyJWT,
  inspectPasskeyJWT,
} from "@/lib/jwt-passkey-verifier";
import {
  saveJWTKey,
  getJWTKey,
  getJWTKeyByCredentialId,
  deleteTestDatabase,
} from "@/lib/database";
import { SignJWT, jwtVerify, importJWK } from "jose";

describe("Multi-Signature Statement System", () => {
  beforeEach(async () => {
    // Clear database before each test
    const { getDatabase } = await import("@/lib/database");
    const db = await getDatabase();
    db.exec("DELETE FROM statement_signatures");
    db.exec("DELETE FROM statements");
    db.exec("DELETE FROM attested_jwt_keys");
    db.exec("DELETE FROM users");
    db.exec("DELETE FROM passkey_credentials");
  });

  afterAll(async () => {
    await deleteTestDatabase();
  });

  describe("JWT Key Generation", () => {
    it("should generate a JWT signing key pair", async () => {
      const jwtKey = await generateJWTKeyPair();

      expect(jwtKey.publicKey).toBeDefined();
      expect(jwtKey.privateKey).toBeDefined();
      expect(jwtKey.publicKeyJWK).toBeDefined();
      expect(jwtKey.publicKeyFingerprint).toBeDefined();
      expect(jwtKey.keyId).toBeDefined();

      console.log("✅ Generated JWT signing key pair");
      console.log("   Key ID:", jwtKey.keyId);
      console.log("   JWK:", jwtKey.publicKeyJWK);
      console.log("   Fingerprint:", jwtKey.publicKeyFingerprint);
    });

    it("should generate different keys each time", async () => {
      const key1 = await generateJWTKeyPair();
      const key2 = await generateJWTKeyPair();

      expect(key1.keyId).not.toBe(key2.keyId);
      expect(key1.publicKeyFingerprint).not.toBe(key2.publicKeyFingerprint);
      expect(key1.publicKeyJWK.x).not.toBe(key2.publicKeyJWK.x);

      console.log("✅ Each key is unique");
    });

    it("should verify fingerprint matches public key", async () => {
      const jwtKey = await generateJWTKeyPair();

      const matches = await verifyPublicKeyFingerprint(
        jwtKey.publicKeyJWK,
        jwtKey.publicKeyFingerprint,
      );

      expect(matches).toBe(true);

      console.log("✅ Fingerprint verification works");
    });

    it("should detect fingerprint mismatch", async () => {
      const jwtKey = await generateJWTKeyPair();
      const fakeFingerprint =
        "0000000000000000000000000000000000000000000000000000000000000000";

      const matches = await verifyPublicKeyFingerprint(
        jwtKey.publicKeyJWK,
        fakeFingerprint,
      );

      expect(matches).toBe(false);

      console.log("✅ Fingerprint mismatch detection works");
    });
  });

  describe("JWT Key Storage", () => {
    it("should save and retrieve JWT key", async () => {
      const jwtKey = await generateJWTKeyPair();
      const credentialId = "test-credential-123";
      const mockAttestation = JSON.stringify({ mock: "attestation" });

      // Create credential first (foreign key requirement)
      const { saveCredential } = await import("@/lib/database");
      await saveCredential(credentialId, "mock-public-key", 0, [], -7);

      await saveJWTKey(
        jwtKey.keyId,
        credentialId,
        JSON.stringify(jwtKey.publicKeyJWK),
        jwtKey.publicKeyFingerprint,
        mockAttestation,
      );

      console.log("✅ JWT key saved to database");

      const retrieved = await getJWTKey(jwtKey.keyId);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.keyId).toBe(jwtKey.keyId);
      expect(retrieved?.credentialId).toBe(credentialId);
      expect(retrieved?.publicKeyJWK).toEqual(jwtKey.publicKeyJWK);
      expect(retrieved?.publicKeyFingerprint).toBe(jwtKey.publicKeyFingerprint);

      console.log("✅ JWT key retrieved from database");
    });

    it("should retrieve JWT key by credential ID", async () => {
      const jwtKey = await generateJWTKeyPair();
      const credentialId = "test-credential-456";
      const mockAttestation = JSON.stringify({ mock: "attestation" });

      // Create credential first (foreign key requirement)
      const { saveCredential } = await import("@/lib/database");
      await saveCredential(credentialId, "mock-public-key", 0, [], -7);

      await saveJWTKey(
        jwtKey.keyId,
        credentialId,
        JSON.stringify(jwtKey.publicKeyJWK),
        jwtKey.publicKeyFingerprint,
        mockAttestation,
      );

      const retrieved = await getJWTKeyByCredentialId(credentialId);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.credentialId).toBe(credentialId);
      expect(retrieved?.keyId).toBe(jwtKey.keyId);

      console.log("✅ JWT key retrieved by credential ID");
    });
  });

  describe("JWT Signing with Registered Key", () => {
    it("should sign JWT with registered key (no passkey needed)", async () => {
      const jwtKey = await generateJWTKeyPair();

      const payload = {
        message: "test message",
        timestamp: Date.now(),
      };

      console.log("\n📝 Signing JWT with registered key...");
      console.log("   Key ID:", jwtKey.keyId);
      console.log("   NO passkey interaction!");

      // Sign JWT with JWT private key
      const jwt = await new SignJWT(payload)
        .setProtectedHeader({
          alg: "EdDSA",
          typ: "JWT",
          kid: jwtKey.keyId,
        })
        .setIssuedAt()
        .sign(jwtKey.privateKey);

      console.log("✅ JWT signed");
      console.log("   JWT:", jwt.substring(0, 100) + "...");

      // Verify JWT structure
      const parts = jwt.split(".");
      expect(parts.length).toBe(3);

      // Verify header has kid
      const inspection = inspectPasskeyJWT(jwt);
      expect(inspection.keyId).toBe(jwtKey.keyId);
      expect(inspection.algorithm).toBe("EdDSA");

      console.log("✅ JWT structure valid");
      console.log("   Has kid in header");
      console.log("   Algorithm: EdDSA");
    });

    it("should sign multiple JWTs with same key", async () => {
      const jwtKey = await generateJWTKeyPair();

      console.log("\n📝 Signing multiple JWTs with same key...");

      const jwts = [];
      for (let i = 0; i < 3; i++) {
        const jwt = await new SignJWT({
          message: `message ${i}`,
        })
          .setProtectedHeader({
            alg: "EdDSA",
            typ: "JWT",
            kid: jwtKey.keyId,
          })
          .sign(jwtKey.privateKey);

        jwts.push(jwt);
      }

      console.log(`✅ Signed ${jwts.length} JWTs with same key`);
      console.log("   All use kid:", jwtKey.keyId);

      // All should have same kid
      jwts.forEach((jwt) => {
        const inspection = inspectPasskeyJWT(jwt);
        expect(inspection.keyId).toBe(jwtKey.keyId);
      });

      console.log("✅ All JWTs reference same key");
    });
  });

  describe("Passkey JWT Verification", () => {
    it("should verify JWT with standard jose.jwtVerify", async () => {
      const jwtKey = await generateJWTKeyPair();

      const payload = { message: "test" };

      const jwt = await new SignJWT(payload)
        .setProtectedHeader({
          alg: "EdDSA",
          typ: "JWT",
          kid: jwtKey.keyId,
        })
        .sign(jwtKey.privateKey);

      console.log("\n🔍 Verifying JWT with jose.jwtVerify...");

      // Standard JWT verification
      const publicKey = await importJWK(jwtKey.publicKeyJWK, "EdDSA");
      const result = await jwtVerify(jwt, publicKey, {
        algorithms: ["EdDSA"],
      });

      expect(result.payload.message).toBe("test");

      console.log("✅ JWT verified with standard jose.jwtVerify()");
      console.log("   This proves it's a STANDARD JWT!");
    });

    it("should verify JWT with passkey verifier (mock DB)", async () => {
      const jwtKey = await generateJWTKeyPair();
      const credentialId = "test-credential-789";
      const mockAttestation = JSON.stringify({
        id: credentialId,
        response: { signature: "mock" },
      });

      // Create credential first (foreign key requirement)
      const { saveCredential } = await import("@/lib/database");
      await saveCredential(credentialId, "mock-public-key", 0, [], -7);

      // Save JWT key to DB
      await saveJWTKey(
        jwtKey.keyId,
        credentialId,
        JSON.stringify(jwtKey.publicKeyJWK),
        jwtKey.publicKeyFingerprint,
        mockAttestation,
      );

      // Sign JWT
      const payload = {
        message: "unique message",
        timestamp: Date.now(),
      };

      const jwt = await new SignJWT(payload)
        .setProtectedHeader({
          alg: "EdDSA",
          typ: "JWT",
          kid: jwtKey.keyId,
        })
        .setIssuedAt()
        .sign(jwtKey.privateKey);

      console.log("\n🔍 Verifying JWT with passkey verifier...");

      // Verify using passkey verifier
      const result = await verifyPasskeyJWT(jwt);

      expect(result.valid).toBe(true);
      expect(result.jwtVerified).toBe(true);
      expect(result.keyAuthorized).toBe(true);
      expect(result.keyId).toBe(jwtKey.keyId);
      expect(result.credentialId).toBe(credentialId);

      console.log("✅ JWT verified with passkey verifier");
      console.log("   JWT signature verified:", result.jwtVerified);
      console.log("   Key authorized:", result.keyAuthorized);
    });

    it("should fail verification if key not in DB", async () => {
      const jwtKey = await generateJWTKeyPair();

      const jwt = await new SignJWT({ message: "test" })
        .setProtectedHeader({
          alg: "EdDSA",
          typ: "JWT",
          kid: jwtKey.keyId, // Key NOT in DB
        })
        .sign(jwtKey.privateKey);

      console.log("\n🔍 Verifying JWT with unregistered key...");

      const result = await verifyPasskeyJWT(jwt);

      expect(result.valid).toBe(false);
      expect(result.jwtVerified).toBe(false);
      expect(result.keyAuthorized).toBe(false);
      expect(result.error).toContain("JWT key not found");

      console.log("✅ Correctly rejects unregistered key");
    });

    it("should fail verification with invalid signature", async () => {
      const jwtKey = await generateJWTKeyPair();
      const credentialId = "test-credential-999";
      const mockAttestation = JSON.stringify({ mock: "attestation" });

      // Create credential first (foreign key requirement)
      const { saveCredential } = await import("@/lib/database");
      await saveCredential(credentialId, "mock-public-key", 0, [], -7);

      // Save JWT key to DB
      await saveJWTKey(
        jwtKey.keyId,
        credentialId,
        JSON.stringify(jwtKey.publicKeyJWK),
        jwtKey.publicKeyFingerprint,
        mockAttestation,
      );

      // Create JWT with different key (invalid signature)
      const differentKey = await generateJWTKeyPair();

      const jwt = await new SignJWT({ message: "test" })
        .setProtectedHeader({
          alg: "EdDSA",
          typ: "JWT",
          kid: jwtKey.keyId, // Claims to use jwtKey
        })
        .sign(differentKey.privateKey); // But signed with different key!

      console.log("\n🔍 Verifying JWT with invalid signature...");

      const result = await verifyPasskeyJWT(jwt);

      expect(result.valid).toBe(false);
      expect(result.keyAuthorized).toBe(true); // Key exists
      expect(result.jwtVerified).toBe(false); // But signature is wrong

      console.log("✅ Correctly rejects invalid signature");
    });
  });

  describe("Complete Flow", () => {
    it("should demonstrate the complete passkey signature flow", async () => {
      console.log("\n📋 COMPLETE PASSKEY SIGNATURE FLOW:");
      console.log("═══════════════════════════════════════════════");

      // Step 1: Generate JWT key
      console.log("\n1️⃣  Generate JWT signing key");
      const jwtKey = await generateJWTKeyPair();
      console.log("   ✅ Key pair generated");
      console.log("   Key ID:", jwtKey.keyId);

      // Step 2: Register with passkey (simulated)
      console.log("\n2️⃣  Register JWT key with passkey attestation");
      const credentialId = "test-passkey-complete";
      const mockAttestation = JSON.stringify({
        id: credentialId,
        response: {
          signature: "passkey-signed-fingerprint",
        },
      });

      // Create credential first (foreign key requirement)
      const { saveCredential } = await import("@/lib/database");
      await saveCredential(credentialId, "mock-public-key", 0, [], -7);

      await saveJWTKey(
        jwtKey.keyId,
        credentialId,
        JSON.stringify(jwtKey.publicKeyJWK),
        jwtKey.publicKeyFingerprint,
        mockAttestation,
      );
      console.log("   ✅ JWT key registered");
      console.log("   Passkey attested key:", credentialId);

      // Step 3: Sign multiple JWTs (no passkey!)
      console.log("\n3️⃣  Sign JWTs with JWT private key (NO passkey!)");
      const jwts = [];
      for (let i = 0; i < 3; i++) {
        const jwt = await new SignJWT({
          statementId: "stmt-complete",
          content: `Test statement ${i}`,
          signer: "test-user",
          timestamp: Date.now(),
        })
          .setProtectedHeader({
            alg: "EdDSA",
            typ: "JWT",
            kid: jwtKey.keyId,
          })
          .setIssuedAt()
          .sign(jwtKey.privateKey);

        jwts.push(jwt);
      }
      console.log(`   ✅ Signed ${jwts.length} JWTs`);
      console.log("   NO passkey interaction needed!");

      // Step 4: Verify JWTs
      console.log("\n4️⃣  Verify JWTs");
      for (const jwt of jwts) {
        const result = await verifyPasskeyJWT(jwt);
        expect(result.valid).toBe(true);
        expect(result.jwtVerified).toBe(true);
        expect(result.keyAuthorized).toBe(true);
      }
      console.log(`   ✅ All ${jwts.length} JWTs verified`);

      console.log("\n🎉 COMPLETE FLOW SUCCESS!");
      console.log("   ✅ Registered once with passkey");
      console.log("   ✅ Signed multiple JWTs without passkey");
      console.log("   ✅ All JWTs verified successfully");
      console.log("   ✅ Passkey attestation stored separately");
    });
  });
});
