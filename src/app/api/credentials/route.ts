import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";

export async function GET() {
  try {
    const db = await getDatabase();
    const credentials = db
      .prepare(
        "SELECT credential_id, length(credential_id) as id_length, algorithm, counter, created_at FROM credentials"
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

