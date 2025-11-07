export interface JWTPayload {
  message: string;
  nonce: string;
  timestamp: number;
}

export interface SignedJWT {
  payload: JWTPayload;
  signature: string;
}

export const generateNonce = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

export const createJWTPayload = (): JWTPayload => {
  return {
    message: "dummy data",
    nonce: generateNonce(),
    timestamp: Date.now(),
  };
};

