import { NextRequest, NextResponse } from "next/server";
import { getDatabase, getCredential, saveJWTKey } from "@/lib/database";
import { verifyRegistration } from "@/lib/registry";
import { createOrUpdateUser } from "@/lib/user-management";
import {
  verifyAuthenticationResponse,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { jwkToPemServer } from "@/lib/pem-utils";
import type { JWK } from "jose";
import { getWebAuthnConfig, getExpectedOrigin } from "@/lib/webauthn-config";

interface RegisterCompleteRequest {
  registrationResponse: RegistrationResponseJSON;
  name: string;
  role: "creator" | "investor";
  passkeyAttestation: AuthenticationResponseJSON;
  jwtKeyData: {
    keyId: string;
    publicKeyJWK: JWK;
    privateKeyJWK?: JWK;
    publicKeyFingerprint: string;
  };
}

/**
 * Combined registration endpoint that handles:
 * 1. Passkey verification
 * 2. User creation
 * 3. JWT key registration with passkey attestation
 *
 * This reduces the registration flow from 5 API calls to just 2
 * (POST /api/credentials for options + this endpoint)
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RegisterCompleteRequest;
    const { registrationResponse, name, role, passkeyAttestation, jwtKeyData } =
      body;

    // Validate required fields
    if (!registrationResponse?.id) {
      return NextResponse.json(
        { error: "registrationResponse is required" },
        { status: 400 },
      );
    }

    if (!name || !role) {
      return NextResponse.json(
        { error: "name and role are required" },
        { status: 400 },
      );
    }

    if (role !== "creator" && role !== "investor") {
      return NextResponse.json(
        { error: "role must be 'creator' or 'investor'" },
        { status: 400 },
      );
    }

    if (!passkeyAttestation || !jwtKeyData) {
      return NextResponse.json(
        { error: "passkeyAttestation and jwtKeyData are required" },
        { status: 400 },
      );
    }

    // Step 1: Verify passkey registration
    console.log("🔐 Step 1: Verifying passkey registration...");

    const db = await getDatabase();
    const pendingRegs = db
      .prepare(
        "SELECT user_id FROM pending_passkey_registrations ORDER BY created_at DESC",
      )
      .all() as Array<{ user_id: string }>;

    if (pendingRegs.length === 0) {
      return NextResponse.json(
        { error: "No pending registrations found. Please try again." },
        { status: 400 },
      );
    }

    let verificationResult;
    let successfulUserId: string | undefined;

    for (const reg of pendingRegs) {
      try {
        verificationResult = await verifyRegistration(
          reg.user_id,
          registrationResponse,
        );
        if (verificationResult.verified) {
          successfulUserId = reg.user_id;
          break;
        }
      } catch {
        console.log(
          `Verification failed for userId ${reg.user_id}, trying next...`,
        );
        continue;
      }
    }

    if (!verificationResult?.verified || !successfulUserId) {
      return NextResponse.json(
        { error: "Passkey registration verification failed" },
        { status: 400 },
      );
    }

    const credentialId = registrationResponse.id;
    console.log("✅ Passkey registration verified:", credentialId);

    // Step 2: Create user
    console.log("👤 Step 2: Creating user...");
    const user = await createOrUpdateUser(name, role, credentialId);
    console.log("✅ User created:", user.userId);

    // Step 3: Verify passkey attestation for JWT key
    console.log("🔑 Step 3: Verifying JWT key attestation...");

    const credential = await getCredential(credentialId);
    if (!credential) {
      return NextResponse.json(
        { error: "Credential not found after registration" },
        { status: 500 },
      );
    }

    const expectedOrigin = await getExpectedOrigin();
    const { rpId } = getWebAuthnConfig();

    const attestationResult = await verifyAuthenticationResponse({
      response: passkeyAttestation,
      expectedChallenge: jwtKeyData.publicKeyFingerprint,
      expectedOrigin,
      expectedRPID: rpId,
      credential: {
        id: credentialId,
        publicKey: isoBase64URL.toBuffer(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports,
      },
    });

    if (!attestationResult.verified) {
      return NextResponse.json(
        { error: "JWT key attestation verification failed" },
        { status: 400 },
      );
    }

    console.log("✅ JWT key attestation verified");

    // Step 4: Save JWT key
    console.log("💾 Step 4: Saving JWT key...");
    const publicKeyPEM = jwkToPemServer(jwtKeyData.publicKeyJWK);

    await saveJWTKey(
      jwtKeyData.keyId,
      user.userId,
      credentialId,
      JSON.stringify(jwtKeyData.publicKeyJWK),
      publicKeyPEM,
      jwtKeyData.publicKeyFingerprint,
      JSON.stringify(passkeyAttestation),
      jwtKeyData.privateKeyJWK
        ? JSON.stringify(jwtKeyData.privateKeyJWK)
        : undefined,
    );

    console.log("✅ Registration complete!");

    return NextResponse.json({
      success: true,
      user: {
        userId: user.userId,
        name: user.name,
        role: user.role,
        credentialId: user.credentialId,
      },
      keyId: jwtKeyData.keyId,
      publicKeyPEM,
    });
  } catch (error) {
    console.error("❌ Registration error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Registration failed",
      },
      { status: 500 },
    );
  }
}
