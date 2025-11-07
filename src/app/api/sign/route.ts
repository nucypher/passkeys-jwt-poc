import { NextRequest, NextResponse } from "next/server";
import { saveSignature } from "@/lib/database";

/**
 * Save a JWT signed with ephemeral key + passkey attestation
 *
 * The JWT is already fully formed and signed client-side.
 * We just save it to the database for record-keeping.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jwt, credentialId } = body as {
      jwt: string;
      credentialId: string;
    };

    if (!jwt || !credentialId) {
      return NextResponse.json(
        { error: "JWT and credentialId are required" },
        { status: 400 }
      );
    }

    console.log("💾 Saving JWT to database...");
    console.log("   Credential ID:", credentialId);
    console.log("   JWT length:", jwt.length, "characters");

    // Parse JWT to get payload for storage
    const parts = jwt.split(".");
    if (parts.length !== 3) {
      return NextResponse.json(
        { error: "Invalid JWT format" },
        { status: 400 }
      );
    }

    const payloadJson = Buffer.from(parts[1], "base64url").toString("utf-8");
    const payload = JSON.parse(payloadJson);

    // Save to database
    // Note: We save the JWT signature part (parts[2]) as the signature
    const signatureId = await saveSignature(
      credentialId,
      JSON.stringify(payload),
      parts[2], // JWT signature
      jwt // Full JWT
    );

    console.log("✅ JWT saved successfully");
    console.log("   Signature ID:", signatureId);

    return NextResponse.json({
      success: true,
      signatureId: signatureId.toString(),
      message: "JWT saved successfully",
    });
  } catch (error) {
    console.error("❌ Error saving JWT:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to save JWT",
      },
      { status: 500 }
    );
  }
}
