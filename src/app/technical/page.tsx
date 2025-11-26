"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface User {
  user_id: string;
  name: string;
  role: string;
  credential_id: string;
  created_at: number;
}

interface JWTKey {
  keyId: string;
  userId: string;
  credentialId: string;
  publicKeyJWK: Record<string, unknown>;
  publicKeyPEM: string;
  publicKeyFingerprint: string;
  createdAt: number;
}

export default function TechnicalPage() {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading technical details...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm underline"
          >
            ← Back to Home
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-2">Technical Details</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Comprehensive technical information about the system
        </p>

        {/* System Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">System Overview</h2>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Architecture:</strong> Passkey-attested JWT signing with detached signatures
            </p>
            <p>
              <strong>Algorithm:</strong> EdDSA (Ed25519)
            </p>
            <p>
              <strong>Signature Requirement:</strong> 2 out of 3 users
            </p>
            <p>
              <strong>Total Users:</strong> {users.length} (1 Creator + {users.filter(u => u.role === 'investor').length} Investors)
            </p>
          </div>
        </div>

        {/* Registered Users */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Registered Users & JWT Keys</h2>
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
                              : "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                          }`}
                        >
                          {user.role.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        User ID: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{user.user_id}</code>
                      </p>
                      <p className="text-xs text-gray-500">
                        Credential ID: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{user.credential_id.substring(0, 32)}...</code>
                      </p>
                    </div>

                    {key ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium mb-1">JWT Key ID:</p>
                          <code className="block bg-gray-50 dark:bg-gray-900 p-2 rounded text-xs break-all">
                            {key.keyId}
                          </code>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-1">Public Key (PEM):</p>
                          <pre className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-xs overflow-x-auto">
                            {key.publicKeyPEM}
                          </pre>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-1">Public Key JWK:</p>
                          <pre className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-xs overflow-x-auto">
                            {JSON.stringify(key.publicKeyJWK, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-1">Fingerprint:</p>
                          <code className="block bg-gray-50 dark:bg-gray-900 p-2 rounded text-xs break-all">
                            {key.publicKeyFingerprint}
                          </code>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No JWT key registered</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Documentation Links */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">Documentation</h2>
          <div className="space-y-2">
            <Link
              href="/technical/statements"
              className="block text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
            >
              View All Statements with Technical Details →
            </Link>
            <a
              href="/docs/FLOW.md"
              target="_blank"
              className="block text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
            >
              Flow Documentation →
            </a>
            <a
              href="/docs/JWT-VERIFICATION-GUIDE.md"
              target="_blank"
              className="block text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
            >
              JWT Verification Guide →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

