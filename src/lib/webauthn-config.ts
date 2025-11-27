import { headers } from "next/headers";

/**
 * Get WebAuthn configuration from environment variables
 */
export function getWebAuthnConfig() {
  const rpId = process.env.WEBAUTHN_RP_ID || "localhost";
  const origin = process.env.WEBAUTHN_ORIGIN || "http://localhost:3000";

  return {
    rpId,
    origin,
  };
}

/**
 * Get the expected origin from request headers or environment
 */
export async function getExpectedOrigin(): Promise<string> {
  // Check if WEBAUTHN_ORIGIN is set
  if (process.env.WEBAUTHN_ORIGIN) {
    return process.env.WEBAUTHN_ORIGIN;
  }

  // Fallback to deriving from headers
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  return `${protocol}://${host}`;
}
