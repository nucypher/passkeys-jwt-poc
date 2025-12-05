import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";
import { getRegistrationOptions } from "@/lib/registry";

export async function GET() {
  try {
    const db = await getDatabase();
    const credentials = db
      .prepare(
        "SELECT credential_id, length(credential_id) as id_length, algorithm, counter, created_at FROM passkey_credentials",
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
      { status: 500 },
    );
  }
}

// Generate registration options for a new passkey
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, role } = body;

    if (!name || !role) {
      return NextResponse.json(
        { error: "Name and role are required" },
        { status: 400 },
      );
    }

    if (role !== "creator" && role !== "investor") {
      return NextResponse.json(
        { error: "Role must be either 'creator' or 'investor'" },
        { status: 400 },
      );
    }

    // Generate a unique user ID for this registration
    const userId = crypto.randomUUID();

    const registrationOptions = await getRegistrationOptions(
      userId,
      name,
      role,
    );

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
      { status: 500 },
    );
  }
}
