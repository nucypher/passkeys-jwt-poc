"use server";

import bcrypt from "bcryptjs";
import {
  generateRegistrationOptions,
  GenerateRegistrationOptionsOpts,
  VerifiedRegistrationResponse,
  verifyRegistrationResponse,
  type PublicKeyCredentialCreationOptionsJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { isoBase64URL, isoUint8Array } from "@simplewebauthn/server/helpers";
import {
  getOrCreateDatabase,
  removeRegistrationOptions,
  saveJwtPubKey,
  saveRegistrationOptions,
} from "./database";

export const getRegistrationOptions = async (
  userName: string,
  jwtPubKey: string
): Promise<PublicKeyCredentialCreationOptionsJSON> => {
  const userID = isoUint8Array.fromASCIIString(await bcrypt.hash(jwtPubKey, 0));
  const challenge = await bcrypt.hash(jwtPubKey, 10);

  // Generate registration options:
  // challenge: JWT public key hashed
  // userID: JWT public key hashed
  // userName: string like user_xxxx
  const registrationOptionsParameters: GenerateRegistrationOptionsOpts = {
    rpName: "Passkeys TACo PoC",
    rpID: "localhost",
    userName: userName, // to be shown in passkey popup
    userID: userID,
    challenge: challenge,
    timeout: 60000,
    // excludeCredentials: [],
    supportedAlgorithmIDs: [-7, -257], // ES256, RS256
  };

  const registrationOptions = await generateRegistrationOptions(
    registrationOptionsParameters
  );

  // Registration options are saved in the database for later verification
  saveRegistrationOptions(registrationOptions);

  return registrationOptions;
};

export const verifyRegistration = async (
  userName: string,
  jwtPubKey: string,
  registrationResponse: RegistrationResponseJSON
): Promise<VerifiedRegistrationResponse> => {
  const db = await getOrCreateDatabase();

  let verificationResponse;

  if (registrationResponse == null) {
    throw new Error("Invalid credentials");
  }

  const dbChallenge = db.registrationOptions[userName].challenge;

  if (!dbChallenge) {
    throw new Error(
      "No challenge found for this ephemeral wallet address in DB"
    );
  }

  // Check the JWT public key provided against the challenge in DB
  const challengeCheck = await bcrypt.compare(
    jwtPubKey,
    isoBase64URL.toUTF8String(dbChallenge)
  );
  if (!challengeCheck) {
    throw new Error("Challenge verification failed");
  }

  try {
    verificationResponse = await verifyRegistrationResponse({
      response: registrationResponse,
      expectedChallenge: dbChallenge,
      expectedOrigin: "http://localhost:3000",
      expectedRPID: "localhost",
    });
  } catch (error) {
    console.error(error);
    throw error;
  }

  if (!verificationResponse.verified) {
    throw new Error("Registration verification failed");
  }

  // Save the JWT public key associated with the userName
  await saveJwtPubKey(registrationResponse.id, userName, jwtPubKey);

  // Clean up registration options from DB after successful verification
  await removeRegistrationOptions(userName);

  return verificationResponse;
};
