"use client";

import { useEffect, useState } from "react";

interface Credential {
  credential_id: string;
  id_length: number;
  algorithm: number;
  counter: number;
  created_at: number;
}

interface CredentialsResponse {
  count: number;
  credentials: Credential[];
}

interface PasskeysListProps {
  refreshTrigger?: number;
}

export default function PasskeysList({ refreshTrigger }: PasskeysListProps) {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCredentials = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/credentials");

        if (!response.ok) {
          throw new Error("Failed to fetch credentials");
        }

        const data: CredentialsResponse = await response.json();
        setCredentials(data.credentials);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        console.error("Error fetching credentials:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCredentials();
  }, [refreshTrigger]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getAlgorithmName = (alg: number) => {
    const algorithms: { [key: number]: string } = {
      [-7]: "ES256",
      [-8]: "EdDSA",
      [-35]: "ES384",
      [-36]: "ES512",
      [-37]: "PS256",
      [-38]: "PS384",
      [-39]: "PS512",
      [-257]: "RS256",
      [-258]: "RS384",
      [-259]: "RS512",
    };
    return algorithms[alg] || `Unknown (${alg})`;
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
        <h3 className="text-lg font-semibold mb-3">Registered Passkeys</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl p-4 border border-red-200 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-900/20">
        <h3 className="text-lg font-semibold mb-3 text-red-800 dark:text-red-200">
          Error Loading Passkeys
        </h3>
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (credentials.length === 0) {
    return (
      <div className="w-full max-w-4xl p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
        <h3 className="text-lg font-semibold mb-3">Registered Passkeys</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No passkeys registered yet. Register your first passkey to get
          started!
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
      <h3 className="text-lg font-semibold mb-3">
        All Registered Passkeys for all users ({credentials.length})
      </h3>
      <div className="space-y-3">
        {credentials.map((credential, index) => (
          <div
            key={credential.credential_id}
            className="p-3 border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700/50"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Passkey #{index + 1}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {getAlgorithmName(credential.algorithm)}
                  </span>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  <span className="font-medium">Credential ID:</span>
                  <div className="font-mono break-all mt-1 bg-gray-100 dark:bg-gray-800 p-1 rounded">
                    {credential.credential_id.substring(0, 64)}
                    {credential.credential_id.length > 64 && "..."}
                  </div>
                </div>
                <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400 mt-2">
                  <span>
                    <span className="font-medium">Counter:</span>{" "}
                    {credential.counter}
                  </span>
                  <span>
                    <span className="font-medium">Created:</span>{" "}
                    {formatDate(credential.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
