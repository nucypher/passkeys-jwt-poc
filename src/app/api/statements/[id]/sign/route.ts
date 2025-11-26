import { NextRequest, NextResponse } from "next/server";
import { signStatement } from "@/lib/statements";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: statementId } = await params;
    const body = await request.json();
    const { userId, signature, jwt } = body;

    if (!userId || !signature || !jwt) {
      return NextResponse.json(
        { error: "userId, signature, and jwt are required" },
        { status: 400 }
      );
    }

    const signatureId = await signStatement(statementId, userId, signature, jwt);

    return NextResponse.json({
      success: true,
      signatureId: signatureId.toString(),
    });
  } catch (error) {
    console.error("Error signing statement:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to sign statement",
      },
      { status: 500 }
    );
  }
}

