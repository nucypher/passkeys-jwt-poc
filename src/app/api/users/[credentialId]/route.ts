import { NextRequest, NextResponse } from "next/server";
import { getUserInfo } from "@/lib/user-management";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ credentialId: string }> },
) {
  try {
    const { credentialId } = await params;

    const user = await getUserInfo(credentialId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch user",
      },
      { status: 500 },
    );
  }
}
