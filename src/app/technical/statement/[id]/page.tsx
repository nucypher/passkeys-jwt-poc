"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { use } from "react";
import SignatureIndicator from "@/components/signature-indicator";
import { StatementStatus } from "@/lib/statements";

// Helper function to decode base64url
function decodeBase64Url(base64url: string): string {
  // Convert base64url to base64
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  // Pad if necessary
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  // Decode
  return atob(padded);
}

interface StatementSignature {
  id: number;
  statementId: string;
  userId: string;
  userName: string;
  userRole: string;
  signature: string;
  jwt: string;
  signedAt: number;
}

interface Statement {
  statementId: string;
  title?: string;
  content: string;
  creatorId: string;
  createdAt: number;
  signatures: StatementSignature[];
  signatureCount: number;
  status: StatementStatus;
  creatorName: string;
}

export default function StatementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [statement, setStatement] = useState<Statement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatement();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadStatement = async () => {
    try {
      const response = await fetch(`/api/statements/${id}`);
      if (!response.ok) throw new Error("Failed to load statement");

      const data = await response.json();
      setStatement(data.statement);
    } catch (error) {
      console.error("Error loading statement:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!statement) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Statement Not Found</h1>
          <Link href="/" className="text-blue-600 hover:underline">
            Go Back Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link
            href="/technical/statements"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm underline"
          >
            ← Back to Statement List
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-2">
          {statement.title ||
            `Statement #${statement.statementId.substring(0, 8)}`}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Cryptographic signatures and JWT verification
        </p>

        {/* Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Status</h2>
          <div className="space-y-2">
            <p>
              <strong>Statement ID:</strong>{" "}
              <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm">
                {statement.statementId}
              </code>
            </p>
            <p>
              <strong>Creator:</strong> {statement.creatorName}
            </p>
            <p>
              <strong>Created:</strong>{" "}
              {new Date(statement.createdAt).toLocaleString()}
            </p>
            <p>
              <strong>Signatures:</strong> {statement.signatureCount}/3
            </p>
            <p>
              <strong>Status:</strong>{" "}
              <span
                className={
                  statement.status === "approved"
                    ? "text-green-600 dark:text-green-400 font-bold"
                    : "text-yellow-600 dark:text-yellow-400 font-bold"
                }
              >
                {statement.status === "approved"
                  ? "APPROVED ✓"
                  : "PENDING! (requires [more] signatures)"}
              </span>
            </p>
          </div>
        </div>

        {/* Statement Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Statement Content</h2>
          <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-sm overflow-x-auto">
            <code className="text-gray-800 dark:text-gray-200">
              {JSON.stringify(JSON.parse(statement.content), null, 2)}
            </code>
          </pre>
        </div>

        {/* Signatures */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">
            Signatures ({statement.signatures.length})
          </h2>
          {statement.signatures.length === 0 ? (
            <p className="text-gray-500">No signatures yet</p>
          ) : (
            <div className="space-y-6">
              {statement.signatures.map((sig) => (
                <div
                  key={sig.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <SignatureIndicator
                    userName={sig.userName}
                    signature={sig.signature}
                    signedAt={sig.signedAt}
                    showDetails={true}
                  />

                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-1">User ID:</p>
                      <code className="block bg-gray-50 dark:bg-gray-900 p-2 rounded text-xs break-all">
                        {sig.userId}
                      </code>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Role:</p>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          sig.userRole === "creator"
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
                            : "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200"
                        }`}
                      >
                        {sig.userRole.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Full JWT:</p>
                      <pre className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-xs overflow-x-auto break-all">
                        {sig.jwt}
                      </pre>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">
                        Signature (base64url):
                      </p>
                      <code className="block bg-gray-50 dark:bg-gray-900 p-2 rounded text-xs break-all">
                        {sig.signature}
                      </code>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">JWT Header:</p>
                      <pre className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-xs overflow-x-auto">
                        {JSON.stringify(
                          JSON.parse(decodeBase64Url(sig.jwt.split(".")[0])),
                          null,
                          2,
                        )}
                      </pre>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">JWT Payload:</p>
                      <pre className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-xs overflow-x-auto">
                        {JSON.stringify(
                          JSON.parse(decodeBase64Url(sig.jwt.split(".")[1])),
                          null,
                          2,
                        )}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
