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

    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge is required" },
        { status: 400 },
      );
    }

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
