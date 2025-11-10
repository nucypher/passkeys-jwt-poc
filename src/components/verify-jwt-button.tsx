"use client";

import { useState } from "react";
import { jwtVerify, importSPKI } from "jose";

interface VerifyJWTProps {
  jwtPubKey: string | null;
  generatedJwt: string | undefined;
}

export default function VerifyJWT({ jwtPubKey, generatedJwt }: VerifyJWTProps) {
  const [jwtPayload, setJwtPayload] = useState<string | null>(null);
  const [jwtProtectedHeader, setJwtProtectedHeader] = useState<string | null>(
    null
  );

  async function handleClick() {
    console.log("Verifying JWT...");

    const alg = "ES256";
    const spki = jwtPubKey;

    if (!spki || !generatedJwt) {
      console.error("Public key or JWT not available for JWT verification");
      return;
    }

    const pubKey = await importSPKI(spki, alg);

    const jwt = generatedJwt;
    // const modifiedJwt = jwt.slice(0, 30) + 'Z' + jwt.slice(30);

    try {
      const { payload, protectedHeader } = await jwtVerify(jwt, pubKey);
      setJwtPayload(JSON.stringify(payload, null, 2));
      setJwtProtectedHeader(JSON.stringify(protectedHeader, null, 2));
    } catch (error) {
      console.error("JWT verification failed:", error);
      return;
    }

    console.log("JWT verified successfully");
  }
  return (
    <div className="flex flex-col gap-2 min-w-2xl">
      <button
        className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h- sm:h-12 px-4 sm:px-5 w-full sm:w-auto md:w-auto"
        onClick={handleClick}
      >
        3. Verify JWT
      </button>

      {jwtPayload && jwtProtectedHeader && (
        <div>
          <p>JWT payload:</p>
          <textarea
            value={jwtPayload}
            readOnly
            placeholder="If JWT is verified, payload will appear here..."
            rows={6}
            className="rounded-lg border border-solid border-black/[.08] dark:border-white/[.145] px-4 py-2 text-sm sm:text-base w-full bg-gray-50 dark:bg-gray-900 font-mono"
          />
          <p>JWT Header:</p>
          <textarea
            value={jwtProtectedHeader}
            readOnly
            placeholder="If JWT is verified, header will appear here..."
            rows={6}
            className="rounded-lg border border-solid border-black/[.08] dark:border-white/[.145] px-4 py-2 text-sm sm:text-base w-full bg-gray-50 dark:bg-gray-900 font-mono"
          />
        </div>
      )}
    </div>
  );
}
