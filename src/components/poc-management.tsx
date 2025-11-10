"use client";

import RegisterPasskey from "./register-button";
import GenerateJWT from "./generate-jwt-button";
import VerifyJWT from "./verify-jwt-button";
import { Fragment, useState } from "react";
import { type WebAuthnCredential } from "@simplewebauthn/server";

export default function PoCManagement() {
  // This is replacing a DB where the passkeys user credential would be stored
  const [userCredential, setUserCredential] =
    useState<WebAuthnCredential | null>(null);
  const [jwtPrivKey, setJwtPrivKey] = useState<string | null>(null);
  const [jwtPubKey, setJwtPubKey] = useState<string | null>(null);
  const [generatedJwt, setGeneratedJwt] = useState<string | undefined>(
    undefined
  );

  return (
    <Fragment>
      <RegisterPasskey
        setUserCredential={setUserCredential}
        setJwtPrivKey={setJwtPrivKey}
        setJwtPubKey={setJwtPubKey}
      />
      {userCredential && (
        <GenerateJWT
          userCredential={userCredential}
          jwtPrivKey={jwtPrivKey}
          generatedJwt={generatedJwt}
          setGeneratedJwt={setGeneratedJwt}
        />
      )}
      {generatedJwt && (
        <VerifyJWT jwtPubKey={jwtPubKey} generatedJwt={generatedJwt} />
      )}
    </Fragment>
  );
}
