/**
 * Core JWT functionality tests
 * Tests JWT structure, encoding, and basic operations
 */

import { describe, it, expect, beforeAll } from "@jest/globals";
import crypto from "crypto";
import { base64url } from "jose";

describe("JWT Core Functionality", () => {
  describe("JWT Structure", () => {
    it("should create proper JWT structure", () => {
      const header = { alg: "EdDSA", typ: "JWT" };
      const payload = {
        message: "test message",
        nonce: "abc123",
        timestamp: Date.now(),
      };

      const encodedHeader = base64url.encode(
        Buffer.from(JSON.stringify(header))
      );
      const encodedPayload = base64url.encode(
        Buffer.from(JSON.stringify(payload))
      );
      const mockSignature = base64url.encode(Buffer.from("mock-signature"));

      const jwt = `${encodedHeader}.${encodedPayload}.${mockSignature}`;

      const parts = jwt.split(".");
      expect(parts).toHaveLength(3);

      parts.forEach((part) => {
        expect(part).toMatch(/^[A-Za-z0-9_-]+$/);
      });
    });

    it("should parse JWT parts correctly", () => {
      const header = { alg: "EdDSA", typ: "JWT" };
      const payload = { message: "test", nonce: "123" };

      const encodedHeader = base64url.encode(
        Buffer.from(JSON.stringify(header))
      );
      const encodedPayload = base64url.encode(
        Buffer.from(JSON.stringify(payload))
      );

      const decodedHeader = JSON.parse(
        Buffer.from(base64url.decode(encodedHeader)).toString()
      );
      const decodedPayload = JSON.parse(
        Buffer.from(base64url.decode(encodedPayload)).toString()
      );

      expect(decodedHeader).toEqual(header);
      expect(decodedPayload).toEqual(payload);
    });
  });

  describe("Base64url Encoding", () => {
    it("should properly encode and decode with jose", () => {
      const testData = [
        "Simple text",
        "Text with spaces",
        "Unicode: 你好 🌍",
        JSON.stringify({ nested: { object: true } }),
      ];

      testData.forEach((data) => {
        const encoded = base64url.encode(Buffer.from(data));
        const decoded = Buffer.from(base64url.decode(encoded)).toString();

        expect(decoded).toBe(data);
        expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
        expect(encoded).not.toContain("+");
        expect(encoded).not.toContain("/");
        expect(encoded).not.toContain("=");
      });
    });

    it("should create consistent encodings", () => {
      const data = "test data";
      const encoded1 = base64url.encode(Buffer.from(data));
      const encoded2 = base64url.encode(Buffer.from(data));
      expect(encoded1).toBe(encoded2);
    });
  });

  describe("Fingerprint Creation", () => {
    it("should create deterministic SHA-256 fingerprints", () => {
      const data = "test data";
      const hash1 = crypto.createHash("sha256").update(data).digest("hex");
      const hash2 = crypto.createHash("sha256").update(data).digest("hex");
      expect(hash1).toBe(hash2);
    });

    it("should create different fingerprints for different data", () => {
      const data1 = "test data 1";
      const data2 = "test data 2";
      const hash1 = crypto.createHash("sha256").update(data1).digest("hex");
      const hash2 = crypto.createHash("sha256").update(data2).digest("hex");
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("JWT Payload Validation", () => {
    it("should validate that payload changes are detectable", () => {
      const header = { alg: "EdDSA", typ: "JWT" };
      const payload1 = { message: "original", nonce: "123" };
      const payload2 = { message: "modified", nonce: "123" };

      const encodedHeader = base64url.encode(
        Buffer.from(JSON.stringify(header))
      );
      const encodedPayload1 = base64url.encode(
        Buffer.from(JSON.stringify(payload1))
      );
      const encodedPayload2 = base64url.encode(
        Buffer.from(JSON.stringify(payload2))
      );

      expect(encodedPayload1).not.toBe(encodedPayload2);

      const fingerprint1 = crypto
        .createHash("sha256")
        .update(`${encodedHeader}.${encodedPayload1}`)
        .digest("hex");
      const fingerprint2 = crypto
        .createHash("sha256")
        .update(`${encodedHeader}.${encodedPayload2}`)
        .digest("hex");

      expect(fingerprint1).not.toBe(fingerprint2);
    });
  });
});
