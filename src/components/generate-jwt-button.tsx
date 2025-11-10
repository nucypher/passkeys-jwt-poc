"use client";

import { WebAuthnCredential } from "@simplewebauthn/browser";
import { SignJWT, jwtVerify, importPKCS8 } from "jose";

interface GenerateJWTProps {
  userCredential: WebAuthnCredential | null;
  jwtPrivKey: string | null;
}

export default function GenerateJWT({
  userCredential,
  jwtPrivKey,
}: GenerateJWTProps) {
  async function handleClick() {
    console.log("Generating JWT...");

    if (!jwtPrivKey) {
      console.error("JWT Private Key is not available");
      return;
    }
    if (!userCredential || !userCredential.id) {
      console.error("User Credential ID is not available");
      return;
    }

    const statement = { foo: "bar" };

    const alg = "ES256";
    const privateKey = await importPKCS8(jwtPrivKey, alg);
    const jwt = await new SignJWT(statement)
      .setProtectedHeader({ alg })
      .setIssuedAt()
      .setExpirationTime("2h")
      .sign(privateKey);

    const jwtVerification = jwt.verify(token, publicKey, {
      algorithms: ["ES256"],
    });
  }

  return (
    <button
      className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto md:w-auto"
      onClick={handleClick}
      disabled={!userCredential}
    >
      2. Generate JWT
    </button>
  );
}
