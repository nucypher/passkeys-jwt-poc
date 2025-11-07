"use server";

import { saveSignature } from "./database";
import { type JWTPayload } from "./jwt-signing";

// Re-export from the new standardized verifier
// Note: Types cannot be exported from "use server" files
export { verifyJWTFromDatabase as verifyJWTSignature } from "./jwt-webauthn-verifier";

export const saveJWTSignature = async (
  credentialId: string,
  payload: JWTPayload,
  signature: string,
  jwt?: string
): Promise<number | bigint> => {
  const jwtPayloadString = JSON.stringify(payload);
  return saveSignature(credentialId, jwtPayloadString, signature, jwt);
};
