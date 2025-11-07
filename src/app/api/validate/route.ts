import { NextRequest, NextResponse } from "next/server";
import {
  verifyDetachedJWT,
  inspectDetachedJWT,
} from "@/lib/jwt-detached-verifier";

/**
 * Validate a JWT signed with a registered JWT key
 *
 * This uses the detached signature approach:
 * 1. Extract kid from JWT header
 * 2. Lookup JWT public key in DB
 * 3. Verify JWT signature
 * 4. Confirm key is authorized (has passkey attestation)
 *
 * Modes:
 * - full: Complete verification (default)
 * - inspect: Just decode without verification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jwt, mode = "full" } = body as {
      jwt: string;
      mode?: "full" | "inspect";
    };

    if (!jwt) {
      return NextResponse.json({ error: "JWT is required" }, { status: 400 });
    }

    // Inspect mode: just decode without verification
    if (mode === "inspect") {
      const inspection = inspectDetachedJWT(jwt);

      return NextResponse.json({
        mode: "inspection",
        ...inspection,
        note: "JWT decoded without verification",
      });
    }

    // Full mode: complete verification
    console.log("🔍 Verifying JWT with detached signature...");

    const result = await verifyDetachedJWT(jwt);

    if (!result.valid) {
      return NextResponse.json(
        {
          valid: false,
          jwtVerified: result.jwtVerified,
          keyAuthorized: result.keyAuthorized,
          error: result.error,
          details: result.details,
        },
        { status: 200 } // Return 200 but with valid: false
      );
    }

    return NextResponse.json({
      valid: true,
      jwtVerified: result.jwtVerified,
      keyAuthorized: result.keyAuthorized,
      keyId: result.keyId,
      credentialId: result.credentialId,
      payload: result.payload,
      header: result.header,
      details: result.details,
      verificationMethod: "detached signature",
      note: "JWT verified with registered key (passkey-attested)",
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
