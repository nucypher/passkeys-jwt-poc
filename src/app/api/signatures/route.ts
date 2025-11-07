import { NextRequest, NextResponse } from "next/server";
import {
  getSignaturesByCredentialIdWithCredentials,
  getAllSignaturesWithCredentials,
} from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const credentialId = searchParams.get("credentialId");

    // If credentialId is provided, return signatures for that credential only
    if (credentialId) {
      const signaturesWithCredentials =
        await getSignaturesByCredentialIdWithCredentials(credentialId);
      return NextResponse.json({
        success: true,
        signatures: signaturesWithCredentials.map((sig) => ({
          id: sig.id,
          credentialId: sig.credential_id,
          payload: JSON.parse(sig.jwt_payload),
          signature: sig.signature,
          jwt: sig.jwt,
          timestamp: sig.timestamp,
          credential: {
            publicKey: sig.public_key,
            counter: sig.counter,
            transports: JSON.parse(sig.transports),
            createdAt: sig.credential_created_at,
          },
        })),
      });
    }

    // Otherwise, return all signatures with credential information
    const signaturesWithCredentials = await getAllSignaturesWithCredentials();

    return NextResponse.json({
      success: true,
      signatures: signaturesWithCredentials.map((sig) => ({
        id: sig.id,
        credentialId: sig.credential_id,
        payload: JSON.parse(sig.jwt_payload),
        signature: sig.signature,
        jwt: sig.jwt,
        timestamp: sig.timestamp,
        credential: {
          publicKey: sig.public_key,
          counter: sig.counter,
          transports: JSON.parse(sig.transports),
          createdAt: sig.credential_created_at,
        },
      })),
    });
  } catch (error) {
    console.error("Error retrieving signatures:", error);
    return NextResponse.json(
      { error: "Failed to retrieve signatures" },
      { status: 500 }
    );
  }
}
