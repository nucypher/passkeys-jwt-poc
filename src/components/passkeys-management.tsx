"use client";

import RegisterPasskey from "../components/register-button";
import GenerateJWT from "../components/generate-jwt-button";
import { Fragment, useState } from "react";
import { type WebAuthnCredential } from "@simplewebauthn/server";

export default function PasskeysManagement() {
  // This is replacing a DB where the user credential would be stored
  const [userCredential, setUserCredential] =
    useState<WebAuthnCredential | null>(null);
  const [jwtPrivKey, setJwtPrivKey] = useState<string | null>(null);
  const [generatedJwt, setGeneratedJwt] = useState<string | undefined>(undefined);

  return (
    <Fragment>
      <RegisterPasskey
        setUserCredential={setUserCredential}
        setJwtPrivKey={setJwtPrivKey}
      />
      {userCredential && (
        <GenerateJWT
          userCredential={userCredential}
          jwtPrivKey={jwtPrivKey}
          generatedJwt={generatedJwt}
          setGeneratedJwt={setGeneratedJwt}
        />
      )}
    </Fragment>
  );
}
