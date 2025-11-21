"use client";

import RegisterPasskey from "../components/register-button";
import AuthenticatePasskey from "../components/authenticate-button";
import SignJWTButton from "../components/sign-jwt-button";
import JWTSignaturesList from "../components/jwt-signatures-list";
import PasskeysList from "../components/passkeys-list";
import Link from "next/link";
import { Fragment, useState, useEffect } from "react";

export default function PasskeysManagement() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [credentialId, setCredentialId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [passkeysRefreshTrigger, setPasskeysRefreshTrigger] = useState(0);

  // Check for existing session on mount
  useEffect(() => {
    const storedSession = localStorage.getItem("session");
    const storedCredentialId = localStorage.getItem("credentialId");

    if (storedSession && storedCredentialId) {
      try {
        const session = JSON.parse(storedSession);
        setIsAuthenticated(true);
        setCredentialId(session.credentialId);
        console.log("Restored session:", session);
      } catch (error) {
        console.error("Error restoring session:", error);
        localStorage.removeItem("session");
        localStorage.removeItem("credentialId");
      }
    }
  }, []);

  const handleAuthenticationSuccess = (credId: string) => {
    setIsAuthenticated(true);
    setCredentialId(credId);
  };

  const handleSignatureCreated = () => {
    // Trigger refresh of signatures list
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleRegistrationSuccess = () => {
    // Trigger refresh of passkeys list
    setPasskeysRefreshTrigger((prev) => prev + 1);
  };

  const handleLogout = () => {
    localStorage.removeItem("session");
    localStorage.removeItem("credentialId");
    setIsAuthenticated(false);
    setCredentialId(null);
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {!isAuthenticated ? (
        <Fragment>
          <div className="flex flex-col sm:flex-row gap-6 items-center">
            <RegisterPasskey
              onRegistrationSuccess={handleRegistrationSuccess}
            />
            <AuthenticatePasskey
              onAuthenticationSuccess={handleAuthenticationSuccess}
            />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Register a new passkey, login with an existing one, or{" "}
            <Link
              href="/all-signatures"
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium underline"
            >
              View All JWTs from All Users →
            </Link>
          </p>

          {/* Show list of registered passkeys */}
          <PasskeysList refreshTrigger={passkeysRefreshTrigger} />
        </Fragment>
      ) : (
        <Fragment>
          <div className="flex flex-col items-center gap-4 w-full">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">
                Authenticated Successfully!
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Credential ID:
              </p>
              <p className="font-mono text-xs text-gray-700 dark:text-gray-300 break-all max-w-md">
                {credentialId}
              </p>
            </div>

            <div className="flex gap-4 items-center">
              <SignJWTButton
                credentialId={credentialId!}
                onSignatureCreated={handleSignatureCreated}
              />
              <button
                className="rounded-full border border-solid border-red-600 text-red-600 transition-colors flex items-center justify-center hover:bg-red-600 hover:text-white font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>

            <div className="w-full max-w-4xl">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold">My Signed JWTs</h2>
                <Link
                  href="/all-signatures"
                  className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium underline"
                >
                  View All JWTs from All Users →
                </Link>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Showing only JWTs signed with your authenticated passkey
              </p>
            </div>

            {credentialId && (
              <JWTSignaturesList
                credentialId={credentialId}
                refreshTrigger={refreshTrigger}
                showTitle={false}
              />
            )}
          </div>
        </Fragment>
      )}
    </div>
  );
}
