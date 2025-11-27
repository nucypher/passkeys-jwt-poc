import { NextRequest, NextResponse } from "next/server";
import { createOrUpdateUser } from "@/lib/user-management";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, role, credentialId } = body;

    if (!name || !role || !credentialId) {
      return NextResponse.json(
        { error: "Name, role, and credentialId are required" },
        { status: 400 },
      );
    }

    if (role !== "creator" && role !== "investor") {
      return NextResponse.json(
        { error: "Role must be either 'creator' or 'investor'" },
        { status: 400 },
      );
    }

    const user = await createOrUpdateUser(name, role, credentialId);

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error registering user:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to register user",
      },
      { status: 500 },
    );
  }
}
