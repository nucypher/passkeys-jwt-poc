"use client";

import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { startRegistration } from "@simplewebauthn/browser";
import { getRegistrationOptions, verifyRegistration } from "../lib/registry";

export default function RegisterPasskey() {
  async function handleClick() {
    // Generate a simple user ID based on timestamp
    const userId = `user-${Date.now()}`;

    const registrationOptions = await getRegistrationOptions(userId);

    const registrationResponse = await startRegistration({
      optionsJSON: registrationOptions,
    });

    const verificationResponse = await verifyRegistration(
      userId,
      registrationResponse
    );

    if (!verificationResponse.registrationInfo) {
      console.error("Registration verification failed: no registration info found");
    } else {
      const credential = verificationResponse.registrationInfo.credential;
      
      // Store credential info in localStorage for client-side reference
      const credentialId = isoBase64URL.fromBuffer(credential.id);
      localStorage.setItem("credentialId", credentialId);
      console.log("Registration successful. Credential ID:", credentialId);
    }
  }

  return (
    <button
      className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
      onClick={handleClick}
    >
      Register new Passkey
    </button>
  );
}
