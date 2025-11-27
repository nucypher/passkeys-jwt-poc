import { NextRequest, NextResponse } from "next/server";
import { getJWTKeyByCredentialId } from "@/lib/database";

/**
 * Get JWT key information by credential ID
 * Used when logging in to fetch a user's JWT key
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ credentialId: string }> },
) {
  try {
    const { credentialId } = await params;
    const jwtKey = await getJWTKeyByCredentialId(credentialId);

    if (!jwtKey) {
      return NextResponse.json(
        {
          success: false,
          error: "JWT key not found for this credential",
        },
        { status: 404 },
      );
    }

    // Return the key information including private key JWK for session restoration
    return NextResponse.json({
      success: true,
      key: {
        keyId: jwtKey.keyId,
        credentialId: jwtKey.credentialId,
        publicKeyJWK: jwtKey.publicKeyJWK,
        privateKeyJWK: jwtKey.privateKeyJWK,
        publicKeyFingerprint: jwtKey.publicKeyFingerprint,
        createdAt: jwtKey.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching JWT key by credential:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch JWT key",
      },
      { status: 500 },
    );
  }
}
