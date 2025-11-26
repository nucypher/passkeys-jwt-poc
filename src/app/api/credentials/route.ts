import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";
import { getRegistrationOptions, verifyRegistration } from "@/lib/registry";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";

export async function GET() {
  try {
    const db = await getDatabase();
    const credentials = db
      .prepare(
        "SELECT credential_id, length(credential_id) as id_length, algorithm, counter, created_at FROM passkey_credentials"
      )
      .all();

    return NextResponse.json({
      count: credentials.length,
      credentials,
    });
  } catch (error) {
    console.error("Error listing credentials:", error);
    return NextResponse.json(
      { error: "Failed to list credentials" },
      { status: 500 }
    );
  }
}

// Generate registration options for a new passkey
export async function POST() {
  try {
    // Generate a unique user ID for this registration
    const userId = crypto.randomUUID();

    const registrationOptions = await getRegistrationOptions(userId);

    return NextResponse.json(registrationOptions);
  } catch (error) {
    console.error("Error generating registration options:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate registration options",
      },
      { status: 500 }
    );
  }
}

// Verify and save a passkey registration
export async function PUT(request: NextRequest) {
  try {
    const registrationResponse =
      (await request.json()) as RegistrationResponseJSON;

    if (!registrationResponse || !registrationResponse.id) {
      return NextResponse.json(
        { error: "Invalid registration response" },
        { status: 400 }
      );
    }

    // Get all pending registrations and try each one until we find a match
    // This works because we generate options just before registration
    const db = await getDatabase();
    const pendingRegs = db
      .prepare(
        "SELECT user_id FROM pending_passkey_registrations ORDER BY created_at DESC"
      )
      .all() as Array<{ user_id: string }>;

    if (pendingRegs.length === 0) {
      return NextResponse.json(
        {
          error:
            "No pending registrations found. Please try registering again.",
        },
        { status: 400 }
      );
    }

    let verificationResult;
    let successfulUserId;

    for (const reg of pendingRegs) {
      try {
        verificationResult = await verifyRegistration(
          reg.user_id,
          registrationResponse
        );

        if (verificationResult.verified) {
          successfulUserId = reg.user_id;
          break;
        }
      } catch {
        // Try next pending registration
        console.log(
          `Verification failed for userId ${reg.user_id}, trying next...`
        );
        continue;
      }
    }

    if (!verificationResult || !verificationResult.verified) {
      return NextResponse.json(
        { error: "Registration verification failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      verified: true,
      credentialId: registrationResponse.id,
      userId: successfulUserId,
      message: "Passkey registered successfully",
    });
  } catch (error) {
    console.error("Error verifying registration:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to verify registration",
      },
      { status: 500 }
    );
  }
}
