import { NextRequest, NextResponse } from "next/server";
import { getJWTKey } from "@/lib/database";

/**
 * Get JWT key information by key ID
 * Used during JWT verification to lookup the public key
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: keyId } = await params;
    const jwtKey = await getJWTKey(keyId);

    if (!jwtKey) {
      return NextResponse.json({ error: "JWT key not found" }, { status: 404 });
    }

    // Return public information (not the private key or attestation details)
    return NextResponse.json({
      keyId: jwtKey.keyId,
      publicKeyJWK: jwtKey.publicKeyJWK,
      publicKeyFingerprint: jwtKey.publicKeyFingerprint,
      passkeyAttestation: {
        id: jwtKey.passkeyAttestation.id,
        rawId: jwtKey.passkeyAttestation.rawId,
        response: jwtKey.passkeyAttestation.response,
        type: jwtKey.passkeyAttestation.type,
      },
      passkeyPublicKey: jwtKey.passkeyPublicKey,
    });
  } catch (error) {
    console.error("❌ Error fetching JWT key:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch JWT key",
      },
      { status: 500 },
    );
  }
}
