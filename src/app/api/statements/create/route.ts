import { NextRequest, NextResponse } from "next/server";
import { createStatement } from "@/lib/statements";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, creatorId } = body;

    if (!content || !creatorId) {
      return NextResponse.json(
        { error: "Content and creatorId are required" },
        { status: 400 }
      );
    }

    const statement = await createStatement(content, creatorId);

    return NextResponse.json({
      success: true,
      statement,
    });
  } catch (error) {
    console.error("Error creating statement:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create statement",
      },
      { status: 500 }
    );
  }
}

