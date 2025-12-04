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

export default function TechnicalPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { getAllUsers } = await import("@/lib/database");
      const usersData = await getAllUsers();
      setUsers(usersData);
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
            href="/"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mb-4 inline-block"
          >
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold mb-2">Technical Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Explore the system architecture, registered keys, and verification
            workflows.
          </p>

          {/* System Overview */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">System Overview</h2>
            {loading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            ) : (
              <div className="space-y-2 text">
                <p>
                  <strong>Purpose:</strong> Collaborative approval of JSON
                  statements
                </p>
                <p>
                  <strong>Architecture:</strong> Multi-signature threshold
                  system (2-of-3) with passkey-attested JWT signing keys
                </p>
                <p>
                  <strong>Passkey Signature Algorithm:</strong> Default:{" "}
                  {getCoseAlgorithmName(-7)}, Fallback:{" "}
                  {getCoseAlgorithmName(-257)}
                </p>
                <p>
                  <strong>JWT Signature Algorithm:</strong> EdDSA (Ed25519)
                </p>
                <p>
                  <strong>Threshold:</strong> 2 signatures required for validity
                </p>
                <p>
                  <strong>Total Registered Users:</strong> {users.length} (
                  {users.filter((u) => u.role === "creator").length} Creator +{" "}
                  {users.filter((u) => u.role === "investor").length} Investors)
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-8">
            {/* Section 1: Live System Data */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300 border-b pb-2">
                Live System Data
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Statement List & Status */}
                <Link
                  href="/technical/statements"
                  className="block bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow border border-transparent hover:border-blue-500"
                >
                  <h2 className="text-xl font-bold mb-2 text-blue-600 dark:text-blue-400">
                    Statement List & Status
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    View all statements, their current signature status, and
                    threshold progress.
                  </p>
                </Link>

                {/* Registered Users & Keys */}
                <Link
                  href="/technical/keys"
                  className="block bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow border border-transparent hover:border-blue-500"
                >
                  <h2 className="text-xl font-bold mb-2 text-blue-600 dark:text-blue-400">
                    Registered Users & Keys
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Registry of users and their passkey-attested JWT signing
                    keys (with attestation data).
                  </p>
                </Link>
              </div>
            </div>

            {/* Section 2: System Documentation */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300 border-b pb-2">
                System Documentation
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Signature Flow */}
                <Link
                  href="/technical/flow"
                  className="block bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow border border-transparent hover:border-blue-500"
                >
                  <h2 className="text-xl font-bold mb-2 text-blue-600 dark:text-blue-400">
                    Signature Flow Documentation
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Visual guide to the multi-signature threshold workflow and
                    passkey integration.
                  </p>
                </Link>

                {/* Verification Guide */}
                <Link
                  href="/technical/verification"
                  className="block bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow border border-transparent hover:border-blue-500"
                >
                  <h2 className="text-xl font-bold mb-2 text-blue-600 dark:text-blue-400">
                    JWT Verification Guide
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Technical guide for external applications to verify
                    statement signatures.
                  </p>
                </Link>
              </div>
            </div>

            {/* Section 3: Sequence Diagrams */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300 border-b pb-2">
                Sequence Diagrams
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* High-Level Flow */}
                <Link
                  href="/technical/high-level-flow"
                  className="block bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow border border-transparent hover:border-blue-500"
                >
                  <h2 className="text-xl font-bold mb-2 text-blue-600 dark:text-blue-400">
                    High-Level Sequence Diagram
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Business-level overview of the user account registration,
                    statment creation and approval process.
                  </p>
                </Link>

                {/* Detailed Sequence Diagram */}
                <Link
                  href="/technical/sequence-diagram"
                  className="block bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow border border-transparent hover:border-blue-500"
                >
                  <h2 className="text-xl font-bold mb-2 text-blue-600 dark:text-blue-400">
                    Detailed Sequence Diagram
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Technical-level diagram showing all interactions between
                    actors and systems.
                  </p>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
