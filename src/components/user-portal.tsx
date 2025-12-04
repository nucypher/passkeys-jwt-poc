"use client";

import { useState, useEffect } from "react";
import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import { SignJWT, generateKeyPair, exportJWK, type KeyLike } from "jose";
import UserSetup from "@/components/user-setup";
import StatementCreator from "@/components/statement-creator";
import StatementList from "@/components/statement-list";
import Link from "next/link";

interface UserSession {
  userId: string;
  name: string;
  role: "creator" | "investor";
  credentialId: string;
  keyId: string;
  privateKey: KeyLike;
}

interface UserPortalProps {
  role: "creator" | "investor";
}

export default function UserPortal({ role }: UserPortalProps) {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const isCreator = role === "creator";
  const roleDisplayName = isCreator ? "Creator" : "Investor";

  useEffect(() => {
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const checkSession = async () => {
    try {
      const stored = localStorage.getItem("userSession");
      if (stored) {
        const parsedSession = JSON.parse(stored);

        // Only load session if the role matches the current page
        if (parsedSession.role === role && parsedSession.privateKeyJWK) {
          // Reconstruct CryptoKey from JWK
          const { importJWK } = await import("jose");
          const privateKey = await importJWK(
            parsedSession.privateKeyJWK,
            "EdDSA",
          );
          setSession({
            ...parsedSession,
            privateKey,
          });
        } else if (parsedSession.role !== role) {
          // User is logged in but with a different role - don't show session
          setSession(null);
        }
      }
    } catch (error) {
      console.error("Error restoring session:", error);
      localStorage.removeItem("userSession");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSetup = async (name: string) => {
    try {
      setIsLoading(true);

      // Step 1: Get passkey registration options (API call 1 of 2)
      const optionsResponse = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role }),
      });
      const options = await optionsResponse.json();

      // Perform passkey registration (browser interaction)
      const registrationResponse = await startRegistration({
        optionsJSON: options,
      });

      // Get credentialId from registration response (no API call needed!)
      const credentialId = registrationResponse.id;

      // Generate JWT key pair locally (with extractable: true for session storage)
      const keyPair = await generateKeyPair("EdDSA", {
        crv: "Ed25519",
        extractable: true,
      });
      const publicKeyJWK = await exportJWK(keyPair.publicKey);
      const privateKeyJWK = await exportJWK(keyPair.privateKey);

      // Compute public key fingerprint
      const canonical = JSON.stringify({
        kty: publicKeyJWK.kty,
        crv: publicKeyJWK.crv,
        x: publicKeyJWK.x,
      });
      const msgBuffer = new TextEncoder().encode(canonical);
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
      const publicKeyFingerprint = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const keyId = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Construct authentication options locally (no API call needed!)
      const authOptions = {
        challenge: publicKeyFingerprint,
        rpId:
          window.location.hostname === "localhost"
            ? "localhost"
            : window.location.hostname,
        timeout: 60000,
        userVerification: "preferred" as const,
        allowCredentials: [{ id: credentialId, type: "public-key" as const }],
      };

      // Perform passkey authentication for JWT key attestation (browser interaction)
      const passkeyAttestation = await startAuthentication({
        optionsJSON: authOptions,
      });

      // Step 2: Complete registration (API call 2 of 2)
      const registerResponse = await fetch("/api/register/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationResponse,
          name,
          role,
          passkeyAttestation,
          jwtKeyData: {
            keyId,
            publicKeyJWK,
            privateKeyJWK,
            publicKeyFingerprint,
          },
        }),
      });

      if (!registerResponse.ok) {
        const error = await registerResponse.json();
        throw new Error(error.error || "Registration failed");
      }

      const { user } = await registerResponse.json();

      // Save unified session
      const sessionData = {
        userId: user.userId,
        name: user.name,
        role: user.role,
        credentialId: user.credentialId,
        keyId,
        privateKeyJWK,
      };

      localStorage.setItem("userSession", JSON.stringify(sessionData));

      setSession({
        ...sessionData,
        privateKey: keyPair.privateKey,
      });

      // Dispatch event to notify other components of login
      window.dispatchEvent(new Event("userLoggedIn"));

      setNeedsSetup(false);
    } catch (error) {
      console.error("Setup error:", error);
      alert(
        `Setup failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignStatement = async (statementId: string) => {
    if (!session) return;

    try {
      // Get statement
      const stmtResponse = await fetch(`/api/statements/${statementId}`);
      if (!stmtResponse.ok) throw new Error("Failed to load statement");

      const { statement } = await stmtResponse.json();

      // Create JWT payload with statement content
      const payload = {
        statementId,
        content: statement.content,
        signer: session.userId,
        timestamp: Date.now(),
      };

      // Sign with JWT key
      const jwt = await new SignJWT(payload)
        .setProtectedHeader({
          alg: "EdDSA",
          typ: "JWT",
          kid: session.keyId,
        })
        .setIssuedAt()
        .sign(session.privateKey);

      // Save signature
      // The backend will validate the signature and fech the associated user id, require the user to sign in
      // with their passkey, and then save the signature in the database.
      const response = await fetch(`/api/statements/${statementId}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jwt,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to sign statement");
      }

      alert("Statement signed successfully!");
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Signing error:", error);
      alert(
        `Failed to sign: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  if (!session && !needsSetup) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="max-w-md w-full text-center space-y-6">
          <h1 className="text-3xl font-bold">{roleDisplayName} Portal</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isCreator
              ? "Create and manage statements for signature collection"
              : "Review and sign statements"}
          </p>
          <button
            onClick={() => setNeedsSetup(true)}
            className="w-full rounded-full border border-solid border-transparent transition-colors flex items-center justify-center text-white gap-2 font-medium text-base h-12 px-5"
            style={{
              backgroundColor: isCreator ? "#2563eb" : "#16a34a",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isCreator
                ? "#1d4ed8"
                : "#15803d";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isCreator
                ? "#2563eb"
                : "#16a34a";
            }}
          >
            Get Started
          </button>
          <Link
            href="/"
            className="block text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!session && needsSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <UserSetup role={role} onComplete={handleUserSetup} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {roleDisplayName} Portal
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Welcome, {session?.name}
            </p>
          </div>
        </div>

        {/* Creator-specific: Create Statement */}
        {isCreator && (
          <div className="mb-8">
            <StatementCreator
              userId={session!.userId}
              onStatementCreated={() => setRefreshTrigger((prev) => prev + 1)}
            />
          </div>
        )}

        {/* Statements - rendered in two sections by StatementList */}
        <StatementList
          currentUserId={session?.userId}
          canSign={true}
          onSignStatement={handleSignStatement}
          refreshTrigger={refreshTrigger}
        />
      </div>
    </div>
  );
}
