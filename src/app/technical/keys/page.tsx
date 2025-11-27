"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getCoseAlgorithmName } from "@/lib/cose-to-jwt";

interface User {
  user_id: string;
  name: string;
  role: string;
  credential_id: string;
  created_at: number;
  algorithm: number;
}

interface JWTKey {
  keyId: string;
  userId: string;
  credentialId: string;
  publicKeyJWK: Record<string, unknown>;
  publicKeyPEM: string;
  publicKeyFingerprint: string;
  passkeyAttestation: Record<string, unknown>;
  createdAt: number;
}

export default function KeysPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [keys, setKeys] = useState<Map<string, JWTKey>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load users from database
      const { getAllUsers, getJWTKeyByUserId } = await import("@/lib/database");
      const usersData = await getAllUsers();
      setUsers(usersData);

      // Load JWT keys for each user
      const keysMap = new Map<string, JWTKey>();
      for (const user of usersData) {
        try {
          const key = await getJWTKeyByUserId(user.user_id);
          if (key) {
            keysMap.set(user.user_id, key);
          }
        } catch (error) {
          console.error(`Failed to load key for user ${user.user_id}:`, error);
        }
      }
      setKeys(keysMap);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href="/technical"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mb-4 inline-block"
          >
            ← Back to Technical Dashboard
          </Link>
          <h1 className="text-3xl font-bold mb-2">Registered Users & Keys</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Registry of all users and their passkey-attested JWT signing keys.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading registry...</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            {users.length === 0 ? (
              <p className="text-gray-500">No users registered yet</p>
            ) : (
              <div className="space-y-6">
                {users.map((user) => {
                  const key = keys.get(user.user_id);
                  return (
                    <div
                      key={user.user_id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg">{user.name}</h3>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              user.role === "creator"
                                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
                                : "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200"
                            }`}
                          >
                            {user.role.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 font-mono truncate">
                          User ID: {user.user_id}
                        </div>
                        <div className="text-sm text-gray-500 font-mono truncate">
                          Passkey Algorithm:{" "}
                          {getCoseAlgorithmName(user.algorithm)}
                        </div>
                      </div>

                      {key ? (
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-medium mb-1">
                              JWT Key ID:
                            </p>
                            <code className="block bg-gray-50 dark:bg-gray-900 p-2 rounded text-xs break-all">
                              {key.keyId}
                            </code>
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-1">
                              Public Key (PEM):
                            </p>
                            <pre className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-xs overflow-x-auto">
                              {key.publicKeyPEM}
                            </pre>
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-1">
                              Public Key JWK:
                            </p>
                            <pre className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-xs overflow-x-auto">
                              {JSON.stringify(key.publicKeyJWK, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-1">
                              Fingerprint:
                            </p>
                            <code className="block bg-gray-50 dark:bg-gray-900 p-2 rounded text-xs break-all">
                              {key.publicKeyFingerprint}
                            </code>
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-1">
                              Passkey Attestation (WebAuthn Assertion):
                            </p>
                            <details className="group">
                              <summary className="cursor-pointer text-xs text-blue-600 dark:text-blue-400 hover:underline mb-2 select-none">
                                Show/Hide Attestation JSON
                              </summary>
                              <pre className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-xs overflow-x-auto max-h-60">
                                {JSON.stringify(
                                  key.passkeyAttestation,
                                  null,
                                  2,
                                )}
                              </pre>
                            </details>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">
                          No JWT key registered
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
