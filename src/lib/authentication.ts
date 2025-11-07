"use server";

import {
  generateAuthenticationOptions,
  GenerateAuthenticationOptionsOpts,
  verifyAuthenticationResponse,
  type PublicKeyCredentialRequestOptionsJSON,
  type VerifiedAuthenticationResponse,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { headers } from "next/headers";
import { getCredential, updateCredentialCounter } from "./database";

export const getAuthenticationOptions = async (
  customChallengeBase64url?: string
): Promise<PublicKeyCredentialRequestOptionsJSON> => {
  const authenticationOptionsParameters: GenerateAuthenticationOptionsOpts = {
    rpID: "localhost",
    timeout: 60000,
    userVerification: "preferred",
  };
  const authenticationOptions = await generateAuthenticationOptions(
    authenticationOptionsParameters
  );

  // If a custom challenge is provided (already base64url-encoded),
  // replace the auto-generated challenge to avoid double-encoding
  if (customChallengeBase64url) {
    authenticationOptions.challenge = customChallengeBase64url;
  }

  return authenticationOptions;
};

export const verifyAuthentication = async (
  authenticationResponse: AuthenticationResponseJSON,
  challenge: string
): Promise<VerifiedAuthenticationResponse> => {
  // Extract credential ID from the authentication response
  const credentialId = authenticationResponse.id;

  // Look up credential from database
  const storedCredential = await getCredential(credentialId);

  if (!storedCredential) {
    throw new Error("Credential not found in database");
  }

  // Convert stored public key back to buffer
  const credentialPublicKey = isoBase64URL.toBuffer(storedCredential.publicKey);

  // Get the origin from request headers
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const expectedOrigin = `${protocol}://${host}`;

  const verificationResponse = await verifyAuthenticationResponse({
    response: authenticationResponse,
    expectedChallenge: challenge,
    expectedOrigin,
    expectedRPID: "localhost",
    credential: {
      id: credentialId,
      publicKey: credentialPublicKey,
      counter: storedCredential.counter,
      transports: storedCredential.transports,
    },
  });

  if (!verificationResponse.verified) {
    throw new Error("Authentication verification failed");
  }

  // Update the counter in the database
  if (verificationResponse.authenticationInfo) {
    await updateCredentialCounter(
      credentialId,
      verificationResponse.authenticationInfo.newCounter
    );
  }

  return verificationResponse;
};

export interface SessionData {
  credentialId: string;
  authenticatedAt: number;
  sessionId: string;
}

export const createSession = async (
  credentialId: string
): Promise<SessionData> => {
  return {
    credentialId,
    authenticatedAt: Date.now(),
    sessionId: crypto.randomUUID(),
  };
};
