import { NextRequest, NextResponse } from "next/server";
import { getAuthenticationOptions } from "@/lib/authentication";

export async function GET() {
  try {
    const authenticationOptions = await getAuthenticationOptions();
    return NextResponse.json(authenticationOptions);
  } catch (error) {
    console.error("Error generating authentication options:", error);
    return NextResponse.json(
      { error: "Failed to generate authentication options" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { challenge, credentialId } = body;

    // Challenge is optional - if not provided, the server generates one
    // For login: no challenge needed (server generates)
    // For JWT key attestation: client provides fingerprint as challenge

    const authenticationOptions = await getAuthenticationOptions(
      challenge,
      credentialId,
    );
    return NextResponse.json(authenticationOptions);
  } catch (error) {
    console.error("Error generating authentication options:", error);
    return NextResponse.json(
      { error: "Failed to generate authentication options" },
      { status: 500 },
    );
  }
}
