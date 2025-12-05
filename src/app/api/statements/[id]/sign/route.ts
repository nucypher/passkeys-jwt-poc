import { NextRequest, NextResponse } from "next/server";
import { signStatement } from "@/lib/statements";
import { verifyPasskeyJWT } from "@/lib/jwt-passkey-verifier";
import { getUserByCredentialId } from "@/lib/database";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: statementId } = await params;
    const body = await request.json();
    const { jwt } = body;

    if (!jwt) {
      return NextResponse.json({ error: "jwt is required" }, { status: 400 });
    }

    // 1. Verify the JWT signature and authorization
    const verificationResult = await verifyPasskeyJWT(jwt);

    if (!verificationResult.valid || !verificationResult.credentialId) {
      console.error("JWT verification failed:", verificationResult);
      return NextResponse.json(
        { error: verificationResult.error || "Invalid JWT signature" },
        { status: 401 },
      );
    }

    // 2. Derive user from the verified credential ID
    const user = await getUserByCredentialId(verificationResult.credentialId);

    if (!user) {
      return NextResponse.json(
        { error: "User not found for this credential" },
        { status: 404 },
      );
    }

    // 3. Extract signature from JWT (3rd part)
    const parts = jwt.split(".");
    if (parts.length !== 3) {
      return NextResponse.json(
        { error: "Invalid JWT format" },
        { status: 400 },
      );
    }
    const signature = parts[2];

    // 4. Save the signature
    const signatureId = await signStatement(
      statementId,
      user.userId,
      signature,
      jwt,
    );

    return NextResponse.json({
      success: true,
      signatureId: signatureId.toString(),
    });
  } catch (error) {
    console.error("Error signing statement:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to sign statement",
      },
      { status: 500 },
    );
  }
}
