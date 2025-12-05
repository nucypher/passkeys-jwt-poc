"use server";

import {
  generateRegistrationOptions,
  GenerateRegistrationOptionsOpts,
  VerifiedRegistrationResponse,
  verifyRegistrationResponse,
  type PublicKeyCredentialCreationOptionsJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import {
  isoBase64URL,
  isoUint8Array,
  decodeCredentialPublicKey,
  cose,
} from "@simplewebauthn/server/helpers";
import {
  getRegistrationOptions as getStoredRegistrationOptions,
  removeRegistrationOptions,
  saveRegistrationOptions,
  saveCredential,
} from "./database";
import { getWebAuthnConfig, getExpectedOrigin } from "./webauthn-config";

export const getRegistrationOptions = async (
  userId: string,
  name: string,
  role: "creator" | "investor",
): Promise<PublicKeyCredentialCreationOptionsJSON> => {
  // Generate a random challenge
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  // Format: "Alice (Creator) - Nov 26, 2025 - 3:45 PM"
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const capitalizedRole = role.charAt(0).toUpperCase() + role.slice(1);
  const displayName = `${name} (${capitalizedRole}) - ${dateStr} - ${timeStr}`;

  const { rpId } = getWebAuthnConfig();

  const registrationOptionsParameters: GenerateRegistrationOptionsOpts = {
    rpName: "Passkeys JWT Signing",
    rpID: rpId,
    userName: displayName,
    userID: isoUint8Array.fromASCIIString(userId),
    challenge: challenge,
    userDisplayName: displayName,
    timeout: 60000,
    supportedAlgorithmIDs: [-7, -257],
  };

  const registrationOptions = await generateRegistrationOptions(
    registrationOptionsParameters,
  );

  // Registration options are saved in the database for later verification
  // Use the original userId (not the encoded one) as the key
  await saveRegistrationOptions(userId, registrationOptions);

  return registrationOptions;
};

export const verifyRegistration = async (
  userId: string,
  registrationResponse: RegistrationResponseJSON,
): Promise<VerifiedRegistrationResponse> => {
  if (registrationResponse == null) {
    throw new Error("Invalid credentials");
  }

  const storedOptions = await getStoredRegistrationOptions(userId);

  if (!storedOptions) {
    throw new Error("No registration options found for this user ID in DB");
  }

  const challenge = storedOptions.challenge;

  if (!challenge) {
    throw new Error("No challenge found for this user ID in DB");
  }

  let verificationResponse;

  // Get the origin from config
  const expectedOrigin = await getExpectedOrigin();
  const { rpId } = getWebAuthnConfig();

  try {
    verificationResponse = await verifyRegistrationResponse({
      response: registrationResponse,
      expectedChallenge: challenge,
      expectedOrigin,
      expectedRPID: rpId,
    });
  } catch (error) {
    console.error(error);
    throw error;
  }

  if (!verificationResponse.verified) {
    throw new Error("Registration verification failed");
  }

  // Save credential to database
  if (verificationResponse.registrationInfo) {
    const registrationInfo = verificationResponse.registrationInfo;
    const credential = registrationInfo.credential;

    // The public key is on the credential object
    const credentialPublicKey = credential.publicKey;

    // credential.id is already a base64url string in the credential object
    const credentialIdString = credential.id;

    // Decode the COSE public key to get the algorithm
    // This is the COSE algorithm identifier (e.g., -7 for ES256)
    const cosePublicKey = decodeCredentialPublicKey(credentialPublicKey);
    const algorithm = cosePublicKey.get(cose.COSEKEYS.alg);

    if (!algorithm) {
      throw new Error(
        "Could not determine algorithm from credential public key",
      );
    }

    console.log(`Saving credential with algorithm: ${algorithm}`);
    console.log("   Credential ID to save:", credentialIdString);
    console.log("   Credential ID type:", typeof credentialIdString);
    console.log("   Credential ID length:", credentialIdString?.length);

    await saveCredential(
      credentialIdString,
      isoBase64URL.fromBuffer(credentialPublicKey),
      credential.counter,
      credential.transports,
      algorithm,
    );
  }

  await removeRegistrationOptions(userId);

  return verificationResponse;
};
