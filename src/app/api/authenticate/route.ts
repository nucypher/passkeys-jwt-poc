import { NextRequest, NextResponse } from "next/server";
import { verifyAuthentication } from "@/lib/authentication";
import { type AuthenticationResponseJSON } from "@simplewebauthn/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { authenticationResponse, challenge } = body as {
      authenticationResponse: AuthenticationResponseJSON;
      challenge: string;
    };

    if (!authenticationResponse || !challenge) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const verificationResponse = await verifyAuthentication(
      authenticationResponse,
      challenge,
    );

    return NextResponse.json({
      verified: verificationResponse.verified,
      authenticationInfo: verificationResponse.authenticationInfo,
    });
  } catch (error) {
    console.error(
      "Authentication verification failed:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Authentication verification failed",
      },
      { status: 500 },
    );
  }
}
