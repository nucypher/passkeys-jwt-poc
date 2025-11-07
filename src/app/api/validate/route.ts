import { NextRequest, NextResponse } from "next/server";
import {
  verifyHybridJWT,
  verifyJWTSignatureOnly,
} from "@/lib/jwt-hybrid-verifier";
import { decodeProtectedHeader, decodeJwt } from "jose";
import { headers } from "next/headers";

/**
 * Validate a JWT with two-stage verification:
 * 1. Standard JWT signature verification (with ephemeral key)
 * 2. Passkey attestation verification (of ephemeral key)
 *
 * Supports modes:
 * - full: Both stages (default)
 * - jwt_only: Only stage 1 (demonstrates standard JWT verification)
 * - inspect: Just decode, no verification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jwt, mode = "full" } = body as {
      jwt: string;
      mode?: "full" | "jwt_only" | "inspect";
    };

    if (!jwt) {
      return NextResponse.json({ error: "JWT is required" }, { status: 400 });
    }

    // Inspect mode: just decode without verification
    if (mode === "inspect") {
      const header = decodeProtectedHeader(jwt);
      const payload = decodeJwt(jwt);

      return NextResponse.json({
        mode: "inspection",
        header,
        payload,
        note: "JWT decoded using jose library (no verification performed)",
      });
    }

    // JWT-only mode: verify JWT signature only (Stage 1)
    if (mode === "jwt_only") {
      console.log("🔍 JWT-only verification (Stage 1 only)...");
      const result = await verifyJWTSignatureOnly(jwt);

      return NextResponse.json({
        mode: "jwt_only",
        jwt_verified: result.valid,
        passkey_verified: null,
        valid: result.valid,
        payload: result.payload,
        header: result.header,
        error: result.error,
        note: "This demonstrates that the JWT can be verified with standard jose.jwtVerify()",
      });
    }

    // Full mode: two-stage verification (default)
    console.log("🔍 Full two-stage verification...");

    // Get origin from headers
    const headersList = await headers();
    const host = headersList.get("host") || "localhost:3000";
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const origin = `${protocol}://${host}`;

    const result = await verifyHybridJWT(jwt, origin);

    if (!result.valid) {
      return NextResponse.json(
        {
          valid: false,
          jwt_verified: result.jwt_verified,
          passkey_verified: result.passkey_verified,
          error: result.error,
          details: result.details,
        },
        { status: 200 } // Return 200 but with valid: false
      );
    }

    return NextResponse.json({
      valid: true,
      jwt_verified: result.jwt_verified,
      passkey_verified: result.passkey_verified,
      credential_id: result.credential_id,
      payload: result.payload,
      header: result.header,
      details: result.details,
      note: "JWT verified with two-stage verification: standard JWT + passkey attestation",
    });
  } catch (error) {
    console.error("❌ Error validating JWT:", error);
    return NextResponse.json(
      {
        valid: false,
        error:
          error instanceof Error ? error.message : "Failed to validate JWT",
      },
      { status: 500 }
    );
  }
}
