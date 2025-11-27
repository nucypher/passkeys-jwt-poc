import { NextResponse } from "next/server";
import { getStatements } from "@/lib/statements";

export async function GET() {
  try {
    const statements = await getStatements();

    return NextResponse.json({
      success: true,
      statements,
    });
  } catch (error) {
    console.error("Error fetching statements:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch statements",
      },
      { status: 500 },
    );
  }
}
