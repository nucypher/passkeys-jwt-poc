import { NextRequest, NextResponse } from "next/server";
import { getCredential } from "@/lib/database";
import { getCoseAlgorithmName } from "@/lib/cose-to-jwt";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: "Credential ID is required" },
        { status: 400 }
      );
    }

    const credential = await getCredential(id);

    if (!credential) {
      return NextResponse.json(
        { error: "Credential not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      credentialId: credential.credentialId,
      algorithm: credential.algorithm,
      algorithmName: getCoseAlgorithmName(credential.algorithm),
      counter: credential.counter,
      transports: credential.transports,
    });
  } catch (error) {
    console.error("Error fetching credential:", error);
    return NextResponse.json(
      { error: "Failed to fetch credential" },
      { status: 500 }
    );
  }
}

