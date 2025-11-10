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

  return (
    <Fragment>
      <RegisterPasskey
        setUserCredential={setUserCredential}
        setJwtPrivKey={setJwtPrivKey}
      />
      <GenerateJWT userCredential={userCredential} jwtPrivKey={jwtPrivKey} />
    </Fragment>
  );
}
