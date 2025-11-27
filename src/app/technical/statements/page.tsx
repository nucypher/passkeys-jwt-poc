"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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
  isValid: boolean;
  creatorName: string;
}

export default function TechnicalStatementsPage() {
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatements();
  }, []);

  const loadStatements = async () => {
    try {
      const response = await fetch("/api/statements");
      if (!response.ok) throw new Error("Failed to load statements");

      const data = await response.json();
      setStatements(data.statements);
    } catch (error) {
      console.error("Error loading statements:", error);
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

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link
            href="/technical"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm underline"
          >
            ← Back to System Overview
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-2">
          Statement List & Signature Status
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          All statements with multi-signature verification details
        </p>

        {statements.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <p className="text-gray-500">No statements created yet</p>
            <Link
              href="/creator"
              className="mt-4 inline-block text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
            >
              Go to Creator Portal to create one →
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {statements.map((statement) => (
              <div
                key={statement.statementId}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-2 border-gray-200 dark:border-gray-700"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-bold">
                        {statement.title ||
                          `Statement #${statement.statementId.substring(0, 8)}`}
                      </h2>
                      <div
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          statement.isValid
                            ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                            : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200"
                        }`}
                      >
                        {statement.signatureCount}/3 signatures
                        {statement.isValid && " ✓"}
                      </div>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <p>
                        <strong>Statement ID:</strong>{" "}
                        <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
                          {statement.statementId}
                        </code>
                      </p>
                      <p>
                        <strong>Creator:</strong> {statement.creatorName} (
                        <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">
                          {statement.creatorId.substring(0, 12)}...
                        </code>
                        )
                      </p>
                      <p>
                        <strong>Created:</strong>{" "}
                        {new Date(statement.createdAt).toLocaleString()}
                      </p>
                      <p>
                        <strong>Valid (2+ signatures):</strong>{" "}
                        <span
                          className={
                            statement.isValid
                              ? "text-green-600 dark:text-green-400 font-bold"
                              : "text-yellow-600 dark:text-yellow-400 font-bold"
                          }
                        >
                          {statement.isValid
                            ? "YES ✓"
                            : "NO (needs more signatures)"}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Signatures Summary */}
                <div className="mb-4">
                  <h3 className="text-sm font-bold mb-2">
                    Signatures ({statement.signatures.length}):
                  </h3>
                  {statement.signatures.length > 0 ? (
                    <div className="space-y-1">
                      {statement.signatures.map((sig) => (
                        <div
                          key={sig.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <span className="text-green-600 dark:text-green-400">
                            ✓
                          </span>
                          <span className="font-medium">{sig.userName}</span>
                          <span className="text-gray-500">
                            ({sig.userRole})
                          </span>
                          <span className="text-gray-400 text-xs">
                            {new Date(sig.signedAt).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No signatures yet</p>
                  )}
                </div>

                {/* Content Preview */}
                <div className="mb-4">
                  <h3 className="text-sm font-bold mb-2">Content Preview:</h3>
                  <pre className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-xs overflow-x-auto border border-gray-200 dark:border-gray-700 max-h-32">
                    <code className="text-gray-800 dark:text-gray-200">
                      {JSON.stringify(JSON.parse(statement.content), null, 2)}
                    </code>
                  </pre>
                </div>

                {/* View Details Link */}
                <Link
                  href={`/technical/statement/${statement.statementId}`}
                  className="inline-block rounded-full border border-solid border-blue-600 text-blue-600 transition-colors hover:bg-blue-600 hover:text-white font-medium text-sm h-10 px-4 flex items-center justify-center w-fit"
                >
                  View Statement Details →
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        {statements.length > 0 && (
          <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
            <h3 className="font-bold mb-2">Summary</h3>
            <div className="space-y-1 text-sm">
              <p>
                <strong>Total Statements:</strong> {statements.length}
              </p>
              <p>
                <strong>Valid Statements (2+ signatures):</strong>{" "}
                {statements.filter((s) => s.isValid).length}
              </p>
              <p>
                <strong>Pending Statements (0-1 signatures):</strong>{" "}
                {statements.filter((s) => !s.isValid).length}
              </p>
              <p>
                <strong>Total Signatures:</strong>{" "}
                {statements.reduce((sum, s) => sum + s.signatureCount, 0)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
