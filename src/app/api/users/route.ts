import { NextResponse } from "next/server";
import { listAllUsers } from "@/lib/user-management";

export async function GET() {
  try {
    const users = await listAllUsers();

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch users",
      },
      { status: 500 },
    );
  }
}
