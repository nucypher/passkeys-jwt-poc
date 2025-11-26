import { NextRequest, NextResponse } from "next/server";
import { getStatementById } from "@/lib/statements";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const statement = await getStatementById(id);

    if (!statement) {
      return NextResponse.json(
        { error: "Statement not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      statement,
    });
  } catch (error) {
    console.error("Error fetching statement:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch statement",
      },
      { status: 500 }
    );
  }
}

