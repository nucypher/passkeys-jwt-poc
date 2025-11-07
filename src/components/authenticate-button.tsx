"use client";

import { startAuthentication } from "@simplewebauthn/browser";

interface AuthenticatePasskeyProps {
  onAuthenticationSuccess: (credentialId: string) => void;
}

export default function AuthenticatePasskey({
  onAuthenticationSuccess,
}: AuthenticatePasskeyProps) {
  async function handleClick() {
    try {
      const optionsResponse = await fetch("/api/authenticate/options");
      if (!optionsResponse.ok) {
        throw new Error("Failed to get authentication options");
      }
      const authenticationOptions = await optionsResponse.json();

      const authenticationResponse = await startAuthentication({
        optionsJSON: authenticationOptions,
      });

      const verifyResponse = await fetch("/api/authenticate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          authenticationResponse,
          challenge: authenticationOptions.challenge,
        }),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(
          errorData.error || "Authentication verification failed"
        );
      }

      const verificationResult = await verifyResponse.json();

      if (verificationResult.verified) {
        // Create session data
        const credentialId = authenticationResponse.id;
        const session = {
          credentialId,
          authenticatedAt: Date.now(),
          sessionId: crypto.randomUUID(),
        };

        // Store session in localStorage
        localStorage.setItem("session", JSON.stringify(session));
        localStorage.setItem("credentialId", credentialId);

        console.log("Authentication successful for credential:", credentialId);

        // Notify parent component
        onAuthenticationSuccess(credentialId);
      }
    } catch (error) {
      console.error("Authentication failed:", error);
      alert(
        "Authentication failed. Please try again or register a new passkey."
      );
    }
  }

  return (
    <button
      className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto"
      onClick={handleClick}
    >
      Login with Passkey
    </button>
  );
}
