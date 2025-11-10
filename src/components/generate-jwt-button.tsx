"use client";

import { useState, Dispatch, SetStateAction } from "react";
import { WebAuthnCredential } from "@simplewebauthn/browser";
import { SignJWT, importPKCS8 } from "jose";

interface GenerateJWTProps {
  userCredential: WebAuthnCredential | null;
  jwtPrivKey: string | null;
  generatedJwt: string | undefined;
  setGeneratedJwt: Dispatch<SetStateAction<string | undefined>>;
}

export default function GenerateJWT({
  userCredential,
  jwtPrivKey,
  generatedJwt,
  setGeneratedJwt,
}: GenerateJWTProps) {
  const [statement, setStatement] = useState<string>('{foo: "bar"}');

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

    console.log("Generated JWT:\n\n" + jwt);
    setGeneratedJwt(jwt);
  }

  return (
    <div className="flex flex-col gap-2 min-w-2xl">
      <textarea
        value={statement}
        onChange={(e) => setStatement(e.target.value)}
        placeholder="Enter text here..."
        rows={4}
        className="rounded-lg border border-solid border-black/[.08] dark:border-white/[.145] px-4 py-2 text-sm sm:text-base resize-y w-full"
      />
      <button
        className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h- sm:h-12 px-4 sm:px-5 w-full sm:w-auto md:w-auto"
        onClick={handleClick}
      >
        2. Generate JWT
      </button>
      <textarea
        value={generatedJwt}
        readOnly
        placeholder="Generated JWT will appear here..."
        rows={6}
        className="rounded-lg border border-solid border-black/[.08] dark:border-white/[.145] px-4 py-2 text-sm sm:text-base w-full bg-gray-50 dark:bg-gray-900 font-mono"
      />
    </div>
  );
}
