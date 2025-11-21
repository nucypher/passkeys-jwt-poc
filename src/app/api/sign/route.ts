import { NextRequest, NextResponse } from "next/server";
import { saveSignature } from "@/lib/database";

/**
 * Save a JWT signed with a registered JWT key
 *
 * The JWT is already fully formed and signed client-side.
 * We just save it to the database for record-keeping.
 *
 * Note: We don't verify here - verification happens at /api/validate
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jwt, keyId } = body as {
      jwt: string;
      keyId: string;
    };

    if (!jwt || !keyId) {
      return NextResponse.json(
        { error: "JWT and keyId are required" },
        { status: 400 }
      );
    }

    console.log("💾 Saving JWT to database...");
    console.log("   Key ID:", keyId);
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
    const signatureId = await saveSignature(
      keyId,
      JSON.stringify(payload),
      parts[2], // JWT signature
      jwt // Full JWT
    );

    console.log("✅ JWT saved successfully");
    console.log("   Signature ID:", signatureId);

    return NextResponse.json({
      success: true,
      signatureId: signatureId.toString(),
      keyId,
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
