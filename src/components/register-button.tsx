"use client";

import { startRegistration } from "@simplewebauthn/browser";
import { getRegistrationOptions, verifyRegistration } from "../lib/registry";

interface RegisterPasskeyProps {
  onRegistrationSuccess?: () => void;
}

export default function RegisterPasskey({
  onRegistrationSuccess,
}: RegisterPasskeyProps) {
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
      console.error(
        "Registration verification failed: no registration info found"
      );
    } else {
      const credential = verificationResponse.registrationInfo.credential;

      // Store credential info in localStorage for client-side reference
      // credential.id is already a base64url string from the verification response
      const credentialId = credential.id;
      localStorage.setItem("credentialId", credentialId);
      console.log("Registration successful. Credential ID:", credentialId);

      // Notify parent component of successful registration
      if (onRegistrationSuccess) {
        onRegistrationSuccess();
      }
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
