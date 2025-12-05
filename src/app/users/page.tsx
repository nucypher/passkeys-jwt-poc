"use client";

import { useState, useEffect } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface User {
  userId: string;
  name: string;
  role: "creator" | "investor";
  credentialId: string;
  createdAt: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authenticatingUserId, setAuthenticatingUserId] = useState<
    string | null
  >(null);
  const router = useRouter();

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const response = await fetch("/api/users");
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUserLogin(user: User) {
    try {
      setIsAuthenticating(true);
      setAuthenticatingUserId(user.userId);

      // Get authentication options from API
      const optionsResponse = await fetch("/api/authenticate/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentialId: user.credentialId }),
      });
      const authOptions = await optionsResponse.json();

      // Start authentication
      const authResponse = await startAuthentication({
        optionsJSON: authOptions,
      });

      // Verify authentication
      const verifyResponse = await fetch("/api/authenticate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authenticationResponse: authResponse,
          challenge: authOptions.challenge,
        }),
      });

      if (!verifyResponse.ok) {
        throw new Error("Authentication verification failed");
      }

      // Get user info to determine role
      const userInfoResponse = await fetch(`/api/users/${user.credentialId}`);
      const userInfo = await userInfoResponse.json();

      if (!userInfo.success) {
        throw new Error("Failed to fetch user info");
      }

      // Get JWT key for this user
      const jwtKeysResponse = await fetch(
        `/api/jwt-keys/by-credential/${user.credentialId}`,
      );
      const jwtKeysData = await jwtKeysResponse.json();

      if (!jwtKeysData.success || !jwtKeysData.key) {
        throw new Error("No JWT key found for this user");
      }

      const jwtKey = jwtKeysData.key;

      // Import the private key
      const { importJWK } = await import("jose");
      const privateKey = await importJWK(jwtKey.privateKeyJWK, "EdDSA");

      // Create session data
      const sessionData = {
        userId: user.userId,
        name: user.name,
        role: user.role,
        credentialId: user.credentialId,
        keyId: jwtKey.keyId,
        privateKeyJWK: jwtKey.privateKeyJWK,
        privateKey, // This will be reconstructed on page load
      };

      // Store unified session
      localStorage.setItem("userSession", JSON.stringify(sessionData));

      // Dispatch custom event for session provider
      window.dispatchEvent(new Event("userLoggedIn"));

      // Redirect to appropriate page
      router.push(user.role === "creator" ? "/creator" : "/investor");
    } catch (error) {
      console.error("Authentication failed:", error);
      alert(
        `Login failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    } finally {
      setIsAuthenticating(false);
      setAuthenticatingUserId(null);
    }
  }

  function formatDate(timestamp: number) {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  if (isLoading) {
    return (
      <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
        <main className="flex flex-col gap-8 row-start-2 items-center w-full max-w-4xl">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Loading users...</h1>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-8 row-start-2 items-center w-full max-w-4xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Registered Users</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Click on a user to login with their passkey
          </p>
        </div>

        {users.length === 0 ? (
          <div className="text-center p-8 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No users registered yet
            </p>
            <Link
              href="/"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Go to home page to register
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            {users.map((user) => (
              <button
                key={user.userId}
                onClick={() => handleUserLogin(user)}
                disabled={isAuthenticating}
                className={`p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 transition-all text-left ${
                  authenticatingUserId === user.userId
                    ? "border-blue-500 scale-95"
                    : "border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:shadow-xl"
                } ${
                  isAuthenticating && authenticatingUserId !== user.userId
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{user.name}</h3>
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          user.role === "creator"
                            ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                            : "bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200"
                        }`}
                      >
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Registered: {formatDate(user.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-col items-center justify-center ml-4">
                    {authenticatingUserId === user.userId ? (
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    ) : (
                      <svg
                        className="w-8 h-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                        />
                      </svg>
                    )}
                  </div>
                </div>
                {authenticatingUserId === user.userId && (
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                    Authenticating with passkey...
                  </p>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="mt-8 flex gap-4">
          <Link
            href="/"
            className="rounded-full border border-solid border-gray-300 dark:border-gray-700 transition-colors flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 text-sm h-10 px-5"
          >
            ← Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
